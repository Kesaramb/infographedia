import type Anthropic from '@anthropic-ai/sdk'

/**
 * Knowledge base search tool — checks Qdrant for previously researched data.
 * Claude should call this FIRST before falling back to web_search.
 */
export const KNOWLEDGE_BASE_TOOL: Anthropic.Tool = {
  name: 'search_knowledge_base',
  description:
    'Search the Infographedia knowledge base for previously researched data. ' +
    'This contains verified data from past infographic generations with source URLs. ' +
    'Check this FIRST before using web_search — it is faster and contains curated data. ' +
    'Only use web_search if the knowledge base has no relevant results or data is stale.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The topic to search for in the knowledge base.',
      },
    },
    required: ['query'],
  },
}

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
