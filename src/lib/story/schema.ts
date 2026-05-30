import { z } from 'zod/v4'
import {
  ChartType,
  DNASchema,
  LayoutFamily,
  MediaItemSchema,
  SourceSchema,
  ThemeName,
  VisualDensity,
  type ChartTypeValue,
  type InfographicDNA,
  type LayoutFamilyValue,
  type MediaKindValue,
  type ThemeNameValue,
  type VisualDensityValue,
} from '@/lib/dna/schema'

export const STORY_DOCUMENT_VERSION = 3 as const

export const STORY_REQUESTED_VIEWS = [
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

export const STORY_INSIGHT_TYPES = [
  'leader',
  'laggard',
  'outlier',
  'reversal',
  'turning-point',
  'concentration',
  'comparison',
  'threshold',
  'distribution',
] as const

export const STORY_ENTITY_TYPES = [
  'country',
  'city',
  'organization',
  'person',
  'product',
  'metric',
  'year',
  'topic',
] as const

export const STORY_SCENE_FAMILIES = [
  'single-focus',
  'ranked-comparison',
  'map-briefing',
  'timeline-briefing',
  'evidence-board',
  'briefing-sheet',
] as const

export const STORY_PANEL_LAYOUTS = [
  'single',
  'split-horizontal',
  'split-vertical',
  'primary-plus-rail',
  'stacked',
] as const

export const STORY_PANEL_ROLES = ['primary', 'support'] as const

export const STORY_PANEL_VIEW_TYPES = STORY_REQUESTED_VIEWS

export const STORY_PANEL_EMPHASIS = ['high', 'medium', 'low'] as const

export const StoryRequestedView = z.enum(STORY_REQUESTED_VIEWS)
export const StoryInsightType = z.enum(STORY_INSIGHT_TYPES)
export const StoryEntityType = z.enum(STORY_ENTITY_TYPES)
export const StorySceneFamily = z.enum(STORY_SCENE_FAMILIES)
export const StoryPanelLayout = z.enum(STORY_PANEL_LAYOUTS)
export const StoryPanelRole = z.enum(STORY_PANEL_ROLES)
export const StoryPanelViewType = z.enum(STORY_PANEL_VIEW_TYPES)
export const StoryPanelEmphasis = z.enum(STORY_PANEL_EMPHASIS)

const StoryEvidenceRecordSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  url: z.string().url(),
  snippet: z.string().max(320),
  sourceName: z.string().min(1).max(120),
  query: z.string().min(1).max(240),
  kind: z.enum(['knowledge', 'web', 'image']),
  freshness: z.enum(['fresh', 'stale', 'unknown']).default('unknown'),
})

const StoryNormalizedMetricSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.number(),
  unit: z.string().max(24).optional(),
  metadata: z.record(z.string(), z.string()).default({}),
})

const StoryDatasetSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  summary: z.string().max(220).optional(),
  viewHint: StoryPanelViewType,
  items: z.array(StoryNormalizedMetricSchema).min(1).max(20),
})

const StoryClaimSchema = z.object({
  id: z.string().min(1).max(64),
  statement: z.string().min(1).max(220),
  sourceIds: z.array(z.string().min(1).max(64)).min(1).max(5),
  datasetIds: z.array(z.string().min(1).max(64)).max(4).default([]),
  confidence: z.enum(['high', 'medium']).default('high'),
})

const StoryEntitySchema = z.object({
  type: StoryEntityType,
  label: z.string().min(1).max(120),
  code: z.string().max(32).optional(),
})

const StoryInsightSchema = z.object({
  id: z.string().min(1).max(64),
  type: StoryInsightType,
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(220),
  datasetId: z.string().min(1).max(64),
  score: z.number().min(0).max(1),
  supportingLabels: z.array(z.string().min(1).max(120)).max(4).default([]),
})

const StoryPanelAnnotationSchema = z.object({
  label: z.string().min(1).max(64),
  detail: z.string().max(140).optional(),
  targetLabel: z.string().max(120).optional(),
})

export const StoryDocumentDraftSchema = z.object({
  version: z.literal(STORY_DOCUMENT_VERSION).default(STORY_DOCUMENT_VERSION),
  intake: z.object({
    prompt: z.string().min(1).max(1000),
    topic: z.string().min(1).max(180),
    audience: z.string().min(1).max(120),
    humanStake: z.string().min(1).max(180),
    requestedViews: z.array(StoryRequestedView).min(1).max(4),
    constraints: z.array(z.string().min(1).max(140)).max(6).default([]),
    iterationMode: z.enum(['new', 'iterate']).default('new'),
    parentFormat: z.enum(['legacy', 'story-v3', 'none']).default('none'),
  }),
  evidence: z.object({
    sources: z.array(SourceSchema).min(1).max(8),
    support: z.array(StoryEvidenceRecordSchema).max(12).default([]),
    media: z.array(MediaItemSchema).max(3).default([]),
    freshness: z.enum(['fresh', 'stale', 'mixed']).default('mixed'),
  }),
  normalized: z.object({
    datasets: z.array(StoryDatasetSchema).min(1).max(4),
    claims: z.array(StoryClaimSchema).min(1).max(8),
    entities: z.array(StoryEntitySchema).max(16).default([]),
    geography: z.object({
      scope: z.enum(['global', 'regional', 'national', 'local', 'none']).default('none'),
      primaryCodes: z.array(z.string().min(2).max(16)).max(12).default([]),
    }).default({ scope: 'none', primaryCodes: [] }),
    timeline: z.object({
      start: z.number().int().optional(),
      end: z.number().int().optional(),
      cadence: z.string().max(32).optional(),
    }).default({}),
  }),
  insights: z.array(StoryInsightSchema).min(1).max(8),
  story: z.object({
    thesis: z.string().min(1).max(120),
    setup: z.string().min(1).max(220),
    reveal: z.string().min(1).max(120),
    takeaway: z.string().min(1).max(220),
    socialCurrency: z.string().min(1).max(160),
    unexpected: z.string().min(1).max(160),
    emotionalStake: z.string().min(1).max(180),
    credibility: z.string().min(1).max(180),
    concreteness: z.string().min(1).max(180),
  }),
  scene: z.object({
    family: StorySceneFamily,
    themeName: ThemeName,
    visualDensity: VisualDensity,
    layout: StoryPanelLayout,
    panels: z.array(z.object({
      id: z.string().min(1).max(64),
      role: StoryPanelRole,
      viewType: StoryPanelViewType,
      datasetIds: z.array(z.string().min(1).max(64)).min(1).max(2),
      title: z.string().min(1).max(80),
      subtitle: z.string().max(140).optional(),
      chartType: ChartType.optional(),
      emphasis: StoryPanelEmphasis.default('medium'),
      annotations: z.array(StoryPanelAnnotationSchema).max(4).default([]),
      mediaId: z.string().max(64).optional(),
    })).min(1).max(4),
  }),
})

