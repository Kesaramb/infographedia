import { getPayload } from 'payload'
import config from '@payload-config'
import type {
  ChartTypeValue,
  HeroBlockValue,
  InfographicDNA,
  LayoutFamilyValue,
  MediaKindValue,
  MediaUsageValue,
  VisualDensityValue,
} from '@/lib/dna/schema'
import type { AIConfig } from './config'
import { executeImageSearchDetailed, type ImageSearchResult } from './search'
import { isReadableScanMedia } from '@/lib/dna/media'

interface RecentUsage {
  layoutFamily: LayoutFamilyValue
  heroBlock: HeroBlockValue
  chartType: ChartTypeValue
}

export interface PlannedMediaCandidate {
  id: string
  kind: MediaKindValue
  usage: MediaUsageValue
  url: string
  alt: string
  caption?: string
  sourceName: string
  sourceUrl: string
  accessedAt: string
  relevance: string
  contextLabel?: string
}

export interface SuccessModePlan {
  socialCurrency: string
  unexpected: string
  credibility: string
  concreteness: string
  emotion: string
  story: string
}

export interface DiversityPlan {
  layoutFamily: LayoutFamilyValue
  heroBlock: HeroBlockValue
  chartType: ChartTypeValue
  visualDensity: VisualDensityValue
  successMode: SuccessModePlan
  mediaCandidates: PlannedMediaCandidate[]
  imageSearchQueries: string[]
  recentUsageSummary: string
}

interface TopicSignals {
  isMapHeavy: boolean
  isTimeSeries: boolean
  isDocumentHeavy: boolean
  isPersonFocused: boolean
  isReportLike: boolean
  isRanking: boolean
  isShareBreakdown: boolean
  isSingleStat: boolean
}

const NON_LEGACY_FAMILIES: LayoutFamilyValue[] = [
  'editorial-cover',
  'spotlight-rail',
  'evidence-board',
  'briefing-sheet',
]

export async function planInfographic(
  prompt: string,
  aiConfig: AIConfig,
  parentDNA?: InfographicDNA,
): Promise<DiversityPlan> {
  const recentUsage = aiConfig.enableDiversityPlanner ? await getRecentUsageHints() : []
  const topicSignals = analyzePrompt(prompt, parentDNA)
  const chartType = chooseChartType(prompt, aiConfig, parentDNA, topicSignals)
  const candidateFamilies = chooseLayoutFamilies(topicSignals, chartType, aiConfig.allowedLayoutFamilies)
  const layoutFamily = aiConfig.enableDiversityPlanner
    ? pickLeastUsed(candidateFamilies, recentUsage.map((item) => item.layoutFamily)) ?? candidateFamilies[0] ?? 'editorial-cover'
    : candidateFamilies[0] ?? 'editorial-cover'
  const visualDensity = chooseVisualDensity(chartType, topicSignals)
  const successMode = buildSuccessModePlan(prompt, topicSignals, chartType, layoutFamily)

  let heroBlock = chooseHeroBlock(layoutFamily, chartType, topicSignals, aiConfig.enableGroundedMedia)
  let mediaCandidates: PlannedMediaCandidate[] = []
  let imageSearchQueries: string[] = []

  if (aiConfig.enableGroundedMedia && heroBlock !== 'chart' && heroBlock !== 'stat-card') {
    const mediaKind = heroBlock as MediaKindValue
    imageSearchQueries = buildImageQueries(prompt, mediaKind, topicSignals)
    mediaCandidates = await findGroundedMedia(imageSearchQueries, mediaKind, topicSignals)
  }

  if (heroBlock !== 'chart' && heroBlock !== 'stat-card' && mediaCandidates.length === 0) {
    const fallbackFamily = pickLeastUsed(
      candidateFamilies.filter((family) => family !== 'evidence-board'),
      recentUsage.map((item) => item.layoutFamily),
    ) ?? 'spotlight-rail'
    heroBlock = fallbackFamily === 'editorial-cover' && chartType === 'stat-card' ? 'stat-card' : 'chart'
    imageSearchQueries = []
    mediaCandidates = []

    return {
      layoutFamily: fallbackFamily,
      heroBlock,
      chartType,
      visualDensity,
      successMode,
      mediaCandidates,
      imageSearchQueries,
      recentUsageSummary: summarizeRecentUsage(recentUsage),
    }
  }

  return {
    layoutFamily,
    heroBlock,
    chartType,
    visualDensity,
    successMode,
    mediaCandidates,
    imageSearchQueries,
    recentUsageSummary: summarizeRecentUsage(recentUsage),
  }
}

