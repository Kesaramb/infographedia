import type Anthropic from '@anthropic-ai/sdk'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { KnowledgeSearchResult } from '@/lib/knowledge/types'
import type { DiversityPlan } from './planner'
import type { GenerationBrief } from './brief'

// Derive content block types from the SDK's ContentBlock union
type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>
type TextBlock = Extract<ContentBlock, { type: 'text' }>
import { createAnthropicMessageWithRetry, getAnthropicClient } from './client'
import { buildSystemPrompt, buildNewPrompt, buildIterationPrompt } from './prompts'
import { getAIConfig } from './config'
import { WEB_SEARCH_TOOL, KNOWLEDGE_BASE_TOOL, IMAGE_SEARCH_TOOL } from './tools'
import { executeImageSearchDetailed, executeWebSearchDetailed } from './search'
import { parseAIResponse, buildCorrectionPrompt } from './parse'
import { searchKnowledgeDetailed } from '@/lib/knowledge/search'
import { storeGenerationKnowledge } from '@/lib/knowledge/store'
import { PREVIEW_RENDER_PROFILE, preflightDNA } from '@/lib/dna/rendering'
import { fitDNAToBudget } from '@/lib/dna/copy-fit'
import { planInfographic } from './planner'

// ============================================================
// Core DNA Generation Pipeline
//
// This is the heart of Infographedia. It:
// 1. Reads AI config from the admin-editable Payload global
// 2. Builds a prompt from user input + optional parent DNA
// 3. Sends it to Claude with web_search tool access
// 4. Handles the tool-calling loop (search -> extract -> generate)
// 5. Validates the output against the Zod schema
// 6. Retries once on validation failure
// ============================================================

export interface GenerateResult {
  success: true
  dna: InfographicDNA
  searchQueries: string[] // what the AI searched for (transparency)
}

export interface GenerateError {
  success: false
  error: string
  stage: 'api' | 'parse' | 'validation' | 'tool_loop' | 'grounding'
}

export type GenerateResponse = GenerateResult | GenerateError

/**
 * Generate a new infographic DNA from a user prompt.
 */
