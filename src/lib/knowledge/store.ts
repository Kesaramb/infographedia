import { getClient, ensureCollection, COLLECTION_NAME } from './client'
import { embedText } from './embeddings'
import type { KnowledgePoint } from './types'
import type { InfographicDNA } from '@/lib/dna/schema'

/**
 * Store a knowledge point in Qdrant after a successful generation.
 * This is called in the background (non-blocking) after DNA generation.
 */
export async function storeKnowledge(point: KnowledgePoint): Promise<void> {
  await ensureCollection()
  const client = getClient()

  // Embed the query + data summary for similarity search
  const textToEmbed = `${point.query} ${point.dataSummary}`
  const vector = await embedText(textToEmbed)

  await client.upsert(COLLECTION_NAME, {
    points: [
      {
        id: point.id,
        vector,
        payload: {
          query: point.query,
          topic: point.topic,
          searchResults: point.searchResults,
          dataSummary: point.dataSummary,
          dataPoints: point.dataPoints,
          chartType: point.chartType,
          qualityScore: point.qualityScore,
          createdAt: point.createdAt,
          postId: point.postId ?? null,
        },
      },
    ],
  })
}

/**
 * Score how useful search results were for a generation.
 * Compares content.sources[].url against the search result URLs.
 */
export function scoreUsefulness(
  searchResultUrls: string[],
  dna: InfographicDNA,
): number {
  if (searchResultUrls.length === 0) return 0

  const sourceUrls = new Set(dna.content.sources.map((s) => s.url.toLowerCase()))
  let matched = 0

  for (const url of searchResultUrls) {
    if (sourceUrls.has(url.toLowerCase())) {
      matched++
    }
  }

  return matched / Math.max(sourceUrls.size, 1)
}

/**
 * Check whether the DNA sources are grounded (real URLs, not hallucinated placeholders).
 * Returns true only if at least one source has a real-looking URL.
 */
function hasGroundedSources(dna: InfographicDNA): boolean {
  const FAKE_PATTERNS = [
    'ai knowledge base',
    'example.com',
    'placeholder',
    'search unavailable',
    'training data',
    'training knowledge',
  ]

  return dna.content.sources.some((source) => {
    const lower = `${source.name} ${source.url}`.toLowerCase()
    return !FAKE_PATTERNS.some((pattern) => lower.includes(pattern))
  })
}

/**
 * Build and store knowledge from a successful generation.
 * Called as a background task after generateDNA() succeeds.
 *
 * IMPORTANT: Only stores knowledge when the generation was grounded by
 * real search results. This prevents poisoning the KB with hallucinated data.
 */
export async function storeGenerationKnowledge(
  searchQueries: string[],
  searchResultUrls: string[],
  dna: InfographicDNA,
  searchWasReal: boolean,
): Promise<void> {
  // Only store if there were actual searches
  if (searchQueries.length === 0) return

  // Don't store if Qdrant/Voyage aren't configured
  if (!process.env.QDRANT_URL || !process.env.VOYAGE_API_KEY) return

  // CRITICAL: Don't store ungrounded data — prevents knowledge base poisoning
  if (!searchWasReal) {
    console.log('[knowledge-store] Skipped — web search was not available, data is ungrounded')
    return
  }

  if (!hasGroundedSources(dna)) {
    console.log('[knowledge-store] Skipped — DNA sources appear hallucinated or placeholder')
    return
  }

  const quality = scoreUsefulness(searchResultUrls, dna)

  // Build data summary from DNA content
  const dataSummary = dna.content.data
    .slice(0, 5)
    .map((d) => `${d.label}: ${d.value}${d.unit ? ` ${d.unit}` : ''}`)
    .join(', ')

  const point: KnowledgePoint = {
    id: crypto.randomUUID(),
    query: searchQueries.join(' | '),
    topic: extractTopic(dna.content.title),
    searchResults: dna.content.sources.map((s) => ({
      title: s.name,
      url: s.url,
      snippet: '',
      usedInDNA: true,
    })),
    dataSummary: `${dna.content.title}. ${dataSummary}`,
    dataPoints: dna.content.data.length,
    chartType: dna.presentation.chartType,
    qualityScore: quality,
    createdAt: new Date().toISOString(),
  }

  await storeKnowledge(point)
  console.log(`[knowledge-store] Stored: "${point.topic}" (quality: ${(quality * 100).toFixed(0)}%)`)
}

/** Extract a rough topic from the title (first 2-3 meaningful words) */
function extractTopic(title: string): string {
  return title
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(' ')
    .toLowerCase()
}
