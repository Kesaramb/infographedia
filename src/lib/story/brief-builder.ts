import type { StoryDocumentV3Draft } from './schema'
import type { StoryIntakePlan } from './intake'

type StoryDatasetItem = StoryDocumentV3Draft['normalized']['datasets'][number]['items'][number]

export function buildStoryBrief(
  draft: Pick<StoryDocumentV3Draft, 'story' | 'normalized' | 'insights' | 'scene'>,
  intake: StoryIntakePlan,
): StoryDocumentV3Draft['story'] {
  const leadInsight = draft.insights[0]
  const leadDataset = draft.normalized.datasets[0]
  const leadItem = leadDataset?.items[0]
  const secondItem = leadDataset?.items[1]
  const surprisingLabel = leadInsight?.supportingLabels[0] ?? leadItem?.label ?? intake.topic
  const surprisingValue = leadItem?.value
  const surprisingUnit = leadItem?.unit ?? ''
  const storyReferences = [leadItem, secondItem].filter((item): item is StoryDatasetItem => Boolean(item))

  const thesisFallback = buildThesisFallback(intake, surprisingLabel)
  const revealFallback = buildRevealFallback(leadItem, secondItem)

  const thesis = compactSentence(
    sanitizeMetricSentence(draft.story.thesis, storyReferences),
    60,
    thesisFallback,
  )
  const setup = compactSentence(
    sanitizeMetricSentence(draft.story.setup, storyReferences),
    220,
    `${intake.topic} matters because ${intake.humanStake.toLowerCase()}`,
  )
  const reveal = compactSentence(
    sanitizeMetricSentence(draft.story.reveal, storyReferences),
    120,
    revealFallback || (
      typeof surprisingValue === 'number'
        ? `${surprisingLabel} stands out at ${formatValue(surprisingValue)}${surprisingUnit}`
        : `${surprisingLabel} is the unexpected focal point`
    ),
  )
  const takeaway = compactSentence(
    draft.story.takeaway,
    220,
    `The takeaway for the general public is why this matters now: ${intake.humanStake.toLowerCase()}`,
  )

  return {
    thesis,
    setup,
    reveal,
    takeaway,
    socialCurrency: compactSentence(
      draft.story.socialCurrency,
      160,
      `${surprisingLabel} makes this a share-worthy public-facing insight, not just another stat.`,
    ),
    unexpected: compactSentence(
      draft.story.unexpected,
      160,
      `${surprisingLabel} is not where most people expect the story to land.`,
    ),
    emotionalStake: compactSentence(
      draft.story.emotionalStake,
      180,
      intake.humanStake,
    ),
    credibility: compactSentence(
      draft.story.credibility,
      180,
      'Every headline claim is grounded in current visible sources and concrete numbers.',
    ),
    concreteness: compactSentence(
      draft.story.concreteness,
      180,
      typeof surprisingValue === 'number'
        ? `${surprisingLabel} is shown with a concrete value of ${formatValue(surprisingValue)}${surprisingUnit}.`
        : 'The story stays concrete with visible numbers, labels, and sources.',
    ),
  }
}

function compactSentence(value: string | undefined, maxLength: number, fallback: string): string {
  const candidate = normalizeSentence(value || '')
  const fallbackCandidate = normalizeSentence(fallback)

  if (!candidate) {
    return shortenSentence(fallbackCandidate, maxLength)
  }

  if (looksIncompleteSentence(candidate)) {
    return shortenSentence(fallbackCandidate || candidate, maxLength)
  }

  if (candidate.length <= maxLength) return candidate

  const clauses = candidate
    .split(/[,;:.!?]/)
    .map((part) => normalizeSentence(part))
    .filter(Boolean)

  for (const clause of clauses) {
    if (clause.length <= maxLength) return clause
  }

  return shortenSentence(fallbackCandidate || candidate, maxLength)
}

function normalizeSentence(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[“”]/g, '"').trim()
}

