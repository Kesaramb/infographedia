import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { InfographicDNA } from './schema'
import type { RenderProfile } from './rendering'

export function fitDNAToBudget(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
): InfographicDNA {
  const copyFitted = fitCopyToBudget(dna, renderProfile)
  const maxPoints = renderProfile.maxDataPoints[copyFitted.presentation.chartType]

  return {
    ...copyFitted,
    content: {
      ...copyFitted.content,
      data: fitDataPoints(copyFitted, maxPoints, renderProfile.maxLabelLength),
      sources: copyFitted.content.sources.slice(0, renderProfile.maxSources),
      media: copyFitted.content.media.slice(0, renderProfile.maxMediaItems).map((item) => ({
        ...item,
        alt: fitField(item.alt, 180),
        caption: fitOptionalField(item.caption, renderProfile.maxMediaCaptionChars),
        relevance: fitField(item.relevance, renderProfile.maxRelevanceChars),
      })),
    },
  }
}

export function fitCopyToBudget(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
): InfographicDNA {
  return {
    ...dna,
    content: {
      ...dna.content,
      title: fitField(dna.content.title, renderProfile.titleCharsPerLine * renderProfile.maxTitleLines),
      subtitle: fitOptionalField(dna.content.subtitle, renderProfile.subtitleCharsPerLine * renderProfile.maxSubtitleLines),
      hook: fitOptionalField(dna.content.hook, renderProfile.hookCharsPerLine * renderProfile.maxHookLines),
      footnotes: fitOptionalField(dna.content.footnotes, renderProfile.footnoteCharsPerLine * renderProfile.maxFootnoteLines),
    },
  }
}

export function fitAntVCopyToBudget(
  document: InfographicDocumentV2,
  renderProfile: RenderProfile,
): InfographicDocumentV2 {
  return {
    ...document,
    content: {
      ...document.content,
      title: fitField(document.content.title, renderProfile.titleCharsPerLine * renderProfile.maxTitleLines),
      subtitle: fitOptionalField(document.content.subtitle, renderProfile.subtitleCharsPerLine * renderProfile.maxSubtitleLines),
      hook: fitOptionalField(document.content.hook, renderProfile.hookCharsPerLine * renderProfile.maxHookLines),
      caveats: document.content.caveats.map((caveat) =>
        fitField(caveat, Math.min(140, renderProfile.footnoteCharsPerLine * 2)),
      ),
      footnotes: fitOptionalField(document.content.footnotes, renderProfile.footnoteCharsPerLine * renderProfile.maxFootnoteLines),
    },
  }
}

function fitOptionalField(value: string | undefined, maxChars: number): string | undefined {
  if (!value?.trim()) return undefined
  return fitField(value, maxChars)
}

function fitDataPoints(
  dna: InfographicDNA,
  maxPoints: number,
  maxLabelLength: number,
): InfographicDNA['content']['data'] {
  const limitedData = selectDataSubset(dna, maxPoints)

  return limitedData.map((point) => ({
    ...point,
    label: fitField(point.label, maxLabelLength),
  }))
}

function selectDataSubset(
  dna: InfographicDNA,
  maxPoints: number,
): InfographicDNA['content']['data'] {
  if (dna.content.data.length <= maxPoints) {
    return dna.content.data
  }

  switch (dna.presentation.chartType) {
    case 'timeline':
    case 'line-chart':
    case 'area-chart':
      return dna.content.data.slice(-maxPoints)
    case 'stat-card':
      return dna.content.data.slice(0, 1)
    default:
      return dna.content.data.slice(0, maxPoints)
  }
}

function fitField(value: string, maxChars: number): string {
  const normalized = normalizeWhitespace(value)
  if (normalized.length <= maxChars) return normalized

  const sentenceCut = cutAtSentence(normalized, maxChars)
  if (sentenceCut.length <= maxChars) return sentenceCut

  const clauseCut = cutAtClause(normalized, maxChars)
  if (clauseCut.length <= maxChars) return clauseCut

  return cutAtWord(normalized, maxChars)
}

function cutAtSentence(text: string, maxChars: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/)
  let result = ''

  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence
    if (candidate.length > maxChars) break
    result = candidate
  }

  return result || cutAtClause(text, maxChars)
}

function cutAtClause(text: string, maxChars: number): string {
  const clauses = text.split(/(?<=[,;:])\s+/)
  let result = ''

  for (const clause of clauses) {
    const candidate = result ? `${result} ${clause}` : clause
    if (candidate.length > maxChars) break
    result = candidate
  }

  return result || cutAtWord(text, maxChars)
}

function cutAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text

  const suffix = '…'
  const limit = Math.max(8, maxChars - suffix.length)
  const candidate = text.slice(0, limit)
  const wordSafe = candidate.replace(/\s+\S*$/, '').trim()

  return `${(wordSafe || candidate).trim()}${suffix}`
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