export async function generateDNA(
  prompt: string,
  parentDNA?: InfographicDNA,
  brief?: GenerationBrief,
): Promise<GenerateResponse> {
  if (brief?.intent === 'multi-view' || brief?.engine === 'antv') {
    return {
      success: false,
      error: 'Internal routing mismatch: a multi-view request reached the legacy DNA generator.',
      stage: 'validation',
    }
  }

  const client = getAnthropicClient()
  const searchQueries: string[] = []
  const provenanceResults: KnowledgeSearchResult[] = []
  const styleOnlyRequest = isStyleOnlyRequest(prompt, parentDNA)
  const requiresGrounding = !styleOnlyRequest
  let searchWasReal = false
  let hasFreshKnowledgeEvidence = false
  let hasGroundedMediaEvidence = false

  console.log(`[generate] Starting: "${prompt.slice(0, 80)}"${parentDNA ? ' (iteration)' : ' (new)'}`)

  // Fetch admin-configured AI settings
  const aiConfig = await getAIConfig()
  const plan = await planInfographic(prompt, aiConfig, parentDNA)
  if (plan.mediaCandidates.length > 0) {
    hasGroundedMediaEvidence = true
    provenanceResults.push(
      ...plan.mediaCandidates.map((item) => ({
        title: item.caption ?? item.alt,
        url: item.sourceUrl,
        snippet: item.relevance,
        usedInDNA: false,
      })),
    )
    searchQueries.push(...plan.imageSearchQueries.map((query) => `[IMG] ${query}`))
  }
  console.log(`[generate] Config: model=${aiConfig.model}, maxTokens=${aiConfig.maxTokens}, tools=[${aiConfig.enableKnowledgeBase ? 'KB' : ''}${aiConfig.enableWebSearch ? ',WS' : ''}${aiConfig.enableGroundedMedia ? ',IMG' : ''}]`)
  const systemPrompt = buildSystemPrompt(aiConfig, PREVIEW_RENDER_PROFILE)

  if (requiresGrounding && !aiConfig.enableKnowledgeBase && !aiConfig.enableWebSearch) {
    return {
      success: false,
      error: 'Verified research is required for data-changing prompts, but both knowledge base and web search are disabled.',
      stage: 'grounding',
    }
  }

  // Build the user message
  const userMessage = parentDNA
    ? buildIterationPrompt(prompt, parentDNA, plan, brief)
    : buildNewPrompt(prompt, plan, brief)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  // Assemble tools based on admin config
  const tools: Anthropic.Tool[] = []
  if (aiConfig.enableKnowledgeBase) tools.push(KNOWLEDGE_BASE_TOOL)
  if (aiConfig.enableWebSearch) tools.push(WEB_SEARCH_TOOL)
  if (aiConfig.enableGroundedMedia) tools.push(IMAGE_SEARCH_TOOL)

  try {
    // --- Main generation loop with tool calling ---
    let response = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      tools,
      messages,
    }, { label: 'generate' })

    // Handle tool-calling loop
    let toolRounds = 0
    while (response.stop_reason === 'tool_use' && toolRounds < aiConfig.maxToolRounds) {
      toolRounds++

      // Extract tool calls from the response
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use',
      )

      // Execute each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'search_knowledge_base') {
          const input = toolUse.input as { query: string }
          searchQueries.push(`[KB] ${input.query}`)
          console.log(`[generate] Tool (round ${toolRounds}/${aiConfig.maxToolRounds}): search_knowledge_base("${input.query}")`)

          const kbResult = await searchKnowledgeDetailed(input.query)
          if (kbResult.hasFreshResults) hasFreshKnowledgeEvidence = true
          provenanceResults.push(...kbResult.results)
          console.log(`[generate] KB result: ${kbResult.content.slice(0, 120)}...`)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: kbResult.content,
          })
        } else if (toolUse.name === 'web_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(input.query)
          console.log(`[generate] Tool (round ${toolRounds}/${aiConfig.maxToolRounds}): web_search("${input.query}")`)

          const searchResult = await executeWebSearchDetailed(input.query)
          if (searchResult.real) searchWasReal = true
          provenanceResults.push(
            ...searchResult.results.map((result) => ({
              ...result,
              usedInDNA: false,
            })),
          )
          console.log(`[generate] Web result (real=${searchResult.real}): ${searchResult.content.slice(0, 120)}...`)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: searchResult.content,
          })
        } else if (toolUse.name === 'image_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(`[IMG] ${input.query}`)
          console.log(`[generate] Tool (round ${toolRounds}/${aiConfig.maxToolRounds}): image_search("${input.query}")`)

          const imageResult = await executeImageSearchDetailed(input.query)
          if (imageResult.real) hasGroundedMediaEvidence = true
          provenanceResults.push(
            ...imageResult.results.map((result) => ({
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              usedInDNA: false,
            })),
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: imageResult.content,
          })
        } else {
          // Unknown tool — return an error
          console.warn(`[generate] Unknown tool called: ${toolUse.name}`)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Unknown tool: ${toolUse.name}`,
            is_error: true,
          })
        }
      }

      // Continue the conversation with tool results
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      // Graceful degradation: on the last allowed round, strip tools
      // to force the AI to produce JSON output with whatever data it has
      const isLastRound = toolRounds >= aiConfig.maxToolRounds - 1
      if (isLastRound) {
        console.log(`[generate] Approaching tool limit (${toolRounds}/${aiConfig.maxToolRounds}). Forcing final output — no more tools.`)
        // Add a nudge message to tell the AI to produce output now
        messages.push({
          role: 'user',
          content: 'You have done enough research. Please produce the final infographic DNA JSON now using the data you have collected. Do NOT call any more tools — output the JSON immediately.',
        })
      }

      response = await createAnthropicMessageWithRetry(client, {
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: systemPrompt,
        // Strip tools on last round to prevent further tool calls
        ...(isLastRound ? {} : { tools }),
        messages,
      }, { label: 'generate' })

      if (isLastRound) {
        console.log(`[generate] Forced final response. stop_reason=${response.stop_reason}`)
        break // Exit loop — we have our final response
      }
    }

    // --- Extract text from the final response ---
    const textBlocks = response.content.filter(
      (block): block is TextBlock => block.type === 'text',
    )

    const responseText = textBlocks.map((b) => b.text).join('\n')

    if (!responseText.trim()) {
      return {
        success: false,
        error: 'AI returned an empty response. Please try again.',
        stage: 'parse',
      }
    }

    // --- Parse and validate ---
    const parseResult = parseAIResponse(responseText)

    if (parseResult.success) {
      const fittedDNA = fitDNAToBudget(parseResult.dna, PREVIEW_RENDER_PROFILE)
      const postValidation = validateGeneratedDNA({
        dna: fittedDNA,
        parentDNA,
        prompt,
        requiresGrounding,
        searchWasReal,
        hasFreshKnowledgeEvidence,
        provenanceResults,
        hasGroundedMediaEvidence,
        plan,
      })

      if (postValidation.ok) {
        console.log(`[generate] Success: "${fittedDNA.content.title}" (${fittedDNA.presentation.chartType}, ${fittedDNA.content.data.length} data points, grounded=${searchWasReal || hasFreshKnowledgeEvidence})`)
        storeGenerationKnowledge(
          searchQueries,
          provenanceResults,
          fittedDNA,
          searchWasReal || hasFreshKnowledgeEvidence,
        ).catch((err) => console.error('[knowledge-store]', err))

        return {
          success: true,
          dna: fittedDNA,
          searchQueries,
        }
      }

      if (postValidation.stage === 'validation') {
        const repaired = await attemptValidationRepair({
          client,
          aiConfig,
          systemPrompt,
          validationError: postValidation.error,
          candidateDNA: fittedDNA,
          searchQueries,
          provenanceResults,
          searchWasReal,
          hasFreshKnowledgeEvidence,
          parentDNA,
          prompt,
          requiresGrounding,
          hasGroundedMediaEvidence,
          plan,
        })

        if (repaired) {
          return repaired
        }
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: buildCorrectionPrompt(postValidation.error, responseText) })

      const retryResponse = await createAnthropicMessageWithRetry(client, {
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        system: systemPrompt,
        messages,
      }, { label: 'generate-retry' })

      return finalizeRetry({
        response: retryResponse,
        searchQueries,
        provenanceResults,
        searchWasReal,
        hasFreshKnowledgeEvidence,
        parentDNA,
        prompt,
        requiresGrounding,
        hasGroundedMediaEvidence,
        plan,
      })
    }

    // --- Retry once with correction prompt ---
    const correctionMessage = buildCorrectionPrompt(
      parseResult.error,
      parseResult.rawText,
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: correctionMessage })

    const retryResponse = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      system: systemPrompt,
      messages,
    }, { label: 'generate-retry' })

    const retryText = retryResponse.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const retryResult = parseAIResponse(retryText)

    if (retryResult.success) {
      const fittedRetryDNA = fitDNAToBudget(retryResult.dna, PREVIEW_RENDER_PROFILE)
      const postValidation = validateGeneratedDNA({
        dna: fittedRetryDNA,
        parentDNA,
        prompt,
        requiresGrounding,
        searchWasReal,
        hasFreshKnowledgeEvidence,
        provenanceResults,
        hasGroundedMediaEvidence,
        plan,
      })

      if (postValidation.ok) {
        console.log(`[generate] Success (retry): "${fittedRetryDNA.content.title}" (grounded=${searchWasReal || hasFreshKnowledgeEvidence})`)
        storeGenerationKnowledge(
          searchQueries,
          provenanceResults,
          fittedRetryDNA,
          searchWasReal || hasFreshKnowledgeEvidence,
        ).catch((err) => console.error('[knowledge-store]', err))

        return {
          success: true,
          dna: fittedRetryDNA,
          searchQueries,
        }
      }

      return {
        success: false,
        error: postValidation.error,
        stage: postValidation.stage,
      }
    }

    return {
      success: false,
      error: `Failed after retry: ${retryResult.error}`,
      stage: 'validation',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown API error'
    return {
      success: false,
      error: `Anthropic API error: ${message}`,
      stage: 'api',
    }
  }
}

interface ValidationInput {
  dna: InfographicDNA
  parentDNA?: InfographicDNA
  prompt: string
  requiresGrounding: boolean
  searchWasReal: boolean
  hasFreshKnowledgeEvidence: boolean
  provenanceResults: KnowledgeSearchResult[]
  hasGroundedMediaEvidence: boolean
  plan: DiversityPlan
}

function validateGeneratedDNA(input: ValidationInput):
  | { ok: true }
  | { ok: false; error: string; stage: GenerateError['stage'] } {
  const {
    dna,
    parentDNA,
    requiresGrounding,
    searchWasReal,
    hasFreshKnowledgeEvidence,
    provenanceResults,
    hasGroundedMediaEvidence,
    plan,
  } = input

  if (!requiresGrounding && parentDNA && JSON.stringify(dna.content) !== JSON.stringify(parentDNA.content)) {
    return {
      ok: false,
      error: 'Style-only requests must preserve the parent content. The generated DNA changed titles, data, sources, or other content without grounded research.',
      stage: 'grounding',
    }
  }

  if (requiresGrounding && !searchWasReal && !hasFreshKnowledgeEvidence) {
    return {
      ok: false,
      error: 'Data-changing prompts require fresh grounding. Verified web search was unavailable and no recent knowledge-base evidence was found.',
      stage: 'grounding',
    }
  }

  const normalizedProvenanceUrls = new Set(
    provenanceResults
      .map((result) => normalizeURL(result.url))
      .filter((value): value is string => Boolean(value)),
  )

  if (
    requiresGrounding &&
    normalizedProvenanceUrls.size > 0 &&
    !dna.content.sources.some((source) => normalizedProvenanceUrls.has(normalizeURL(source.url)))
  ) {
    return {
      ok: false,
      error: 'Generated sources must come from the collected grounding evidence. The DNA cites URLs that were not returned by search or knowledge-base results.',
      stage: 'grounding',
    }
  }

  if (
    dna.content.media.length > 0 &&
    normalizedProvenanceUrls.size > 0 &&
    !dna.content.media.every((item) => normalizedProvenanceUrls.has(normalizeURL(item.source.url)))
  ) {
    return {
      ok: false,
      error: 'Generated media must cite source URLs returned by grounded research or image search.',
      stage: 'grounding',
    }
  }

  if (dna.presentation.layoutFamily !== plan.layoutFamily) {
    return {
      ok: false,
      error: `The generated layoutFamily must match the planned diversity direction (${plan.layoutFamily}).`,
      stage: 'validation',
    }
  }

  if (dna.presentation.heroBlock !== plan.heroBlock) {
    return {
      ok: false,
      error: `The generated heroBlock must match the planned diversity direction (${plan.heroBlock}).`,
      stage: 'validation',
    }
  }

  if (dna.presentation.chartType !== plan.chartType) {
    return {
      ok: false,
      error: `The generated chartType must match the planned diversity direction (${plan.chartType}).`,
      stage: 'validation',
    }
  }

  if (dna.presentation.visualDensity !== plan.visualDensity) {
    return {
      ok: false,
      error: `The generated visualDensity must match the planned diversity direction (${plan.visualDensity}).`,
      stage: 'validation',
    }
  }

  if (plan.mediaCandidates.length === 0 && dna.content.media.length > 0 && !hasGroundedMediaEvidence) {
    return {
      ok: false,
      error: 'The generated DNA added supporting media without grounded media evidence. Choose a non-image family or use grounded image_search results.',
      stage: 'grounding',
    }
  }

  const preflight = preflightDNA(dna, PREVIEW_RENDER_PROFILE)
  if (!preflight.ok) {
    return {
      ok: false,
      error: `Render preflight failed:\n${preflight.errors.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n')}`,
      stage: 'validation',
    }
  }

  return { ok: true }
}

