/**
 * Web search wrapper.
 *
 * Uses a simple fetch to a search API. In production you'd use
 * Brave Search, SerpAPI, or similar. For now we use a lightweight
 * approach that returns search results as formatted text.
 *
 * The results are passed back to Claude as tool_result content,
 * so Claude can extract the real data it needs.
 */

interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Execute a web search and return formatted results.
 * Falls back to a descriptive error if the search service is unavailable.
 */
export async function executeWebSearch(query: string): Promise<string> {
  try {
    // Use Brave Search API if available
    const braveKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveKey) {
      return await braveSearch(query, braveKey)
    }

    // Fallback: use a simple Google-based approach via SerpAPI
    const serpKey = process.env.SERP_API_KEY
    if (serpKey) {
      return await serpSearch(query, serpKey)
    }

    // No search API configured — return a helpful message
    // Claude will still generate DNA but with a note about unverified data
    return `[Search unavailable — no BRAVE_SEARCH_API_KEY or SERP_API_KEY configured]
The user asked about: "${query}"
Please generate the DNA using your training knowledge, but mark sources as "AI Knowledge Base" with today's date.
Note: In production, real web search would ground this data.`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search error'
    return `[Search failed: ${message}]
Please generate the DNA using your training knowledge, but mark sources as "AI Knowledge Base (search unavailable)" with today's date.`
  }
}

/**
 * Brave Search API
 */
async function braveSearch(query: string, apiKey: string): Promise<string> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '5')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Brave Search API returned ${response.status}`)
  }

  const data = await response.json()
  const results: SearchResult[] = (data.web?.results ?? []).slice(0, 5)

  return formatResults(query, results)
}

/**
 * SerpAPI (Google Search)
 */
async function serpSearch(query: string, apiKey: string): Promise<string> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('q', query)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('num', '5')

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`SerpAPI returned ${response.status}`)
  }

  const data = await response.json()
  const organic = data.organic_results ?? []
  const results: SearchResult[] = organic.slice(0, 5).map((r: { title: string; link: string; snippet: string }) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }))

  return formatResults(query, results)
}

/**
 * Format search results into a text block for Claude to consume.
 */
function formatResults(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`
  }

  const formatted = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`
    )
    .join('\n\n')

  return `Search results for: "${query}"\n\n${formatted}`
}
