import { PREVIEW_RENDER_PROFILE, preflightDNA } from '@/lib/dna/rendering'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { StoryDocumentV3 } from './schema'

export interface StoryCriticResult {
  ok: boolean
  score: number
  issues: string[]
}

export function critiqueStoryDocument(
  storyDocument: StoryDocumentV3,
  compatibilityDNA: InfographicDNA,
): StoryCriticResult {
  const issues: string[] = []
  let score = 1

  const preflight = preflightDNA(compatibilityDNA, PREVIEW_RENDER_PROFILE)
  if (!preflight.ok) {
    issues.push(...preflight.errors.map((issue) => issue.message))
    score -= 0.35
  }

  if (!storyDocument.story.unexpected.trim() || storyDocument.story.unexpected.length < 20) {
    issues.push('The story needs a clearer unexpected insight.')
    score -= 0.1
  }

  if (!storyDocument.story.emotionalStake.trim() || storyDocument.story.emotionalStake.length < 20) {
    issues.push('The story needs a stronger human stake.')
    score -= 0.1
  }

  if (!storyDocument.story.socialCurrency.trim() || storyDocument.story.socialCurrency.length < 20) {
    issues.push('The story needs a sharper social-currency angle.')
    score -= 0.08
  }

  if (storyDocument.scene.panels.length > 1 && storyDocument.scene.layout === 'single') {
    issues.push('Multi-panel scenes must not use the single layout.')
    score -= 0.08
  }

  if (!storyDocument.artifacts.svg.trim()) {
    issues.push('The canonical SVG render is missing.')
    score -= 0.2
  }

  if (containsPlaceholderFallback(storyDocument)) {
    issues.push('The story still contains placeholder fallback content instead of grounded results.')
    score -= 0.4
  }

  if (hasTooFewItemsForPrimaryPanel(storyDocument)) {
    issues.push('The primary panel does not have enough grounded items to support the requested chart.')
    score -= 0.2
  }

  if (
    storyDocument.story.thesis.includes('…')
    || storyDocument.story.setup.includes('…')
    || storyDocument.story.reveal.includes('…')
    || storyDocument.story.thesis.includes('...')
    || storyDocument.story.setup.includes('...')
    || storyDocument.story.reveal.includes('...')
  ) {
    issues.push('Copy should be rewritten to fit, not ellipsis-trimmed.')
    score -= 0.15
  }

  return {
    ok: issues.length === 0 && score >= 0.7,
    score: Math.max(0, Number(score.toFixed(2))),
    issues,
  }
}

const PLACEHOLDER_PATTERNS = [
  'awaiting grounded result',
  'grounded summary generated from the evidence packet',
  'the visible evidence supports the headline finding',
  'why it matters now:',
  'is the headline finding',
  'explain why the finding matters to ordinary people',
]

function containsPlaceholderFallback(storyDocument: StoryDocumentV3): boolean {
  const haystack = [
    storyDocument.story.thesis,
    storyDocument.story.setup,
    storyDocument.story.reveal,
    storyDocument.story.takeaway,
    storyDocument.story.unexpected,
    storyDocument.story.concreteness,
    ...storyDocument.normalized.datasets.flatMap((dataset) => [
      dataset.label,
      dataset.summary ?? '',
      ...dataset.items.map((item) => item.label),
    ]),
    ...storyDocument.normalized.claims.map((claim) => claim.statement),
    ...storyDocument.scene.panels.flatMap((panel) => [panel.title ?? '', panel.subtitle ?? '']),
  ]
    .join('\n')
    .toLowerCase()

  return PLACEHOLDER_PATTERNS.some((pattern) => haystack.includes(pattern))
}

function hasTooFewItemsForPrimaryPanel(storyDocument: StoryDocumentV3): boolean {
  const primaryPanel = storyDocument.scene.panels.find((panel) => panel.role === 'primary')
  if (!primaryPanel) return false

  const minimumItemViews = new Set(['bar', 'list', 'compare', 'hierarchy', 'relation'])
  const chartType = primaryPanel.chartType ?? ''

  const needsMultipleItems = minimumItemViews.has(primaryPanel.viewType)
    || chartType === 'bar-chart'
    || chartType === 'grouped-bar-chart'
    || chartType === 'pie-chart'
    || chartType === 'donut-chart'

  if (!needsMultipleItems) return false

  const itemCount = primaryPanel.datasetIds
    .map((datasetId) => storyDocument.normalized.datasets.find((dataset) => dataset.id === datasetId))
    .filter((dataset): dataset is NonNullable<typeof dataset> => Boolean(dataset))
    .reduce((sum, dataset) => sum + dataset.items.length, 0)

  return itemCount < 3
}
