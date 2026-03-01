import type Anthropic from '@anthropic-ai/sdk'
import type { InfographicDNA } from '@/lib/dna/schema'

// Derive content block types from the SDK's ContentBlock union
type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>
type TextBlock = Extract<ContentBlock, { type: 'text' }>
import { getAnthropicClient } from './client'
import { buildSystemPrompt, buildNewPrompt, buildIterationPrompt } from './prompts'
import { getAIConfig } from './config'
import { WEB_SEARCH_TOOL, KNOWLEDGE_BASE_TOOL } from './tools'
import { executeWebSearch, wasLastSearchReal } from './search'
import { parseAIResponse, buildCorrectionPrompt } from './parse'
import { searchKnowledge } from '@/lib/knowledge/search'
import { storeGenerationKnowledge } from '@/lib/knowledge/store'

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
  stage: 'api' | 'parse' | 'validation' | 'tool_loop'
}

export type GenerateResponse = GenerateResult | GenerateError

/**
 * Generate a new infographic DNA from a user prompt.
 */
export async function generateDNA(
  prompt: string,
  parentDNA?: InfographicDNA,
): Promise<GenerateResponse> {
  const client = getAnthropicClient()
  const searchQueries: string[] = []
  let searchWasReal = false

  console.log(`[generate] Starting: "${prompt.slice(0, 80)}"${parentDNA ? ' (iteration)' : ' (new)'}`)

  // Fetch admin-configured AI settings
  const aiConfig = await getAIConfig()
  console.log(`[generate] Config: model=${aiConfig.model}, maxTokens=${aiConfig.maxTokens}, tools=[${aiConfig.enableKnowledgeBase ? 'KB' : ''}${aiConfig.enableWebSearch ? ',WS' : ''}]`)
  const systemPrompt = buildSystemPrompt(aiConfig)

  // Build the user message
  const userMessage = parentDNA
    ? buildIterationPrompt(prompt, parentDNA)
    : buildNewPrompt(prompt)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  // Assemble tools based on admin config
  const tools: Anthropic.Tool[] = []
  if (aiConfig.enableKnowledgeBase) tools.push(KNOWLEDGE_BASE_TOOL)
  if (aiConfig.enableWebSearch) tools.push(WEB_SEARCH_TOOL)

  try {
    // --- Main generation loop with tool calling ---
    let response = await client.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      tools,
      messages,
    })

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
          console.log(`[generate] Tool: search_knowledge_base("${input.query}")`)

          const kbResult = await searchKnowledge(input.query)
          console.log(`[generate] KB result: ${kbResult.slice(0, 120)}...`)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: kbResult,
          })
        } else if (toolUse.name === 'web_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(input.query)
          console.log(`[generate] Tool: web_search("${input.query}")`)

          const searchResult = await executeWebSearch(input.query)
          if (wasLastSearchReal()) searchWasReal = true
          console.log(`[generate] Web result (real=${wasLastSearchReal()}): ${searchResult.slice(0, 120)}...`)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: searchResult,
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

      response = await client.messages.create({
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: systemPrompt,
        tools,
        messages,
      })
    }

    if (toolRounds >= aiConfig.maxToolRounds) {
      return {
        success: false,
        error: 'AI entered an infinite tool-calling loop. Please try a simpler prompt.',
        stage: 'tool_loop',
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
      console.log(`[generate] Success: "${parseResult.dna.content.title}" (${parseResult.dna.presentation.chartType}, ${parseResult.dna.content.data.length} data points, searchWasReal=${searchWasReal})`)
      // Background: store knowledge for future generations (non-blocking)
      const webSearchUrls = searchQueries
        .filter((q) => !q.startsWith('[KB]'))
        .map(() => '') // URLs extracted from DNA sources below
      storeGenerationKnowledge(searchQueries, webSearchUrls, parseResult.dna, searchWasReal).catch(
        (err) => console.error('[knowledge-store]', err),
      )
      return {
        success: true,
        dna: parseResult.dna,
        searchQueries,
      }
    }

    // --- Retry once with correction prompt ---
    const correctionMessage = buildCorrectionPrompt(
      parseResult.error,
      parseResult.rawText,
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: correctionMessage })

    const retryResponse = await client.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      system: systemPrompt,
      messages,
    })

    const retryText = retryResponse.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const retryResult = parseAIResponse(retryText)

    if (retryResult.success) {
      console.log(`[generate] Success (retry): "${retryResult.dna.content.title}" (searchWasReal=${searchWasReal})`)
      // Background: store knowledge for future generations (non-blocking)
      storeGenerationKnowledge(searchQueries, [], retryResult.dna, searchWasReal).catch(
        (err) => console.error('[knowledge-store]', err),
      )
      return {
        success: true,
        dna: retryResult.dna,
        searchQueries,
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