function analyzePrompt(prompt: string, parentDNA?: InfographicDNA): TopicSignals {
  const text = `${prompt} ${parentDNA?.content.title ?? ''} ${parentDNA?.content.subtitle ?? ''}`.toLowerCase()

  return {
    isMapHeavy: includesAny(text, [
      'world map',
      'country map',
      'regional map',
      'choropleth',
      'geographic',
      'geography',
      'regional',
      'map',
    ]),
    isTimeSeries: includesAny(text, ['timeline', 'history', 'historical', 'over time', 'year', 'years', 'trend', 'since']),
    isDocumentHeavy: includesAny(text, ['report', 'filing', 'document', 'court', 'bill', 'law', 'study', 'paper', 'memo', 'scan']),
    isPersonFocused: includesAny(text, ['founder', 'ceo', 'president', 'leader', 'person', 'profile', 'biography', 'portrait']),
    isReportLike: includesAny(text, ['briefing', 'report', 'analysis', 'explainer', 'dossier', 'brief']),
    isRanking: includesAny(text, ['top', 'ranking', 'rank', 'leaderboard', 'dominating', 'biggest']),
    isShareBreakdown: includesAny(text, ['share', 'shares', 'breakdown', 'portion', 'percent', 'percentage', 'distribution']),
    isSingleStat: includesAny(text, ['single stat', 'one number', 'key stat', 'headline number']),
  }
}

function chooseChartType(
  prompt: string,
  aiConfig: AIConfig,
  parentDNA: InfographicDNA | undefined,
  signals: TopicSignals,
): ChartTypeValue {
  const lower = prompt.toLowerCase()
  const allowed = new Set(aiConfig.allowedChartTypes as ChartTypeValue[])
  const preferred = parentDNA?.presentation.chartType

  const orderedCandidates: ChartTypeValue[] = []

  const explicitChartType = detectExplicitChartType(lower)
  if (explicitChartType) {
    orderedCandidates.push(explicitChartType)
  }

  if (includesAny(lower, ['ranking', 'ranked', 'leaderboard']) && !includesAny(lower, ['map', 'timeline', 'line chart', 'area chart'])) {
    orderedCandidates.push('bar-chart')
  }

  if (signals.isMapHeavy) orderedCandidates.push('map-chart')
  if (signals.isTimeSeries) orderedCandidates.push('timeline', 'line-chart', 'area-chart')
  if (signals.isSingleStat) orderedCandidates.push('stat-card')
  if (includesAny(lower, ['compare', 'versus', 'vs ', 'head-to-head'])) orderedCandidates.push('vs-split')
  if (includesAny(lower, ['grouped', 'by year', 'by segment', 'by category'])) orderedCandidates.push('grouped-bar-chart')
  if (signals.isShareBreakdown) orderedCandidates.push('donut-chart', 'pie-chart')
  if (includesAny(lower, ['pictogram', 'icons', 'out of'])) orderedCandidates.push('pictogram')
  if (preferred) orderedCandidates.push(preferred)
  orderedCandidates.push('bar-chart', 'line-chart', 'stat-card')

  return orderedCandidates.find((candidate) => allowed.has(candidate)) ?? 'bar-chart'
}

