/**
 * Web search wrapper.
 *
 * Supports multiple search providers (checked in order):
 *   1. Serper.dev   — SERPER_API_KEY  (Google results via serper.dev)
 *   2. Brave Search — BRAVE_SEARCH_API_KEY
 *   3. SerpAPI      — SERP_API_KEY
 *
 * The results are passed back to Claude as tool_result content,
 * so Claude can extract the real data it needs.
 */

interface SearchResult {
  title: string
  url: string
  snippet: string
}

/** Flag set to true when the last search actually hit a real API */
let lastSearchWasReal = false

/** Check whether the most recent executeWebSearch call returned real results */
export function wasLastSearchReal(): boolean {
  return lastSearchWasReal
}

/**
 * Execute a web search and return formatted results.
 * Falls back to a descriptive error if the search service is unavailable.
 */
export async function executeWebSearch(query: string): Promise<string> {
  try {
    // 1. Serper.dev (preferred — fast, cheap, Google results)
    const serperKey = process.env.SERPER_API_KEY
    if (serperKey) {
      const result = await serperSearch(query, serperKey)
      lastSearchWasReal = true
      console.log(`[web-search] Serper.dev query: "${query}" — returned results`)
      return result
    }

    // 2. Brave Search API
    const braveKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveKey) {
      const result = await braveSearch(query, braveKey)
      lastSearchWasReal = true
      console.log(`[web-search] Brave query: "${query}" — returned results`)
      return result
    }

    // 3. SerpAPI (Google Search)
    const serpKey = process.env.SERP_API_KEY
    if (serpKey) {
      const result = await serpSearch(query, serpKey)
      lastSearchWasReal = true
      console.log(`[web-search] SerpAPI query: "${query}" — returned results`)
      return result
    }

    // No search API configured
    lastSearchWasReal = false
    console.warn('[web-search] NO API KEY CONFIGURED — SERPER_API_KEY, BRAVE_SEARCH_API_KEY, or SERP_API_KEY required')
    return `[Search unavailable — no search API key configured]
The user asked about: "${query}"
Generate the infographic DNA using your best knowledge. Use real source URLs from well-known publications (e.g. Statista, WHO, World Bank) that are likely to exist for this topic.`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search error'
    lastSearchWasReal = false
    console.error(`[web-search] Search failed: ${message}`)
    return `[Search failed: ${message}]
Generate the infographic DNA using your best knowledge. Use real source URLs from well-known publications that are likely to exist for this topic.`
  }
}

/**
 * Serper.dev (Google Search via serper.dev)
 * Docs: https://serper.dev/docs
 */
async function serperSearch(query: string, apiKey: string): Promise<string> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 5 }),
  })

  if (!response.ok) {
    throw new Error(`Serper.dev API returned ${response.status}: ${await response.text().catch(() => '')}`)
  }

  const data = await response.json()
  const organic: Array<{ title: string; link: string; snippet: string }> = data.organic ?? []
  const results: SearchResult[] = organic.slice(0, 5).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet ?? '',
  }))

  return formatResults(query, results)
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
