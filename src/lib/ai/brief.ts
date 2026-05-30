import type { AIConfig } from './config'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { RenderProfile } from '@/lib/dna/rendering'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { RenderEngineValue } from '@/lib/infographic-engine'

export const REQUESTED_VIEWS = [
  'map',
  'bar',
  'line',
  'area',
  'timeline',
  'compare',
  'list',
  'hierarchy',
  'relation',
  'stat',
  'media',
] as const

export type RequestedView = (typeof REQUESTED_VIEWS)[number]
export type GenerationIntent = 'single-view' | 'multi-view'

export interface GenerationCopyBudget {
  titleLines: number
  subtitleLines: number
  hookLines: number
  footnoteLines: number
  labelLength: number
  maxSources: number
  maxMediaItems: number
}

export interface GenerationBrief {
  engine: 'dna-legacy' | 'antv'
  intent: GenerationIntent
  requestedViews: RequestedView[]
  storyGoal: string
  copyBudget: GenerationCopyBudget
  upgradeFromLegacyParent: boolean
}

const VIEW_MATCHERS: Array<{ view: RequestedView; patterns: string[] }> = [
  { view: 'map', patterns: ['world map', 'choropleth', 'regional map', 'geographic', 'geography', 'map', 'region', 'country'] },
  { view: 'bar', patterns: ['stacked bar chart', 'grouped bar chart', 'bar chart', 'bars', 'bar '] },
  { view: 'line', patterns: ['trend line', 'line chart', 'line graph', 'growth line'] },
  { view: 'area', patterns: ['area chart', 'area graph'] },
  { view: 'timeline', patterns: ['timeline', 'chronology', 'history', 'journey', 'roadmap', 'stages', 'step-by-step'] },
  { view: 'compare', patterns: ['versus', 'vs ', 'compare', 'comparison', 'head-to-head'] },
  { view: 'list', patterns: ['leaderboard', 'ranking', 'ranked list', 'top ', 'list'] },
  { view: 'hierarchy', patterns: ['org chart', 'hierarchy', 'taxonomy', 'tree'] },
  { view: 'relation', patterns: ['network', 'relationship', 'relations', 'ecosystem', 'flow diagram'] },
  { view: 'stat', patterns: ['headline stat', 'single stat', 'big number', 'key number', 'stat card'] },
  { view: 'media', patterns: ['photo', 'image', 'document scan', 'scan', 'portrait', 'screenshot'] },
]

const MULTI_VIEW_MARKERS = [
  'alongside',
  'plus',
  'combined with',
  'paired with',
  'together with',
  'map +',
  'chart +',
  'timeline +',
  'compare +',
]

export function buildGenerationBrief(input: {
  prompt: string
  aiConfig: AIConfig
  renderProfile: RenderProfile
  parentDNA?: InfographicDNA
  parentDocumentV2?: InfographicDocumentV2
  parentRenderEngine?: RenderEngineValue
}): GenerationBrief {
  const normalizedPrompt = normalizePrompt(input.prompt)
  const parentRenderEngine = input.parentRenderEngine === 'antv' ? 'antv' : 'dna-legacy'
  const requestedViews = detectRequestedViews(normalizedPrompt)
  const intent = detectIntent(normalizedPrompt, requestedViews)
  const upgradeFromLegacyParent =
    Boolean(input.parentDNA) &&
    parentRenderEngine === 'dna-legacy' &&
    intent === 'multi-view'

  const engine = chooseEngine({
    aiConfig: input.aiConfig,
    intent,
    parentRenderEngine,
    hasAntVParent: Boolean(input.parentDocumentV2 && parentRenderEngine === 'antv'),
  })

  return {
    engine,
    intent,
    requestedViews,
    storyGoal: buildStoryGoal(normalizedPrompt),
    copyBudget: {
      titleLines: input.renderProfile.maxTitleLines,
      subtitleLines: input.renderProfile.maxSubtitleLines,
      hookLines: input.renderProfile.maxHookLines,
      footnoteLines: input.renderProfile.maxFootnoteLines,
      labelLength: input.renderProfile.maxLabelLength,
      maxSources: input.renderProfile.maxSources,
      maxMediaItems: input.renderProfile.maxMediaItems,
    },
    upgradeFromLegacyParent,
  }
}

function chooseEngine(input: {
  aiConfig: AIConfig
  intent: GenerationIntent
  parentRenderEngine: 'dna-legacy' | 'antv'
  hasAntVParent: boolean
}): GenerationBrief['engine'] {
  if (input.hasAntVParent) return 'antv'

  if (input.aiConfig.enableEngineRouter) {
    if (input.intent === 'multi-view' && input.aiConfig.enableMultiPanelAntV) {
      return 'antv'
    }

    if (input.parentRenderEngine === 'antv') {
      return 'antv'
    }
  }

  if (
    input.aiConfig.enableAntVGenerator &&
    input.parentRenderEngine !== 'dna-legacy'
  ) {
    return 'antv'
  }

  if (input.aiConfig.enableAntVGenerator && input.aiConfig.defaultNewPostEngine === 'antv') {
    return 'antv'
  }

  return 'dna-legacy'
}

function detectRequestedViews(prompt: string): RequestedView[] {
  const ranked = VIEW_MATCHERS
    .map(({ view, patterns }) => ({
      view,
      index: firstMatchIndex(prompt, patterns),
    }))
    .filter((item): item is { view: RequestedView; index: number } => item.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (ranked.length === 0) {
    return inferFallbackViews(prompt)
  }

  return dedupe(ranked.map((item) => item.view))
}

function detectIntent(prompt: string, requestedViews: RequestedView[]): GenerationIntent {
  const concreteViews = requestedViews.filter((view) =>
    ['map', 'bar', 'line', 'area', 'timeline', 'media'].includes(view),
  )

  if (concreteViews.length >= 2) return 'multi-view'

  const hasMarker = MULTI_VIEW_MARKERS.some((marker) => prompt.includes(marker))
  if (hasMarker && requestedViews.length >= 2) {
    return 'multi-view'
  }

  return 'single-view'
}

function buildStoryGoal(prompt: string): string {
  const cleaned = prompt
    .replace(/^(create|design|make|generate)\s+(an?\s+)?infographic\s+(about|showing|with|for)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.slice(0, 220)
}

function inferFallbackViews(prompt: string): RequestedView[] {
  if (/\b(201\d|202\d)\b/.test(prompt) || prompt.includes('trend') || prompt.includes('over time')) {
    return ['line']
  }

  if (prompt.includes('map')) {
    return ['map']
  }

  if (prompt.includes('timeline')) {
    return ['timeline']
  }

  if (prompt.includes('compare') || prompt.includes('vs ')) {
    return ['compare']
  }

  return ['bar']
}

function firstMatchIndex(text: string, patterns: string[]): number {
  let best = Number.POSITIVE_INFINITY

  for (const pattern of patterns) {
    const index = text.indexOf(pattern)
    if (index >= 0) {
      best = Math.min(best, index)
    }
  }

  return Number.isFinite(best) ? best : -1
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, ' ').trim()
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)]
}
