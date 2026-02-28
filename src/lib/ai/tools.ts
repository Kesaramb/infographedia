import type Anthropic from '@anthropic-ai/sdk'

/**
 * Web search tool definition for Claude tool calling.
 * Claude will call this tool when it needs real-world data to ground the infographic.
 */
export const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: 'web_search',
  description:
    'Search the web for current, factual data to use in infographic generation. ' +
    'Use this for any statistics, facts, numbers, or recent data the user requests. ' +
    'Always search before generating data — never hallucinate numbers.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant data. Be specific — include the year, topic, and metric.',
      },
    },
    required: ['query'],
  },
}

/**
 * All tools available to the AI during DNA generation.
 */
export const AI_TOOLS: Anthropic.Tool[] = [WEB_SEARCH_TOOL]