function formatValue(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function buildThesisFallback(
  intake: StoryIntakePlan,
  surprisingLabel: string,
): string {
  const topic = intake.topic
    .replace(/^top\s+\d{1,2}\s+/i, '')
    .replace(/\bthe\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return `${surprisingLabel} tops ${topic}`.slice(0, 60)
}

function buildRevealFallback(
  leadItem: StoryDocumentV3Draft['normalized']['datasets'][number]['items'][number] | undefined,
  secondItem: StoryDocumentV3Draft['normalized']['datasets'][number]['items'][number] | undefined,
): string {
  if (!leadItem) return ''

  if (!secondItem) {
    return `${leadItem.label} sits at the top of the latest grounded ranking.`
  }

  return `${leadItem.label} leads the latest grounded ranking, ahead of ${secondItem.label}.`
}

function sanitizeMetricSentence(
  value: string | undefined,
  references: StoryDatasetItem[],
): string | undefined {
  const candidate = normalizeSentence(value || '')
  if (!candidate) return value

  return containsMetricMismatch(candidate, references) ? '' : value
}

function containsMetricMismatch(
  text: string,
  references: StoryDatasetItem[],
): boolean {
  return references.some((reference) => {
    const alias = reference.label?.trim()
    if (!alias || !containsAlias(text, alias)) return false

    const nearbySegment = extractAliasSegment(text, alias)
    if (!/\d/.test(nearbySegment)) return false

    const claimedValue = extractClaimedValue(nearbySegment, alias)
    if (claimedValue) {
      return !matchesClaimedMetric(
        claimedValue.value,
        claimedValue.unit,
        reference.value,
        reference.unit,
      )
    }

    return !includesAllowedValueToken(nearbySegment, reference.value, reference.unit)
  })
}

function extractAliasSegment(text: string, alias: string): string {
  const match = new RegExp(`\\b${escapeRegExp(alias)}\\b[^.!?\\n]{0,48}`, 'i').exec(text)
  return match?.[0] ?? text
}

function includesAllowedValueToken(
  text: string,
  actualValue: number,
  unit?: string,
): boolean {
  const exact = formatValue(actualValue)
  const rounded = Number.isInteger(actualValue)
    ? exact
    : actualValue.toLocaleString('en-US', { maximumFractionDigits: 0 })

  if (text.includes(exact) || text.includes(rounded)) {
    if (!unit) return true
    return text.includes(`${exact}${unit}`) || text.includes(`${rounded}${unit}`)
  }

  return false
}

function extractClaimedValue(
  text: string,
  alias: string,
): { value: number; unit?: string } | null {
  const pattern = new RegExp(
    `\\b${escapeRegExp(alias)}\\b[^.!?\\n]{0,40}?\\b(?:with|at|of|totals?|reaches?|hits?|stands at)\\b\\s*([$€£¥]?\\d[\\d,]*(?:\\.\\d+)?)\\s*([A-Za-z%]+)?`,
    'i',
  )
  const match = text.match(pattern)
  if (!match) return null

  const numeric = Number.parseFloat((match[1] ?? '').replace(/[$€£¥,]/g, ''))
  if (!Number.isFinite(numeric)) return null

  const leadingCurrency = match[1]?.match(/^[$€£¥]/)?.[0]
  const trailingUnit = match[2]?.trim()

  return {
    value: numeric,
    unit: leadingCurrency ?? trailingUnit,
  }
}

function matchesClaimedMetric(
  claimedValue: number,
  claimedUnit: string | undefined,
  actualValue: number,
  actualUnit: string | undefined,
): boolean {
  const normalizedClaimedUnit = claimedUnit?.trim()
  const normalizedActualUnit = actualUnit?.trim()

  if (normalizedClaimedUnit && normalizedActualUnit && normalizedClaimedUnit !== normalizedActualUnit) {
    return false
  }

  const delta = Math.abs(claimedValue - actualValue)
  const tolerance = Math.max(0.5, Math.abs(actualValue) * 0.02)
  return delta <= tolerance
}

function containsAlias(text: string, alias: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i')
  return pattern.test(text)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shortenSentence(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value

  const shortened = value.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return normalizeSentence(boundary > Math.floor(maxLength * 0.6) ? shortened.slice(0, boundary) : shortened)
}

function looksIncompleteSentence(value: string): boolean {
  const normalized = value.trim()
  const lower = normalized.toLowerCase()

  if (!normalized) return true
  if (/[:;,/-]$/.test(normalized)) return true

  return [
    ' and',
    ' or',
    ' but',
    ' because',
    ' with',
    ' of',
    ' for',
    ' to',
    ' in',
    ' at',
    ' by',
    ' have',
    ' has',
    ' had',
    ' is',
    ' are',
  ].some((suffix) => lower.endsWith(suffix))
}
