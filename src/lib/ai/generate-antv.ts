import type Anthropic from '@anthropic-ai/sdk'
import type { KnowledgeSearchResult } from '@/lib/knowledge/types'
import type { GenerateError } from './generate'
import type { GenerationBrief } from './brief'
import type { PlannedMediaCandidate } from './planner'
import { createAnthropicMessageWithRetry, getAnthropicClient } from './client'
import { getAIConfig } from './config'
import { buildAntVIterationPrompt, buildAntVNewPrompt, buildAntVSystemPrompt } from './prompts'
import { WEB_SEARCH_TOOL, KNOWLEDGE_BASE_TOOL, IMAGE_SEARCH_TOOL } from './tools'
import { executeImageSearchDetailed, executeWebSearchDetailed } from './search'
import { buildCorrectionPrompt, extractJSON } from './parse'
import { searchKnowledgeDetailed } from '@/lib/knowledge/search'
import { storeGenerationKnowledge } from '@/lib/knowledge/store'
import { PREVIEW_RENDER_PROFILE, preflightDNA } from '@/lib/dna/rendering'
import { fitAntVCopyToBudget, fitDNAToBudget } from '@/lib/dna/copy-fit'
import { planAntVInfographic } from '@/lib/antv/planner'
import { AntVDocumentDraftSchema, type InfographicDocumentV2, type InfographicDocumentV2Draft } from '@/lib/antv/schema'
import { documentV2ToDNA } from '@/lib/antv/compat'
import { finalizeAntVDocument } from '@/lib/antv/syntax'
import { ensureAntVDocumentPanels } from '@/lib/antv/panels'
import { renderAntVDocumentToSVG } from '@/lib/antv/render'

type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>
type TextBlock = Extract<ContentBlock, { type: 'text' }>

export interface GenerateAntVResult {
  success: true
  documentV2: InfographicDocumentV2
  dna: ReturnType<typeof documentV2ToDNA>
  searchQueries: string[]
}

export type GenerateAntVResponse = GenerateAntVResult | GenerateError