function detectExplicitChartType(prompt: string): ChartTypeValue | null {
  if (includesAny(prompt, ['grouped bar chart', 'stacked bar chart'])) return 'grouped-bar-chart'
  if (includesAny(prompt, ['bar chart', 'bar graph', 'ranking bar'])) return 'bar-chart'
  if (includesAny(prompt, ['line chart', 'line graph', 'trend line'])) return 'line-chart'
  if (includesAny(prompt, ['area chart', 'area graph'])) return 'area-chart'
  if (includesAny(prompt, ['timeline'])) return 'timeline'
  if (includesAny(prompt, ['stat card', 'single stat', 'headline stat', 'big number'])) return 'stat-card'
  if (includesAny(prompt, ['donut chart', 'donut'])) return 'donut-chart'
  if (includesAny(prompt, ['pie chart', 'pie'])) return 'pie-chart'
  if (includesAny(prompt, ['pictogram', 'icons'])) return 'pictogram'
  if (includesAny(prompt, ['versus', 'vs ', 'head-to-head'])) return 'vs-split'
  if (includesAny(prompt, ['world map', 'regional map', 'country map', 'choropleth', 'map chart'])) return 'map-chart'

  return null
}

function chooseLayoutFamilies(
  signals: TopicSignals,
  chartType: ChartTypeValue,
  allowedLayoutFamilies: LayoutFamilyValue[],
): LayoutFamilyValue[] {
  const allowed = allowedLayoutFamilies.filter((family) => NON_LEGACY_FAMILIES.includes(family))

  const candidates: LayoutFamilyValue[] = []

  if (signals.isDocumentHeavy) {
    candidates.push('evidence-board', 'briefing-sheet')
  }

  if (signals.isMapHeavy || chartType === 'map-chart' || chartType === 'timeline') {
    candidates.push('briefing-sheet')
  }

  if (signals.isRanking) {
    candidates.push('spotlight-rail')
  }

  if (signals.isPersonFocused || chartType === 'stat-card') {
    candidates.push('editorial-cover')
  }

  candidates.push('spotlight-rail', 'editorial-cover', 'briefing-sheet', 'evidence-board')

  return dedupe(candidates).filter((family) => allowed.includes(family))
}

function chooseHeroBlock(
  layoutFamily: LayoutFamilyValue,
  chartType: ChartTypeValue,
  signals: TopicSignals,
  enableGroundedMedia: boolean,
): HeroBlockValue {
  if (!enableGroundedMedia) {
    return chartType === 'stat-card' ? 'stat-card' : 'chart'
  }

  switch (layoutFamily) {
    case 'evidence-board':
      return signals.isDocumentHeavy ? 'scan-card' : 'annotated-image'
    case 'briefing-sheet':
      if (signals.isMapHeavy || signals.isDocumentHeavy) return 'annotated-image'
      return 'chart'
    case 'editorial-cover':
      if (signals.isPersonFocused) return 'hero-image'
      return chartType === 'stat-card' ? 'stat-card' : 'chart'
    case 'spotlight-rail':
    default:
      return chartType === 'stat-card' ? 'stat-card' : 'chart'
  }
}

function chooseVisualDensity(
  chartType: ChartTypeValue,
  signals: TopicSignals,
): VisualDensityValue {
  if (chartType === 'map-chart' || chartType === 'timeline' || signals.isDocumentHeavy || signals.isReportLike) {
    return 'dense'
  }

  if (chartType === 'stat-card' || signals.isPersonFocused) {
    return 'minimal'
  }

  return 'balanced'
}

