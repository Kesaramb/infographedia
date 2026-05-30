/**
 * Web + image search wrapper.
 *
 * Supports multiple search providers (checked in order):
 *   1. Serper.dev   — SERPER_API_KEY
 *   2. Brave Search — BRAVE_SEARCH_API_KEY (web only, images via OG fallback)
 *   3. SerpAPI      — SERP_API_KEY
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface ImageSearchResult extends SearchResult {
  imageUrl: string
}

export interface WebSearchExecution {
  content: string
  results: SearchResult[]
  real: boolean
}

export interface ImageSearchExecution {
  content: string
  results: ImageSearchResult[]
  real: boolean
}

let lastSearchWasReal = false
const SEARCH_TIMEOUT_MS = 12000

export function wasLastSearchReal(): boolean {
  return lastSearchWasReal
}

export async function executeWebSearch(query: string): Promise<string> {
  const result = await executeWebSearchDetailed(query)
  return result.content
}

export async function executeImageSearch(query: string): Promise<string> {
  const result = await executeImageSearchDetailed(query)
  return result.content
}

export async function executeWebSearchDetailed(query: string): Promise<WebSearchExecution> {
  try {
    const serperKey = process.env.SERPER_API_KEY
    if (serperKey) {
      const results = await serperSearch(query, serperKey)
      lastSearchWasReal = true
      console.log(`[web-search] Serper.dev query: "${query}" — returned ${results.length} results`)
      return {
        content: formatResults(query, results),
        results,
        real: true,
      }
    }

    const braveKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveKey) {
      const results = await braveSearch(query, braveKey)
      lastSearchWasReal = true
      console.log(`[web-search] Brave query: "${query}" — returned ${results.length} results`)
      return {
        content: formatResults(query, results),
        results,
        real: true,
      }
    }

    const serpKey = process.env.SERP_API_KEY
    if (serpKey) {
      const results = await serpSearch(query, serpKey)
      lastSearchWasReal = true
      console.log(`[web-search] SerpAPI query: "${query}" — returned ${results.length} results`)
      return {
        content: formatResults(query, results),
        results,
        real: true,
      }
    }

    lastSearchWasReal = false
    console.warn('[web-search] NO API KEY CONFIGURED — SERPER_API_KEY, BRAVE_SEARCH_API_KEY, or SERP_API_KEY required')
    return {
      content: `[Search unavailable — no search API key configured]
The user asked about: "${query}"
Do NOT generate new factual data from model memory. Either rely on fresh knowledge-base evidence or stop and report that verified web search is unavailable.`,
      results: [],
      real: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search error'
    lastSearchWasReal = false
    console.error(`[web-search] Search failed: ${message}`)
    return {
      content: `[Search failed: ${message}]
Do NOT generate new factual data from model memory. Either rely on fresh knowledge-base evidence or stop and report that verified web search failed.`,
      results: [],
      real: false,
    }
  }
}

export async function executeImageSearchDetailed(query: string): Promise<ImageSearchExecution> {
  try {
    const serperKey = process.env.SERPER_API_KEY
    if (serperKey) {
      const results = await serperImageSearch(query, serperKey)
      if (results.length > 0) {
        return {
          content: formatImageResults(query, results),
          results,
          real: true,
        }
      }
    }

    const serpKey = process.env.SERP_API_KEY
    if (serpKey) {
      const results = await serpImageSearch(query, serpKey)
      if (results.length > 0) {
        return {
          content: formatImageResults(query, results),
          results,
          real: true,
        }
      }
    }

    const webResults = await executeWebSearchDetailed(query)
    if (webResults.results.length > 0) {
      const fallbackResults = await extractPreviewImages(webResults.results)
      if (fallbackResults.length > 0) {
        return {
          content: formatImageResults(query, fallbackResults),
          results: fallbackResults,
          real: webResults.real,
        }
      }
    }

    return {
      content: `[Image search could not find grounded images for: "${query}"]
Do NOT invent or fabricate images. If no acceptable sourced image exists, choose a non-image layout family instead.`,
      results: [],
      real: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown image search error'
    return {
      content: `[Image search failed: ${message}]
Do NOT invent or fabricate images. If grounded images are unavailable, choose a non-image layout family instead.`,
      results: [],
      real: false,
    }
  }
}

async function serperSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetchWithTimeout('https://google.serper.dev/search', {
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

  return organic.slice(0, 5).map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet ?? '',
  }))
}

async function serperImageSearch(query: string, apiKey: string): Promise<ImageSearchResult[]> {
  const response = await fetchWithTimeout('https://google.serper.dev/images', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 5 }),
  })

  if (!response.ok) {
    throw new Error(`Serper.dev image API returned ${response.status}: ${await response.text().catch(() => '')}`)
  }

  const data = await response.json()
  const images = (data.images ?? []) as Array<Record<string, unknown>>

  return images
    .map((result) => ({
      title: stringOrFallback(result.title, 'Untitled image'),
      url: stringOrFallback(result.link, stringOrFallback(result.sourceUrl, '')),
      snippet: stringOrFallback(result.snippet, stringOrFallback(result.source, '')),
      imageUrl: stringOrFallback(result.imageUrl, stringOrFallback(result.thumbnailUrl, '')),
    }))
    .filter((result) => Boolean(result.url && result.imageUrl))
    .slice(0, 5)
}

async function braveSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '5')

  const response = await fetchWithTimeout(url.toString(), {
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

  return (data.web?.results ?? []).slice(0, 5).map((result: SearchResult) => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet ?? '',
  }))
}

async function serpSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('q', query)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('num', '5')

  const response = await fetchWithTimeout(url.toString())

  if (!response.ok) {
    throw new Error(`SerpAPI returned ${response.status}`)
  }

  const data = await response.json()
  const organic = data.organic_results ?? []

  return organic.slice(0, 5).map((result: { title: string; link: string; snippet: string }) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet ?? '',
  }))
}

async function serpImageSearch(query: string, apiKey: string): Promise<ImageSearchResult[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google_images')
  url.searchParams.set('q', query)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('ijn', '0')

  const response = await fetchWithTimeout(url.toString())

  if (!response.ok) {
    throw new Error(`SerpAPI images returned ${response.status}`)
  }

  const data = await response.json()
  const images = (data.images_results ?? []) as Array<Record<string, unknown>>

  return images
    .map((result) => ({
      title: stringOrFallback(result.title, 'Untitled image'),
      url: stringOrFallback(result.link, stringOrFallback(result.source, '')),
      snippet: stringOrFallback(result.snippet, stringOrFallback(result.source, '')),
      imageUrl: stringOrFallback(result.original, stringOrFallback(result.thumbnail, '')),
    }))
    .filter((result) => Boolean(result.url && result.imageUrl))
    .slice(0, 5)
}

async function extractPreviewImages(results: SearchResult[]): Promise<ImageSearchResult[]> {
  const previews = await Promise.all(
    results.slice(0, 4).map(async (result) => {
      try {
        const response = await fetch(result.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InfographediaBot/1.0)',
          },
          signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        })

        if (!response.ok) return null
        const html = await response.text()
        const imageUrl = extractMetaImage(result.url, html)
        if (!imageUrl) return null

        return {
          ...result,
          imageUrl,
        }
      } catch {
        return null
      }
    }),
  )

  return previews.filter((preview): preview is ImageSearchResult => Boolean(preview))
}

async function fetchWithTimeout(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  })
}

function extractMetaImage(pageUrl: string, html: string): string | null {
  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ]

  for (const pattern of metaPatterns) {
    const match = html.match(pattern)
    const candidate = match?.[1]?.trim()
    if (!candidate) continue

    try {
      return new URL(candidate, pageUrl).toString()
    } catch {
      continue
    }
  }

  return null
}

function formatResults(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`
  }

  const formatted = results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\n    URL: ${result.url}\n    ${result.snippet}`,
    )
    .join('\n\n')

  return `Search results for: "${query}"\n\n${formatted}`
}

function formatImageResults(query: string, results: ImageSearchResult[]): string {
  if (results.length === 0) {
    return `No grounded image results found for: "${query}"`
  }

  const formatted = results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\n    Source page: ${result.url}\n    Image: ${result.imageUrl}\n    ${result.snippet}`,
    )
    .join('\n\n')

  return `Grounded image results for: "${query}"\n\n${formatted}`
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}