export async function generateAntVInfographic(
  prompt: string,
  parentDocument?: InfographicDocumentV2,
  brief?: GenerationBrief,
): Promise<GenerateAntVResponse> {
  if (brief?.engine === 'dna-legacy') {
    return {
      success: false,
      error: 'Internal routing mismatch: a single-view legacy request reached the AntV generator.',
      stage: 'validation',
    }
  }

  const client = getAnthropicClient()
  const aiConfig = await getAIConfig()
  const searchQueries: string[] = []
  const provenanceResults: KnowledgeSearchResult[] = []
  const styleOnlyRequest = isStyleOnlyAntVRequest(prompt, parentDocument)
  const requiresGrounding = !styleOnlyRequest
  let searchWasReal = false
  let hasFreshKnowledgeEvidence = false
  let hasGroundedMediaEvidence = false

  const fallbackBrief: GenerationBrief = brief ?? {
    engine: 'antv',
    intent: 'single-view',
    requestedViews: ['bar'],
    storyGoal: prompt,
    copyBudget: {
      titleLines: PREVIEW_RENDER_PROFILE.maxTitleLines,
      subtitleLines: PREVIEW_RENDER_PROFILE.maxSubtitleLines,
      hookLines: PREVIEW_RENDER_PROFILE.maxHookLines,
      footnoteLines: PREVIEW_RENDER_PROFILE.maxFootnoteLines,
      labelLength: PREVIEW_RENDER_PROFILE.maxLabelLength,
      maxSources: PREVIEW_RENDER_PROFILE.maxSources,
      maxMediaItems: PREVIEW_RENDER_PROFILE.maxMediaItems,
    },
    upgradeFromLegacyParent: false,
  }
  const plan = await planAntVInfographic(prompt, aiConfig, fallbackBrief, parentDocument)
  if (plan.dnaPlan.mediaCandidates.length > 0) {
    hasGroundedMediaEvidence = true
    provenanceResults.push(
      ...plan.dnaPlan.mediaCandidates.map((item) => ({
        title: item.caption ?? item.alt,
        url: item.sourceUrl,
        snippet: item.relevance,
        usedInDNA: false,
      })),
    )
    searchQueries.push(...plan.dnaPlan.imageSearchQueries.map((query) => `[IMG] ${query}`))
  }

  if (requiresGrounding && !aiConfig.enableKnowledgeBase && !aiConfig.enableWebSearch) {
    return {
      success: false,
      error: 'Verified research is required for AntV data-changing prompts, but both knowledge base and web search are disabled.',
      stage: 'grounding',
    }
  }

  const systemPrompt = buildAntVSystemPrompt(aiConfig, PREVIEW_RENDER_PROFILE)
  const userMessage = parentDocument
    ? buildAntVIterationPrompt(prompt, parentDocument, plan)
    : buildAntVNewPrompt(prompt, plan)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  const tools: Anthropic.Tool[] = []
  if (aiConfig.enableKnowledgeBase) tools.push(KNOWLEDGE_BASE_TOOL)
  if (aiConfig.enableWebSearch) tools.push(WEB_SEARCH_TOOL)
  if (aiConfig.enableGroundedMedia) tools.push(IMAGE_SEARCH_TOOL)

  try {
    let response = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      tools,
      messages,
    }, { label: 'generate-antv' })

    let toolRounds = 0
    while (response.stop_reason === 'tool_use' && toolRounds < aiConfig.maxToolRounds) {
      toolRounds++

      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'search_knowledge_base') {
          const input = toolUse.input as { query: string }
          searchQueries.push(`[KB] ${input.query}`)
          const kbResult = await searchKnowledgeDetailed(input.query)
          if (kbResult.hasFreshResults) hasFreshKnowledgeEvidence = true
          provenanceResults.push(...kbResult.results)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: kbResult.content,
          })
        } else if (toolUse.name === 'web_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(input.query)
          const searchResult = await executeWebSearchDetailed(input.query)
          if (searchResult.real) searchWasReal = true
          provenanceResults.push(
            ...searchResult.results.map((result) => ({
              ...result,
              usedInDNA: false,
            })),
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: searchResult.content,
          })
        } else if (toolUse.name === 'image_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(`[IMG] ${input.query}`)
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
        }
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      const isLastRound = toolRounds >= aiConfig.maxToolRounds - 1
      if (isLastRound) {
        messages.push({
          role: 'user',
          content: 'You have enough grounded information. Produce the final documentV2 draft JSON now. Do not call more tools.',
        })
      }

      response = await createAnthropicMessageWithRetry(client, {
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: systemPrompt,
        ...(isLastRound ? {} : { tools }),
        messages,
      }, { label: 'generate-antv' })

      if (isLastRound) break
    }

    const responseText = response.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    if (!responseText.trim()) {
      return {
        success: false,
        error: 'AI returned an empty AntV response. Please try again.',
        stage: 'parse',
      }
    }

    const parseResult = parseAntVDocumentDraftResponse(responseText, plan.dnaPlan.mediaCandidates)
    if (parseResult.success) {
      const finalized = finalizeAntVDocument(parseResult.data, {
        templateCategory: plan.templateCategory,
        templateName: plan.templateName,
        themeName: plan.themeName,
        panelLayout: plan.panelLayout,
        panels: plan.panels,
      })
      const fittedDocument = fitAntVCopyToBudget(finalized, PREVIEW_RENDER_PROFILE)

      const validation = await validateGeneratedDocument({
        document: fittedDocument,
        parentDocument,
        plan,
        requiresGrounding,
        searchWasReal,
        hasFreshKnowledgeEvidence,
        provenanceResults,
        hasGroundedMediaEvidence,
      })

      if (validation.ok) {
        storeGenerationKnowledge(
          searchQueries,
          provenanceResults,
          validation.dna,
          searchWasReal || hasFreshKnowledgeEvidence,
        ).catch((err) => console.error('[knowledge-store]', err))

        return {
          success: true,
          documentV2: fittedDocument,
          dna: validation.dna,
          searchQueries,
        }
      }

      if (validation.stage === 'validation') {
        const repaired = await attemptAntVValidationRepair({
          client,
          aiConfig,
          systemPrompt,
          validationError: validation.error,
          candidateDocument: fittedDocument,
          searchQueries,
          provenanceResults,
          searchWasReal,
          hasFreshKnowledgeEvidence,
          parentDocument,
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
      messages.push({ role: 'user', content: buildCorrectionPrompt(validation.error, responseText) })
    } else {
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: buildCorrectionPrompt(parseResult.error, parseResult.rawText) })
    }

    const retryResponse = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      system: systemPrompt,
      messages,
    }, { label: 'generate-antv-retry' })

    const retryText = retryResponse.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const retryResult = parseAntVDocumentDraftResponse(retryText, plan.dnaPlan.mediaCandidates)
    if (!retryResult.success) {
      return {
        success: false,
        error: `Failed after retry: ${retryResult.error}`,
        stage: 'validation',
      }
    }

    const finalizedRetry = finalizeAntVDocument(retryResult.data, {
      templateCategory: plan.templateCategory,
      templateName: plan.templateName,
      themeName: plan.themeName,
      panelLayout: plan.panelLayout,
      panels: plan.panels,
    })
    const fittedRetryDocument = fitAntVCopyToBudget(finalizedRetry, PREVIEW_RENDER_PROFILE)

    const retryValidation = await validateGeneratedDocument({
      document: fittedRetryDocument,
      parentDocument,
      plan,
      requiresGrounding,
      searchWasReal,
      hasFreshKnowledgeEvidence,
      provenanceResults,
      hasGroundedMediaEvidence,
    })

    if (!retryValidation.ok) {
      if (retryValidation.stage === 'validation') {
        const repaired = await attemptAntVValidationRepair({
          client,
          aiConfig,
          systemPrompt,
          validationError: retryValidation.error,
          candidateDocument: finalizedRetry,
          searchQueries,
          provenanceResults,
          searchWasReal,
          hasFreshKnowledgeEvidence,
          parentDocument,
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
        error: retryValidation.error,
        stage: retryValidation.stage,
      }
    }

    storeGenerationKnowledge(
      searchQueries,
      provenanceResults,
      retryValidation.dna,
      searchWasReal || hasFreshKnowledgeEvidence,
    ).catch((err) => console.error('[knowledge-store]', err))

      return {
        success: true,
        documentV2: fittedRetryDocument,
        dna: retryValidation.dna,
        searchQueries,
      }
  } catch (error) {
    return {
      success: false,
      error: `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown API error'}`,
      stage: 'api',
    }
  }
}

