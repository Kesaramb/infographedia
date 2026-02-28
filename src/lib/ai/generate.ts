import type Anthropic from '@anthropic-ai/sdk'
import type { InfographicDNA } from '@/lib/dna/schema'

// Derive content block types from the SDK's ContentBlock union
type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>
type TextBlock = Extract<ContentBlock, { type: 'text' }>
import { getAnthropicClient } from './client'
import { SYSTEM_PROMPT, buildNewPrompt, buildIterationPrompt } from './prompts'
import { AI_TOOLS } from './tools'
import { executeWebSearch } from './search'
import { parseAIResponse, buildCorrectionPrompt } from './parse'

// ============================================================
// Core DNA Generation Pipeline
//
// This is the heart of Infographedia. It:
// 1. Builds a prompt from user input + optional parent DNA
// 2. Sends it to Claude with web_search tool access
// 3. Handles the tool-calling loop (search → extract → generate)
// 4. Validates the output against the Zod schema
// 5. Retries once on validation failure
// ============================================================

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096
const MAX_TOOL_ROUNDS = 5 // prevent infinite tool-calling loops

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
  parentDNA?: InfographicDNA
): Promise<GenerateResponse> {
  const client = getAnthropicClient()
  const searchQueries: string[] = []

  // Build the user message
  const userMessage = parentDNA
    ? buildIterationPrompt(prompt, parentDNA)
    : buildNewPrompt(prompt)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  try {
    // --- Main generation loop with tool calling ---
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: AI_TOOLS,
      messages,
    })

    // Handle tool-calling loop
    let toolRounds = 0
    while (response.stop_reason === 'tool_use' && toolRounds < MAX_TOOL_ROUNDS) {
      toolRounds++

      // Extract tool calls from the response
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      )

      // Execute each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'web_search') {
          const input = toolUse.input as { query: string }
          searchQueries.push(input.query)

          const searchResult = await executeWebSearch(input.query)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: searchResult,
          })
        } else {
          // Unknown tool — return an error
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
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages,
      })
    }

    if (toolRounds >= MAX_TOOL_ROUNDS) {
      return {
        success: false,
        error: 'AI entered an infinite tool-calling loop. Please try a simpler prompt.',
        stage: 'tool_loop',
      }
    }

    // --- Extract text from the final response ---
    const textBlocks = response.content.filter(
      (block): block is TextBlock => block.type === 'text'
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
      return {
        success: true,
        dna: parseResult.dna,
        searchQueries,
      }
    }

    // --- Retry once with correction prompt ---
    const correctionMessage = buildCorrectionPrompt(
      parseResult.error,
      parseResult.rawText
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: correctionMessage })

    const retryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    })

    const retryText = retryResponse.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const retryResult = parseAIResponse(retryText)

    if (retryResult.success) {
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