function buildSuccessModePlan(
  prompt: string,
  signals: TopicSignals,
  chartType: ChartTypeValue,
  layoutFamily: LayoutFamilyValue,
): SuccessModePlan {
  const lower = prompt.toLowerCase()
  const isPublicImpactTopic = includesAny(lower, [
    'cost',
    'price',
    'housing',
    'rent',
    'food',
    'job',
    'jobs',
    'salary',
    'income',
    'health',
    'war',
    'death',
    'safety',
    'crime',
    'climate',
    'pollution',
    'education',
    'tax',
    'debt',
    'traffic',
    'energy',
  ])

  return {
    socialCurrency: buildSocialCurrencyAngle(signals, chartType),
    unexpected: buildUnexpectedAngle(signals, chartType),
    credibility: 'Keep every strong claim visibly anchored to cited numbers, named sources, and only the evidence shown on-card.',
    concreteness: buildConcretenessAngle(signals, chartType),
    emotion: isPublicImpactTopic
      ? 'Tie the facts to everyday stakes like money, safety, health, status, or future opportunity so a general audience instantly feels why it matters.'
      : 'Surface a human stake that ordinary people can feel, such as pride, fear, loss, opportunity, or unfairness, without becoming melodramatic.',
    story: buildStoryAngle(signals, chartType, layoutFamily),
  }
}

function buildSocialCurrencyAngle(
  signals: TopicSignals,
  chartType: ChartTypeValue,
): string {
  if (signals.isRanking || chartType === 'bar-chart' || chartType === 'grouped-bar-chart') {
    return 'Make the takeaway feel share-worthy by spotlighting one memorable leader, laggard, or rank shift people will want to repeat.'
  }

  if (signals.isSingleStat || chartType === 'stat-card') {
    return 'Turn the main number into a conversational flex point: one sharp statistic that feels instantly worth sharing.'
  }

  return 'Give readers one clear, repeatable insight they can quote in a conversation without needing the whole infographic.'
}

function buildUnexpectedAngle(
  signals: TopicSignals,
  chartType: ChartTypeValue,
): string {
  if (signals.isTimeSeries || chartType === 'timeline' || chartType === 'line-chart' || chartType === 'area-chart') {
    return 'Highlight the turning point, reversal, or break in the trend that changes how the audience sees the topic.'
  }

  if (signals.isMapHeavy || chartType === 'map-chart') {
    return 'Use geography to reveal an unexpected hotspot, outlier, or leader that challenges common assumptions.'
  }

  return 'Frame the strongest counterintuitive result or hidden insight so the audience feels they learned something new, not just saw a chart.'
}

function buildConcretenessAngle(
  signals: TopicSignals,
  chartType: ChartTypeValue,
): string {
  if (signals.isMapHeavy || chartType === 'map-chart') {
    return 'Be concrete with place names, visible totals, units, legend clarity, and direct labels so the geography never feels abstract.'
  }

  if (signals.isTimeSeries || chartType === 'timeline' || chartType === 'line-chart' || chartType === 'area-chart') {
    return 'Use real years, visible turning-point values, and concise labels so the audience can track the story without guessing.'
  }

  return 'Prefer specific numbers, units, named entities, and direct labels over vague category wording or generic copy.'
}

function buildStoryAngle(
  signals: TopicSignals,
  chartType: ChartTypeValue,
  layoutFamily: LayoutFamilyValue,
): string {
  if (signals.isTimeSeries || chartType === 'timeline') {
    return 'Structure the infographic like a reveal: setup, turning point, and what changed by the end.'
  }

  if (signals.isRanking || layoutFamily === 'spotlight-rail') {
    return 'Open with the headline winner or surprise, then move down the ranking as supporting proof, and close on the wider implication.'
  }

  if (layoutFamily === 'evidence-board' || layoutFamily === 'briefing-sheet') {
    return 'Create a mini story experience: lead claim, grounded proof, then a short implication that leaves the reader with a clear conclusion.'
  }

  return 'The infographic should read like a short story, not a fact dump: one setup, one reveal, one takeaway.'
}