async function attemptAntVValidationRepair({
  client,
  aiConfig,
  systemPrompt,
  validationError,
  candidateDocument,
  searchQueries,
  provenanceResults,
  searchWasReal,
  hasFreshKnowledgeEvidence,
  parentDocument,
  prompt,
  requiresGrounding,
  hasGroundedMediaEvidence,
  plan,
}: {
  client: Anthropic
  aiConfig: Awaited<ReturnType<typeof getAIConfig>>
  systemPrompt: string
  validationError: string
  candidateDocument: InfographicDocumentV2
  searchQueries: string[]
  provenanceResults: KnowledgeSearchResult[]
  searchWasReal: boolean
  hasFreshKnowledgeEvidence: boolean
  parentDocument?: InfographicDocumentV2
  prompt: string
  requiresGrounding: boolean
  hasGroundedMediaEvidence: boolean
  plan: Awaited<ReturnType<typeof planAntVInfographic>>
}): Promise<GenerateAntVResult | null> {
  const repairResponse = await createAnthropicMessageWithRetry(client, {
    model: aiConfig.model,
    max_tokens: aiConfig.maxTokens,
    temperature: Math.min(aiConfig.temperature, 0.2),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: buildAntVValidationRepairPrompt({
          prompt,
          validationError,
          candidateDocument,
          plan,
        }),
      },
    ],
  }, { label: 'generate-antv-repair' })

  const repairText = repairResponse.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const repairResult = parseAntVDocumentDraftResponse(repairText, plan.dnaPlan.mediaCandidates)
  if (!repairResult.success) {
    return null
  }

  const finalized = finalizeAntVDocument(repairResult.data, {
    templateCategory: plan.templateCategory,
    templateName: plan.templateName,
    themeName: plan.themeName,
    panelLayout: plan.panelLayout,
    panels: plan.panels,
  })
  const fittedDocument = fitAntVCopyToBudget(finalized, PREVIEW_RENDER_PROFILE)

  const validation = await validateGeneratedDocument({
    document: fittedDocument,
    parentDocument,
    plan,
    requiresGrounding,
    searchWasReal,
    hasFreshKnowledgeEvidence,
    provenanceResults,
    hasGroundedMediaEvidence,
  })

  if (!validation.ok) {
    return null
  }

  storeGenerationKnowledge(
    searchQueries,
    provenanceResults,
    validation.dna,
    searchWasReal || hasFreshKnowledgeEvidence,
  ).catch((err) => console.error('[knowledge-store]', err))

  return {
    success: true,
    documentV2: fittedDocument,
    dna: validation.dna,
    searchQueries,
  }
}