async function finalizeRetry({
  response,
  searchQueries,
  provenanceResults,
  searchWasReal,
  hasFreshKnowledgeEvidence,
  parentDNA,
  prompt,
  requiresGrounding,
  hasGroundedMediaEvidence,
  plan,
}: {
  response: Anthropic.Messages.Message
  searchQueries: string[]
  provenanceResults: KnowledgeSearchResult[]
  searchWasReal: boolean
  hasFreshKnowledgeEvidence: boolean
  parentDNA?: InfographicDNA
  prompt: string
  requiresGrounding: boolean
  hasGroundedMediaEvidence: boolean
  plan: DiversityPlan
}): Promise<GenerateResponse> {
  const retryText = response.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const retryResult = parseAIResponse(retryText)

  if (!retryResult.success) {
    return {
      success: false,
      error: `Failed after retry: ${retryResult.error}`,
      stage: 'validation',
    }
  }

  const fittedRetryDNA = fitDNAToBudget(retryResult.dna, PREVIEW_RENDER_PROFILE)
  const postValidation = validateGeneratedDNA({
    dna: fittedRetryDNA,
    parentDNA,
    prompt,
    requiresGrounding,
    searchWasReal,
    hasFreshKnowledgeEvidence,
    provenanceResults,
    hasGroundedMediaEvidence,
    plan,
  })

  if (!postValidation.ok) {
    if (postValidation.stage === 'validation') {
      const repairConfig = await getAIConfig()
      const repaired = await attemptValidationRepair({
        client: getAnthropicClient(),
        aiConfig: repairConfig,
        systemPrompt: buildSystemPrompt(repairConfig, PREVIEW_RENDER_PROFILE),
        validationError: postValidation.error,
        candidateDNA: fittedRetryDNA,
        searchQueries,
        provenanceResults,
        searchWasReal,
        hasFreshKnowledgeEvidence,
        parentDNA,
        prompt,
        requiresGrounding,
        hasGroundedMediaEvidence,
        plan,
      })

      if (repaired) {
        return repaired
      }
    }

    return {
      success: false,
      error: postValidation.error,
      stage: postValidation.stage,
    }
  }

  storeGenerationKnowledge(
    searchQueries,
    provenanceResults,
    fittedRetryDNA,
    searchWasReal || hasFreshKnowledgeEvidence,
  ).catch((err) => console.error('[knowledge-store]', err))

  return {
    success: true,
    dna: fittedRetryDNA,
    searchQueries,
  }
}