export const StoryDocumentSchema = StoryDocumentDraftSchema.extend({
  artifacts: z.object({
    width: z.number().int().min(480).max(1600),
    height: z.number().int().min(640).max(2400),
    aspectRatio: z.number().min(0.5).max(2),
    svg: z.string().min(1),
    renderedImageId: z.union([z.number(), z.string()]).optional(),
  }),
  compatibility: z.object({
    dna: DNASchema.optional(),
  }).default({}),
}).superRefine((document, ctx) => {
  const datasetIds = new Set(document.normalized.datasets.map((dataset) => dataset.id))
  const evidenceSourceIds = new Set(document.evidence.support.map((item) => item.id))
  const mediaIds = new Set(document.evidence.media.map((item) => item.id))
  const primaryPanels = document.scene.panels.filter((panel) => panel.role === 'primary')

  if (primaryPanels.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'scene.panels must contain exactly one primary panel.',
      path: ['scene', 'panels'],
    })
  }

  document.scene.panels.forEach((panel, index) => {
    panel.datasetIds.forEach((datasetId) => {
      if (!datasetIds.has(datasetId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Panel datasetId "${datasetId}" must exist in normalized.datasets.`,
          path: ['scene', 'panels', index, 'datasetIds'],
        })
      }
    })

    if (panel.mediaId && !mediaIds.has(panel.mediaId)) {
      ctx.addIssue({
        code: 'custom',
        message: `Panel mediaId "${panel.mediaId}" must exist in evidence.media.`,
        path: ['scene', 'panels', index, 'mediaId'],
      })
    }
  })

  document.normalized.claims.forEach((claim, index) => {
    claim.sourceIds.forEach((sourceId) => {
      if (!evidenceSourceIds.has(sourceId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Claim sourceId "${sourceId}" must exist in evidence.support.`,
          path: ['normalized', 'claims', index, 'sourceIds'],
        })
      }
    })
  })
})

export type StoryRequestedViewValue = z.infer<typeof StoryRequestedView>
export type StoryInsightTypeValue = z.infer<typeof StoryInsightType>
export type StorySceneFamilyValue = z.infer<typeof StorySceneFamily>
export type StoryPanelLayoutValue = z.infer<typeof StoryPanelLayout>
export type StoryPanelViewTypeValue = z.infer<typeof StoryPanelViewType>
export type StoryPanelRoleValue = z.infer<typeof StoryPanelRole>
export type StoryPanelEmphasisValue = z.infer<typeof StoryPanelEmphasis>
export type StoryDocumentV3Draft = z.infer<typeof StoryDocumentDraftSchema>
export type StoryDocumentV3 = z.infer<typeof StoryDocumentSchema>

export type StoryCompatibilitySummary = {
  dna?: InfographicDNA
}

export function isStoryDocument(value: unknown): value is StoryDocumentV3 {
  return StoryDocumentSchema.safeParse(value).success
}

export function isStoryFormatVersion(
  value: unknown,
): value is typeof STORY_DOCUMENT_VERSION {
  return value === STORY_DOCUMENT_VERSION
}

export function resolveStoryChartType(
  scenePanel: StoryDocumentV3['scene']['panels'][number],
  fallback: ChartTypeValue = 'bar-chart',
): ChartTypeValue {
  return scenePanel.chartType ?? fallback
}

export function resolveStorySceneFamilyToLayoutFamily(
  family: StorySceneFamilyValue,
): LayoutFamilyValue {
  switch (family) {
    case 'evidence-board':
      return 'evidence-board'
    case 'map-briefing':
    case 'timeline-briefing':
    case 'briefing-sheet':
      return 'briefing-sheet'
    case 'ranked-comparison':
      return 'spotlight-rail'
    case 'single-focus':
    default:
      return 'editorial-cover'
  }
}

export function resolveStorySceneFamilyToMediaKind(
  family: StorySceneFamilyValue,
): MediaKindValue | null {
  switch (family) {
    case 'evidence-board':
      return 'scan-card'
    case 'map-briefing':
    case 'timeline-briefing':
      return 'annotated-image'
    default:
      return null
  }
}

export function resolveStorySceneTheme(
  sceneFamily: StorySceneFamilyValue,
  visualDensity: VisualDensityValue,
): ThemeNameValue {
  if (sceneFamily === 'evidence-board') return 'editorial'
  if (sceneFamily === 'map-briefing' || sceneFamily === 'timeline-briefing' || visualDensity === 'dense') {
    return 'ocean-depth'
  }
  return 'glass-dark'
}