function buildAntVValidationRepairPrompt({
  prompt,
  validationError,
  candidateDocument,
  plan,
}: {
  prompt: string
  validationError: string
  candidateDocument: InfographicDocumentV2
  plan: Awaited<ReturnType<typeof planAntVInfographic>>
}): string {
  return `Repair the following documentV2 draft so it passes final validation.

Original user request:
${prompt}

Validation failure:
${validationError}

Current documentV2 JSON:
${JSON.stringify(candidateDocument, null, 2)}

Rules:
1. Output ONLY valid documentV2 draft JSON. No markdown or explanation.
2. Keep the grounded topic, sources, media URLs, templateCategory, templateFamily, themeName, layoutFamily, and visualDensity unchanged unless the validation failure makes that impossible.
3. For semantic consistency problems, prefer rewriting content.title, content.subtitle, content.hook, content.caveats, and content.footnotes to match the normalized data instead of changing grounded numbers.
4. Keep the planned panelLayout and panel structure intact. Do not collapse a multi-panel plan into one chart.
5. The repaired output must still match this planned AntV direction:
   - templateCategory: ${plan.templateCategory}
   - templateFamily: ${plan.templateName}
   - themeName: ${plan.themeName}
   - chartType: ${plan.chartType}
   - visualDensity: ${plan.visualDensity}
   - layoutFamily: ${plan.layoutFamily}`
}