async function attemptValidationRepair({
  client,
  aiConfig,
  systemPrompt,
  validationError,
  candidateDNA,
  searchQueries,
  provenanceResults,
  searchWasReal,
  hasFreshKnowledgeEvidence,
  parentDNA,
  prompt,
  requiresGrounding,
  hasGroundedMediaEvidence,
  plan,
}: {
  client: Anthropic
  aiConfig: Awaited<ReturnType<typeof getAIConfig>>
  systemPrompt: string
  validationError: string
  candidateDNA: InfographicDNA
  searchQueries: string[]
  provenanceResults: KnowledgeSearchResult[]
  searchWasReal: boolean
  hasFreshKnowledgeEvidence: boolean
  parentDNA?: InfographicDNA
  prompt: string
  requiresGrounding: boolean
  hasGroundedMediaEvidence: boolean
  plan: DiversityPlan
}): Promise<GenerateResult | null> {
  const repairPrompt = buildValidationRepairPrompt({
    prompt,
    validationError,
    candidateDNA,
    plan,
  })

  const repairResponse = await createAnthropicMessageWithRetry(client, {
    model: aiConfig.model,
    max_tokens: aiConfig.maxTokens,
    temperature: Math.min(aiConfig.temperature, 0.2),
    system: systemPrompt,
    messages: [{ role: 'user', content: repairPrompt }],
  }, { label: 'generate-repair' })

  const repairText = repairResponse.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const repairResult = parseAIResponse(repairText)
  if (!repairResult.success) {
    return null
  }

  const fittedRepairDNA = fitDNAToBudget(repairResult.dna, PREVIEW_RENDER_PROFILE)
  const postValidation = validateGeneratedDNA({
    dna: fittedRepairDNA,
    parentDNA,
    prompt,
    requiresGrounding,
    searchWasReal,
    hasFreshKnowledgeEvidence,
    provenanceResults,
    hasGroundedMediaEvidence,
    plan,
  })

  if (!postValidation.ok) {
    return null
  }

  storeGenerationKnowledge(
    searchQueries,
    provenanceResults,
    fittedRepairDNA,
    searchWasReal || hasFreshKnowledgeEvidence,
  ).catch((err) => console.error('[knowledge-store]', err))

  return {
    success: true,
    dna: fittedRepairDNA,
    searchQueries,
  }
}