function buildImageQueries(
  prompt: string,
  mediaKind: MediaKindValue,
  signals: TopicSignals,
): string[] {
  const base = prompt.trim()

  switch (mediaKind) {
    case 'scan-card':
      return [
        `${base} official report PDF page`,
        `${base} filing document screenshot`,
      ]
    case 'annotated-image':
      return signals.isMapHeavy
        ? [`${base} map satellite image`, `${base} regional map graphic`]
        : [`${base} diagram image`, `${base} annotated photo`]
    case 'hero-image':
    default:
      return [`${base} official photo`, `${base} source image`]
  }
}

async function findGroundedMedia(
  queries: string[],
  mediaKind: MediaKindValue,
  signals: TopicSignals,
): Promise<PlannedMediaCandidate[]> {
  const accessedAt = new Date().toISOString().slice(0, 10)
  const candidates: PlannedMediaCandidate[] = []

  for (const query of queries) {
    const imageResults = await executeImageSearchDetailed(query)
    if (imageResults.results.length === 0) continue

    const mappedCandidates = imageResults.results
      .slice(0, mediaKind === 'hero-image' ? 1 : 2)
      .map((result, index) =>
        mapImageResultToCandidate(result, {
          index,
          kind: mediaKind,
          usage: signals.isMapHeavy && mediaKind !== 'scan-card' ? 'context' : 'evidence',
          accessedAt,
        }),
      )
      .filter((candidate) =>
        isReadableScanMedia({
          kind: candidate.kind,
          url: candidate.url,
          alt: candidate.alt,
          caption: candidate.caption,
          relevance: candidate.relevance,
          source: {
            name: candidate.sourceName,
            url: candidate.sourceUrl,
            accessedAt: candidate.accessedAt,
          },
          focusRegion: undefined,
        }),
      )

    candidates.push(...mappedCandidates)

    if (candidates.length > 0) break
  }

  return candidates.slice(0, 2)
}

function mapImageResultToCandidate(
  result: ImageSearchResult,
  options: {
    index: number
    kind: MediaKindValue
    usage: MediaUsageValue
    accessedAt: string
  },
): PlannedMediaCandidate {
  const sourceName = simplifySourceName(result.title, result.url)

  return {
    id: `media-${options.index + 1}`,
    kind: options.kind,
    usage: options.usage,
    url: result.imageUrl,
    alt: result.title,
    caption: result.title,
    sourceName,
    sourceUrl: result.url,
    accessedAt: options.accessedAt,
    relevance: result.snippet || `Grounded visual selected from ${sourceName}.`,
    contextLabel: options.usage === 'context' ? 'Context image' : undefined,
  }
}

async function getRecentUsageHints(): Promise<RecentUsage[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: 12,
      overrideAccess: true,
      sort: '-createdAt',
    })

    return result.docs.flatMap((doc) => {
      const dna = doc.dna as Partial<InfographicDNA> | undefined
      const chartType = dna?.presentation?.chartType
      if (!chartType) return []

      return [{
        layoutFamily: (dna.presentation?.layoutFamily ?? 'legacy') as LayoutFamilyValue,
        heroBlock: (dna.presentation?.heroBlock ?? 'chart') as HeroBlockValue,
        chartType,
      }]
    })
  } catch {
    return []
  }
}

function summarizeRecentUsage(recentUsage: RecentUsage[]): string {
  if (recentUsage.length === 0) {
    return 'No recent diversity history was available.'
  }

  const counts = new Map<string, number>()
  for (const item of recentUsage) {
    const key = `${item.layoutFamily} + ${item.heroBlock} + ${item.chartType}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, count]) => `${key} (${count})`)
    .join(', ')
}

function pickLeastUsed<T extends string>(candidates: T[], recentUsage: T[]): T | undefined {
  if (candidates.length === 0) return undefined

  const counts = new Map<T, number>()
  for (const item of recentUsage) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }

  return [...candidates].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0]
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value))
}

function simplifySourceName(title: string, url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const root = hostname.split('.').slice(0, -1).join(' ')
    return root || title
  } catch {
    return title
  }
}