async function validateGeneratedDocument(input: {
  document: InfographicDocumentV2
  parentDocument?: InfographicDocumentV2
  plan: Awaited<ReturnType<typeof planAntVInfographic>>
  requiresGrounding: boolean
  searchWasReal: boolean
  hasFreshKnowledgeEvidence: boolean
  provenanceResults: KnowledgeSearchResult[]
  hasGroundedMediaEvidence: boolean
}):
  Promise<{ ok: true; dna: ReturnType<typeof documentV2ToDNA> } | { ok: false; error: string; stage: GenerateError['stage'] }> {
  const {
    document,
    parentDocument,
    plan,
    requiresGrounding,
    searchWasReal,
    hasFreshKnowledgeEvidence,
    provenanceResults,
    hasGroundedMediaEvidence,
  } = input

  if (!requiresGrounding && parentDocument && JSON.stringify(document.content) !== JSON.stringify(parentDocument.content)) {
    return {
      ok: false,
      error: 'Style-only AntV iterations must preserve the parent content. The generated document changed grounded content without new research.',
      stage: 'grounding',
    }
  }

  if (requiresGrounding && !searchWasReal && !hasFreshKnowledgeEvidence) {
    return {
      ok: false,
      error: 'Data-changing AntV prompts require fresh grounding. Verified web search was unavailable and no recent knowledge-base evidence was found.',
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
    !document.content.sources.some((source) => normalizedProvenanceUrls.has(normalizeURL(source.url)))
  ) {
    return {
      ok: false,
      error: 'Generated documentV2 sources must come from collected grounding evidence.',
      stage: 'grounding',
    }
  }

  if (
    document.content.media.length > 0 &&
    normalizedProvenanceUrls.size > 0 &&
    !document.content.media.every((item) => normalizedProvenanceUrls.has(normalizeURL(item.source.url)))
  ) {
    return {
      ok: false,
      error: 'AntV media blocks must cite source URLs returned by grounded research or image search.',
      stage: 'grounding',
    }
  }

  if (document.presentation.templateCategory !== plan.templateCategory) {
    return {
      ok: false,
      error: `The generated templateCategory must match the planned AntV direction (${plan.templateCategory}).`,
      stage: 'validation',
    }
  }

  if (document.presentation.templateFamily !== plan.templateName) {
    return {
      ok: false,
      error: `The generated templateFamily must match the planned AntV template (${plan.templateName}).`,
      stage: 'validation',
    }
  }

  if (document.presentation.themeName !== plan.themeName) {
    return {
      ok: false,
      error: `The generated themeName must match the planned AntV theme (${plan.themeName}).`,
      stage: 'validation',
    }
  }

  if (document.presentation.visualDensity !== plan.visualDensity) {
    return {
      ok: false,
      error: `The generated visualDensity must match the planned direction (${plan.visualDensity}).`,
      stage: 'validation',
    }
  }

  if (document.presentation.layoutFamily !== plan.layoutFamily) {
    return {
      ok: false,
      error: `The generated layoutFamily must match the planned AntV direction (${plan.layoutFamily}).`,
      stage: 'validation',
    }
  }

  const normalizedDocument = ensureAntVDocumentPanels(document)
  if (normalizedDocument.presentation.panelLayout !== plan.panelLayout) {
    return {
      ok: false,
      error: `The generated panelLayout must match the planned AntV scene (${plan.panelLayout}).`,
      stage: 'validation',
    }
  }

  if (normalizedDocument.presentation.panels.length !== plan.panels.length) {
    return {
      ok: false,
      error: 'The generated AntV scene must preserve the planned number of panels.',
      stage: 'validation',
    }
  }

  for (const expectedPanel of plan.panels) {
    const actualPanel = normalizedDocument.presentation.panels.find((panel) => panel.id === expectedPanel.id)
    if (!actualPanel) {
      return {
        ok: false,
        error: `The generated AntV scene is missing the planned panel "${expectedPanel.id}".`,
        stage: 'validation',
      }
    }

    if (
      actualPanel.role !== expectedPanel.role ||
      actualPanel.viewType !== expectedPanel.viewType ||
      actualPanel.sourceGroupId !== expectedPanel.sourceGroupId
    ) {
      return {
        ok: false,
        error: `The generated AntV panel "${expectedPanel.id}" must preserve its planned role, viewType, and sourceGroupId.`,
        stage: 'validation',
      }
    }
  }

  if (document.content.media.length > 0 && !hasGroundedMediaEvidence && plan.dnaPlan.mediaCandidates.length === 0) {
    return {
      ok: false,
      error: 'The generated document added media without grounded media evidence.',
      stage: 'grounding',
    }
  }

  try {
    await renderAntVDocumentToSVG(document)
  } catch (error) {
    return {
      ok: false,
      error: `AntV render smoke check failed: ${error instanceof Error ? error.message : 'Unknown AntV render error'}`,
      stage: 'validation',
    }
  }

  let dna: ReturnType<typeof documentV2ToDNA>
  try {
    dna = fitDNAToBudget(documentV2ToDNA(document), PREVIEW_RENDER_PROFILE)
  } catch (error) {
    return {
      ok: false,
      error: `Derived compatibility DNA failed validation: ${error instanceof Error ? error.message : 'Unknown DNA projection error'}`,
      stage: 'validation',
    }
  }

  const preflight = preflightDNA(dna, PREVIEW_RENDER_PROFILE)
  if (!preflight.ok) {
    return {
      ok: false,
      error: `Compatibility DNA preflight failed:\n${preflight.errors.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n')}`,
      stage: 'validation',
    }
  }

  return { ok: true, dna }
}

function isStyleOnlyAntVRequest(
  prompt: string,
  parentDocument?: InfographicDocumentV2,
): boolean {
  if (!parentDocument) return false

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
    'share',
    'convert',
    'recalculate',
    'based on',
  ]
  const styleKeywords = [
    'style',
    'theme',
    'color',
    'palette',
    'layout',
    'template',
    'look',
    'bold',
    'minimal',
    'editorial',
    'glass',
    'dark',
    'light',
    'density',
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

function parseAntVDocumentDraftResponse(
  responseText: string,
  plannedMediaCandidates: PlannedMediaCandidate[] = [],
): { success: true; data: InfographicDocumentV2Draft } | { success: false; error: string; rawText: string } {
  const jsonText = extractJSON(responseText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      success: false,
      error: 'Invalid JSON: Could not parse the response as JSON. Make sure to output ONLY valid JSON with no markdown or explanation.',
      rawText: responseText,
    }
  }

  const normalized = normalizeAntVDocumentDraftCandidate(parsed, plannedMediaCandidates)
  const result = AntVDocumentDraftSchema.safeParse(normalized)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const issues = result.error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return `  - ${path}: ${issue.message}`
    })
    .join('\n')

  return {
    success: false,
    error: `documentV2 draft validation failed:\n${issues}\n\nFix these issues and regenerate the JSON.`,
    rawText: responseText,
  }
}