function buildValidationRepairPrompt({
  prompt,
  validationError,
  candidateDNA,
  plan,
}: {
  prompt: string
  validationError: string
  candidateDNA: InfographicDNA
  plan: DiversityPlan
}): string {
  return `Repair the following infographic DNA so it passes final validation.

Original user request:
${prompt}

Validation failure:
${validationError}

Current DNA JSON:
${JSON.stringify(candidateDNA, null, 2)}

Rules:
1. Output ONLY valid DNA JSON. No markdown or explanation.
2. Keep the grounded topic, sources, media URLs, layoutFamily, heroBlock, chartType, and visualDensity unchanged unless the validation failure makes that impossible.
3. For semantic consistency problems, prefer rewriting content.title, content.subtitle, content.hook, and content.footnotes to match the displayed data instead of changing grounded numbers.
4. Keep exactly one primary chartType. Do not invent extra chart blocks.
5. The repaired output must still match this planned diversity direction:
   - layoutFamily: ${plan.layoutFamily}
   - heroBlock: ${plan.heroBlock}
   - chartType: ${plan.chartType}
   - visualDensity: ${plan.visualDensity}`
}

function isStyleOnlyRequest(prompt: string, parentDNA?: InfographicDNA): boolean {
  if (!parentDNA) return false

  const lower = prompt.toLowerCase()
  const dataKeywords = [
    'latest',
    'update',
    'updated',
    'data',
    'stat',
    'statistics',
    'number',
    'numbers',
    'fact',
    'facts',
    'source',
    'sources',
    'research',
    '202',
    'compare',
    'ranking',
    'rank',
    'trend',
    'growth',
    'decline',
    'increase',
    'decrease',
    'country',
    'countries',
    'gdp',
    'population',
    'revenue',
    'market',
    'rate',
    'percent',
    'percentage',
    'ratio',
    'ratios',
    'proportion',
    'proportions',
    'share',
    'shares',
    'distribution',
    'breakdown',
    'normalize',
    'normalise',
    'normalized',
    'normalised',
    'convert',
    'converted',
    'conversion',
    'recalculate',
    'recalculated',
    'based on',
  ]
  const styleKeywords = [
    'style',
    'theme',
    'color',
    'colour',
    'palette',
    'layout',
    'chart',
    'donut',
    'pie',
    'bar',
    'line',
    'area',
    'neon',
    'minimalist',
    'editorial',
    'glass',
    'warm',
    'ocean',
    'dark',
    'light',
    'font',
    'look',
    'align',
    'center',
    'left',
    'stacked',
    'split',
    'cleaner',
    'bold',
  ]

  if (dataKeywords.some((keyword) => lower.includes(keyword))) return false

  return styleKeywords.some((keyword) => lower.includes(keyword))
}

function normalizeURL(url: string): string {
  try {
    const normalized = new URL(url)
    normalized.hash = ''
    return normalized.toString().replace(/\/$/, '')
  } catch {
    return url.trim().replace(/\/$/, '')
  }
}
