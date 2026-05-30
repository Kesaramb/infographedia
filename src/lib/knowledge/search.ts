import { getClient, ensureCollection, COLLECTION_NAME } from './client'
import { embedText } from './embeddings'
import type { KnowledgeResult, KnowledgeSearchResult } from './types'

const MIN_SCORE = 0.75
const MAX_AGE_DAYS = 30
const STALE_THRESHOLD_DAYS = 7

/**
 * Search the knowledge base for relevant past research.
 * Returns formatted text suitable for a Claude tool_result.
 */
export async function searchKnowledge(
  query: string,
  limit = 5,
): Promise<string> {
  const result = await searchKnowledgeDetailed(query, limit)
  return result.content
}

export interface KnowledgeSearchExecution {
  content: string
  results: KnowledgeSearchResult[]
  hasFreshResults: boolean
}

export async function searchKnowledgeDetailed(
  query: string,
  limit = 5,
): Promise<KnowledgeSearchExecution> {
  // Bail early if Qdrant/Voyage aren't configured
  if (!process.env.QDRANT_URL || !process.env.VOYAGE_API_KEY) {
    return {
      content: '[Knowledge base unavailable — QDRANT_URL or VOYAGE_API_KEY not configured]',
      results: [],
      hasFreshResults: false,
    }
  }

  try {
    await ensureCollection()
    const client = getClient()

    const queryVector = await embedText(query)

    const results = await client.search(COLLECTION_NAME, {
      vector: queryVector,
      limit,
      with_payload: true,
      score_threshold: MIN_SCORE,
    })

    if (results.length === 0) {
      return {
        content: `[No relevant results in knowledge base for: "${query}"]`,
        results: [],
        hasFreshResults: false,
      }
    }

    // Filter out results older than MAX_AGE_DAYS
    const now = new Date()
    const filtered: KnowledgeResult[] = []
    let hasFreshResults = false

    for (const result of results) {
      const payload = result.payload as Record<string, unknown>
      const createdAt = payload.createdAt as string
      const created = new Date(createdAt)
      const ageDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

      if (ageDays > MAX_AGE_DAYS) continue

      const kr: KnowledgeResult = {
        score: result.score,
        query: payload.query as string,
        dataSummary: payload.dataSummary as string,
        searchResults: ((payload.searchResults as Array<Record<string, unknown>>) ?? []).map(
          (sr) => ({
            title: sr.title as string,
            url: sr.url as string,
            snippet: sr.snippet as string,
          }),
        ),
        qualityScore: payload.qualityScore as number,
        createdAt,
      }

      if (ageDays > STALE_THRESHOLD_DAYS) {
        kr.staleWarning = `Data is ${Math.round(ageDays)} days old — consider verifying with web search`
      } else {
        hasFreshResults = true
      }

      filtered.push(kr)
    }

    if (filtered.length === 0) {
      return {
        content: `[Knowledge base results for "${query}" are all older than ${MAX_AGE_DAYS} days. Use web_search for fresh data.]`,
        results: [],
        hasFreshResults: false,
      }
    }

    return {
      content: formatKnowledgeResults(query, filtered),
      results: filtered.flatMap((entry) =>
        entry.searchResults.map((result) => ({
          ...result,
          usedInDNA: false,
        })),
      ),
      hasFreshResults,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: `[Knowledge base search failed: ${msg}. Fall back to web_search.]`,
      results: [],
      hasFreshResults: false,
    }
  }
}

function formatKnowledgeResults(query: string, results: KnowledgeResult[]): string {
  const formatted = results
    .map((r, i) => {
      let entry = `[${i + 1}] (relevance: ${(r.score * 100).toFixed(0)}%, quality: ${(r.qualityScore * 100).toFixed(0)}%)\n`
      entry += `    Summary: ${r.dataSummary}\n`
      entry += `    Sources: ${r.searchResults.map((sr) => sr.url).join(', ')}\n`
      entry += `    Stored: ${r.createdAt.split('T')[0]}`
      if (r.staleWarning) {
        entry += `\n    ⚠ ${r.staleWarning}`
      }
      return entry
    })
    .join('\n\n')

  return `Knowledge base results for: "${query}"\n\n${formatted}\n\nYou may use this data directly if it is recent and relevant. If data seems stale or incomplete, supplement with web_search.`
}