function normalizeAntVDocumentDraftCandidate(
  parsed: unknown,
  plannedMediaCandidates: PlannedMediaCandidate[],
): unknown {
  if (!isRecord(parsed)) return parsed
  const content = isRecord(parsed.content) ? parsed.content : null
  if (!content) return parsed

  return {
    ...parsed,
    content: {
      ...content,
      media: Array.isArray(content.media)
        ? content.media.map((item, index) => normalizeAntVMediaCandidate(item, index, plannedMediaCandidates[index] ?? plannedMediaCandidates[0]))
        : content.media,
    },
  }
}

function normalizeAntVMediaCandidate(
  item: unknown,
  index: number,
  fallbackCandidate?: PlannedMediaCandidate,
): unknown {
  if (!isRecord(item)) return item

  const source = isRecord(item.source) ? item.source : null
  const sourceName =
    asString(item.sourceName)
    ?? asString(source?.name)
    ?? fallbackCandidate?.sourceName
    ?? asString(item.title)
    ?? 'Grounded source'
  const sourceUrl = asString(item.sourceUrl) ?? asString(source?.url) ?? fallbackCandidate?.sourceUrl
  const url = asString(item.url) ?? asString(item.imageUrl) ?? fallbackCandidate?.url
  const kind = normalizeMediaKind(asString(item.kind)) ?? fallbackCandidate?.kind
  const usage = normalizeMediaUsage(asString(item.usage)) ?? fallbackCandidate?.usage

  return {
    ...item,
    id: asString(item.id) ?? `media-${index + 1}`,
    kind,
    usage,
    url,
    alt:
      asString(item.alt)
      ?? asString(item.caption)
      ?? asString(item.title)
      ?? fallbackCandidate?.alt
      ?? `Supporting image ${index + 1}`,
    caption: asString(item.caption) ?? asString(item.title) ?? fallbackCandidate?.caption,
    relevance:
      asString(item.relevance)
      ?? asString(item.snippet)
      ?? fallbackCandidate?.relevance
      ?? 'Grounded supporting image selected for the infographic.',
    source: sourceUrl
      ? {
          name: sourceName,
          url: sourceUrl,
          accessedAt: asString(item.accessedAt) ?? asString(source?.accessedAt) ?? new Date().toISOString().slice(0, 10),
        }
      : source ?? undefined,
    contextLabel:
      usage === 'context'
        ? asString(item.contextLabel) ?? fallbackCandidate?.contextLabel ?? 'Context image'
        : asString(item.contextLabel),
  }
}

function normalizeMediaKind(value?: string): string | undefined {
  if (!value) return undefined
  if (value === 'hero-image' || value === 'annotated-image' || value === 'scan-card') {
    return value
  }
  if (value.includes('annotat')) return 'annotated-image'
  if (value.includes('scan') || value.includes('document')) return 'scan-card'
  if (value.includes('hero') || value.includes('image') || value.includes('photo')) return 'hero-image'
  return value
}

function normalizeMediaUsage(value?: string): string | undefined {
  if (!value) return undefined
  if (value === 'evidence' || value === 'context') {
    return value
  }
  if (value.includes('context')) return 'context'
  if (value.includes('evidence') || value.includes('proof') || value.includes('support')) return 'evidence'
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
