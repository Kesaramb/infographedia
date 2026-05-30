import type { AIConfig } from '@/lib/ai/config'
import { executeImageSearchDetailed, executeWebSearchDetailed } from '@/lib/ai/search'
import { searchKnowledgeDetailed } from '@/lib/knowledge/search'
import type { KnowledgeSearchResult } from '@/lib/knowledge/types'
import type { MediaItem, MediaKindValue } from '@/lib/dna/schema'
import type { StoryIntakePlan } from './intake'
import { resolveStorySceneFamilyToMediaKind } from './schema'

export interface StoryEvidencePacket {
  searchQueries: string[]
  support: Array<{
    id: string
    title: string
    url: string
    snippet: string
    sourceName: string
    query: string
    kind: 'knowledge' | 'web' | 'image'
    freshness: 'fresh' | 'stale' | 'unknown'
  }>
  sources: Array<{
    name: string
    url: string
    accessedAt: string
  }>
  media: MediaItem[]
  hasGrounding: boolean
}

export async function retrieveStoryEvidence(
  intake: StoryIntakePlan,
  aiConfig: AIConfig,
  options?: {
    preferredSceneFamily?: Parameters<typeof resolveStorySceneFamilyToMediaKind>[0]
  },
): Promise<StoryEvidencePacket> {
  const searchQueries = buildUniqueQueries(intake)
  const queryResults = await Promise.all(
    searchQueries.map(async (query) => {
      const [kb, web] = await Promise.all([
        aiConfig.enableKnowledgeBase ? searchKnowledgeDetailed(query, 4) : Promise.resolve(null),
        aiConfig.enableWebSearch ? executeWebSearchDetailed(query) : Promise.resolve(null),
      ])

      return { query, kb, web }
    }),
  )

  const pageSupport = shouldEnrichFromPages(intake)
    ? await fetchRankingPageSupport(queryResults)
    : []

  let hasGrounding = false
  let supportIndex = 0
  const support = queryResults.flatMap(({ query, kb, web }) => {
    const querySupport: StoryEvidencePacket['support'] = []

    if (kb) {
      if (kb.hasFreshResults) hasGrounding = true
      querySupport.push(
        ...kb.results.slice(0, 3).map((result, index) =>
          toSupportRecord(
            result,
            query,
            `kb-${supportIndex + index + 1}`,
            kb.hasFreshResults ? 'fresh' : 'stale',
            'knowledge',
          ),
        ),
      )
      supportIndex += kb.results.slice(0, 3).length
    }

    if (web) {
      if (web.real && web.results.length > 0) hasGrounding = true
      querySupport.push(
        ...web.results.slice(0, 3).map((result, index) => ({
          id: `web-${supportIndex + index + 1}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          sourceName: safeHostname(result.url),
          query,
          kind: 'web' as const,
          freshness: (web.real ? 'fresh' : 'unknown') as 'fresh' | 'unknown',
        })),
      )
      supportIndex += web.results.slice(0, 3).length
    }

    return querySupport
  })
    .concat(pageSupport.map((item, index) => ({
      ...item,
      id: `page-${supportIndex + index + 1}`,
    })))

  const dedupedSupport = dedupeSupport(support).slice(0, 12)
  const dedupedSources = dedupeSources(
    dedupedSupport.map((item) => ({
      name: item.sourceName,
      url: item.url,
      accessedAt: todayISO(),
    })),
  ).slice(0, 8)

  const preferredMediaKind = resolveStorySceneFamilyToMediaKind(options?.preferredSceneFamily ?? 'single-focus')
  const media = aiConfig.enableGroundedMedia && preferredMediaKind
    ? await retrieveOptionalMedia(searchQueries[0] ?? intake.topic, preferredMediaKind)
    : []

  return {
    searchQueries,
    support: dedupedSupport,
    sources: dedupedSources,
    media,
    hasGrounding,
  }
}

function buildUniqueQueries(intake: StoryIntakePlan): string[] {
  const queries: string[] = []
  const topicVariants = buildTopicVariants(intake)
  const topCount = extractRequestedTopCount(intake.prompt)
  const rankingViews = intake.requestedViews.some((view) => ['bar', 'list', 'compare', 'hierarchy', 'relation'].includes(view))
  const trendViews = intake.requestedViews.some((view) => ['timeline', 'line', 'area'].includes(view))
  const mapViews = intake.requestedViews.includes('map')

  if (rankingViews && isDatabaseTopic(intake.topic)) {
    queries.push('DB-Engines ranking latest')
    queries.push('database management systems popularity ranking latest')
    queries.push(`top ${topCount} database management systems latest`)
  }

  for (const topic of topicVariants) {
    pushUniqueQuery(queries, `${topic} latest statistics`)

    if (mapViews) {
      pushUniqueQuery(queries, `${topic} by country latest`)
    }

    if (trendViews) {
      pushUniqueQuery(queries, `${topic} trend by year latest`)
    }

    if (rankingViews) {
      pushUniqueQuery(queries, `${topic} ranking latest`)
      pushUniqueQuery(queries, `${topic} popularity ranking latest`)
      pushUniqueQuery(queries, `top ${topCount} ${topic} latest`)
    }
  }

  return queries.slice(0, 6)
}

function buildTopicVariants(intake: StoryIntakePlan): string[] {
  const variants: string[] = []
  const topic = intake.topic.trim()
  const baseTopic = topic.replace(/^top\s+\d{1,2}\s+/i, '').trim()

  if (baseTopic) {
    pushVariant(variants, baseTopic)
  }

  const cleaned = baseTopic
    .replace(/\btheir data in the tech world\b/gi, '')
    .replace(/\bin the tech world\b/gi, '')
    .replace(/\btheir data\b/gi, '')
    .replace(/\s+and\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned) {
    pushVariant(variants, cleaned)
  }

  if (isDatabaseTopic(topic)) {
    pushVariant(variants, cleaned.replace(/\bdatabase types?\b/gi, 'database management systems').trim())
    pushVariant(variants, 'database management systems')
    pushVariant(variants, 'database technologies')
  }

  if (/\buniversit(y|ies)\b/i.test(topic)) {
    pushVariant(variants, cleaned.replace(/\bbest universities ever\b/gi, 'universities').trim())
    pushVariant(variants, 'universities ranking')
  }

  return variants
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function pushVariant(variants: string[], value: string): void {
  if (!value) return
  if (!variants.includes(value)) variants.push(value)
}

function pushUniqueQuery(queries: string[], value: string): void {
  if (!value) return
  if (!queries.includes(value)) queries.push(value)
}

function extractRequestedTopCount(prompt: string): number {
  const match = prompt.match(/\btop\s+(\d{1,2})\b/i)
  if (!match) return 10
  const count = Number(match[1])
  return Number.isFinite(count) && count > 1 && count <= 20 ? count : 10
}

function isDatabaseTopic(topic: string): boolean {
  return /\bdatabase(s)?\b/i.test(topic)
}

function shouldEnrichFromPages(intake: StoryIntakePlan): boolean {
  return intake.requestedViews.some((view) => ['bar', 'list', 'compare', 'hierarchy', 'relation'].includes(view))
}

async function fetchRankingPageSupport(
  queryResults: Array<{
    query: string
    kb: Awaited<ReturnType<typeof searchKnowledgeDetailed>> | null
    web: Awaited<ReturnType<typeof executeWebSearchDetailed>> | null
  }>,
): Promise<StoryEvidencePacket['support']> {
  const candidates = queryResults
    .flatMap(({ query, web }) => (web?.real ? web.results.slice(0, 2).map((result) => ({ query, ...result })) : []))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index)
    .slice(0, 4)

  const extracted = await Promise.all(candidates.map((candidate) => fetchPageEvidence(candidate.url)))

  return extracted
    .map((page, index) => {
      const candidate = candidates[index]
      if (!page || !candidate) return null

      return {
        id: `page-${index + 1}`,
        title: page.title || candidate.title,
        url: candidate.url,
        snippet: page.snippet,
        sourceName: safeHostname(candidate.url),
        query: candidate.query,
        kind: 'web' as const,
        freshness: 'fresh' as const,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

async function fetchPageEvidence(
  url: string,
): Promise<{ title: string; snippet: string } | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InfographediaBot/1.0; +https://infographedia.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    }, 8000)

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null

    const html = await response.text()
    const title = extractTagContent(html, 'title') ?? ''
    const metaDescription = extractMetaDescription(html)
    const rankedSnippet = extractRankedSnippetFromPageText(sanitizeInlineText(html))
    const listItems = extractListItems(html)
    const snippet = [rankedSnippet, metaDescription, ...listItems]
      .filter(Boolean)
      .join('; ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 320)

    if (!snippet || snippet.length < 40) return null

    return { title: sanitizeInlineText(title).slice(0, 160), snippet }
  } catch {
    return null
  }
}

function extractRankedSnippetFromPageText(text: string): string {
  const tableStyleMatches = [...text.matchAll(/(?:^|\s)(\d{1,2})\.\s+\d{1,2}\.\s+\d{1,2}\.\s+([A-Za-z][A-Za-z0-9+#&'()\/ -]{1,60}?)\s+(?:(?!\d{1,2}\.\s+\d{1,2}\.\s+\d{1,2}\.).){0,220}?(\d{1,4}\.\d{2})\s+[+-]\d+\.\d{2}\s+[+-]\d+\.\d{2}/g)]
    .slice(0, 10)
    .map((match) => ({
      rank: Number(match[1]),
      label: sanitizeInlineText(match[2]),
      value: sanitizeInlineText(match[3]),
    }))
    .filter((match) =>
      Number.isFinite(match.rank)
      && match.rank >= 1
      && match.rank <= 20
      && match.label.length >= 2
      && match.value.length >= 1,
    )

  const matches = (tableStyleMatches.length >= 4 ? tableStyleMatches : [...text.matchAll(/(?:^|\s)(\d{1,2})[\.)]?\s+([A-Za-z][A-Za-z0-9+#&'()\/ -]{1,48}?)\s*,\s*([0-9][0-9,.\s]{0,10}(?:[KMB%])?)/g)])
    .slice(0, 10)
    .map((match) => ('rank' in match
      ? match
      : {
          rank: Number(match[1]),
          label: sanitizeInlineText(match[2]),
          value: sanitizeInlineText(match[3]),
        }))
    .filter((match) =>
      Number.isFinite(match.rank)
      && match.rank >= 1
      && match.rank <= 20
      && match.label.length >= 2
      && match.value.length >= 1,
    )

  if (matches.length < 4) return ''

  return matches
    .map((match) => `${match.rank}. ${match.label}, ${match.value}`)
    .join(' · ')
    .slice(0, 320)
}

function extractTagContent(html: string, tagName: string): string | null {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'))
  return match ? sanitizeInlineText(match[1]) : null
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
  return match ? sanitizeInlineText(match[1]).slice(0, 220) : ''
}

function extractListItems(html: string): string[] {
  const matches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  return matches
    .map((match) => sanitizeInlineText(match[1]))
    .filter((item) => item.length >= 2 && item.length <= 80)
    .filter((item) => !/^(home|about|contact|privacy|terms|sign in|login)$/i.test(item))
    .slice(0, 8)
}

function sanitizeInlineText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = 12000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function toSupportRecord(
  result: KnowledgeSearchResult,
  query: string,
  id: string,
  freshness: 'fresh' | 'stale' | 'unknown',
  kind: 'knowledge' | 'web' | 'image',
) {
  return {
    id,
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    sourceName: safeHostname(result.url),
    query,
    kind,
    freshness,
  }
}

async function retrieveOptionalMedia(
  query: string,
  kind: MediaKindValue,
): Promise<MediaItem[]> {
  if (kind === 'hero-image') {
    return []
  }

  const imageQuery = kind === 'scan-card'
    ? `${query} report chart screenshot`
    : `${query} map photo`
  const result = await executeImageSearchDetailed(imageQuery)
  const first = result.results[0]

  if (!first) return []

  return [
    {
      id: 'media-1',
      kind,
      usage: 'context',
      url: first.imageUrl,
      alt: first.title.slice(0, 180),
      caption: first.title.slice(0, 220),
      source: {
        name: safeHostname(first.url),
        url: first.url,
        accessedAt: todayISO(),
      },
      relevance: first.snippet.slice(0, 220) || 'Contextual visual evidence for the story.',
      contextLabel: 'Context',
      ...(kind === 'scan-card'
        ? {
            focusRegion: {
              x: 0.08,
              y: 0.08,
              width: 0.84,
              height: 0.62,
            },
          }
        : {}),
      ...(kind === 'annotated-image'
        ? {
            annotations: [
              {
                x: 0.5,
                y: 0.25,
                label: 'Context',
              },
            ],
          }
        : {}),
    },
  ]
}

function dedupeSupport(
  support: StoryEvidencePacket['support'],
): StoryEvidencePacket['support'] {
  const deduped = new Map<string, StoryEvidencePacket['support'][number]>()

  for (const item of support) {
    const existing = deduped.get(item.url)
    if (!existing || shouldPreferSupportItem(item, existing)) {
      deduped.set(item.url, item)
    }
  }

  return [...deduped.values()]
}

function dedupeSources(
  sources: StoryEvidencePacket['sources'],
): StoryEvidencePacket['sources'] {
  const seen = new Set<string>()
  const deduped: StoryEvidencePacket['sources'] = []

  for (const source of sources) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    deduped.push(source)
  }

  return deduped
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function shouldPreferSupportItem(
  candidate: StoryEvidencePacket['support'][number],
  existing: StoryEvidencePacket['support'][number],
): boolean {
  const candidateIsPage = candidate.id.startsWith('page-')
  const existingIsPage = existing.id.startsWith('page-')

  if (candidateIsPage !== existingIsPage) {
    return candidateIsPage
  }

  return candidate.snippet.length > existing.snippet.length
}
