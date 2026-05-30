import { z } from 'zod/v4'
import { isValidCountryCode } from '@/lib/dna/country-codes'

// ============================================================
// DNA Schema — The core data structure of every infographic
//
// Two layers, always separate:
//   content:       WHAT the data says (facts, numbers, sources)
//   presentation:  HOW it looks (theme, chart type, colors)
// ============================================================

// --- Enum values ---

export const CHART_TYPES = [
  'bar-chart',
  'pie-chart',
  'line-chart',
  'area-chart',
  'timeline',
  'stat-card',
  'grouped-bar-chart',
  'donut-chart',
  'pictogram',
  'vs-split',
  'map-chart',
] as const

export const MEDIA_COMPONENT_TYPES = [
  'hero-image',
  'annotated-image',
  'scan-card',
] as const

export const THEME_NAMES = [
  'glass-dark',
  'glass-light',
  'neon-cyberpunk',
  'minimalist',
  'editorial',
  'warm-earth',
  'ocean-depth',
] as const

export const LAYOUT_TYPES = [
  'centered',
  'left-aligned',
  'split',
  'stacked',
] as const

export const LAYOUT_FAMILIES = [
  'legacy',
  'editorial-cover',
  'spotlight-rail',
  'evidence-board',
  'briefing-sheet',
] as const

export const HERO_BLOCK_TYPES = [
  'chart',
  'hero-image',
  'annotated-image',
  'scan-card',
  'stat-card',
] as const

export const VISUAL_DENSITIES = [
  'minimal',
  'balanced',
  'dense',
] as const

export const MEDIA_USAGE_TYPES = [
  'evidence',
  'context',
] as const

export const CORE_COMPONENT_TYPES = [
  'title',
  'subtitle',
  'hook',
  'footnote',
  'source-badge',
] as const

export const COMPONENT_TYPES = [
  ...CORE_COMPONENT_TYPES,
  ...MEDIA_COMPONENT_TYPES,
  ...CHART_TYPES,
] as const

// --- Enums ---

export const ChartType = z.enum(CHART_TYPES)

export const ThemeName = z.enum(THEME_NAMES)

export const LayoutType = z.enum(LAYOUT_TYPES)

export const LayoutFamily = z.enum(LAYOUT_FAMILIES)

export const HeroBlock = z.enum(HERO_BLOCK_TYPES)

export const VisualDensity = z.enum(VISUAL_DENSITIES)

export const MediaUsage = z.enum(MEDIA_USAGE_TYPES)

export const ComponentType = z.enum(COMPONENT_TYPES)

// --- Content Layer (What the data says) ---

const isoDateSchema = z.string().refine(
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  },
  'accessedAt must be a real ISO date in YYYY-MM-DD format',
)

export const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  accessedAt: isoDateSchema,
})

export const DataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

export const MediaAnnotationSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().min(1).max(48),
  detail: z.string().max(96).optional(),
})

export const MediaFocusRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.05).max(1),
  height: z.number().min(0.05).max(1),
})

export const MediaKind = z.enum(MEDIA_COMPONENT_TYPES)

export const MediaItemSchema = z.object({
  id: z.string().min(1).max(64),
  kind: MediaKind,
  usage: MediaUsage,
  url: z.string().url(),
  alt: z.string().min(1).max(180),
  caption: z.string().max(220).optional(),
  source: SourceSchema,
  relevance: z.string().min(1).max(220),
  payloadMediaId: z.union([z.number(), z.string()]).optional(),
  contextLabel: z.string().min(1).max(40).optional(),
  annotations: z.array(MediaAnnotationSchema).min(1).max(3).optional(),
  focusRegion: MediaFocusRegionSchema.optional(),
}).superRefine((media, ctx) => {
  if (media.kind === 'annotated-image' && (!media.annotations || media.annotations.length === 0)) {
    ctx.addIssue({
      code: 'custom',
      message: 'annotated-image media items require 1-3 annotations.',
      path: ['annotations'],
    })
  }

  if (media.kind !== 'annotated-image' && media.annotations?.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Only annotated-image media items may include annotations.',
      path: ['annotations'],
    })
  }

  if (media.usage === 'context' && !media.contextLabel?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Context media must include a visible contextLabel.',
      path: ['contextLabel'],
    })
  }
})

export const ContentSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  hook: z.string().max(100).optional(),
  data: z.array(DataPointSchema).min(1),
  sources: z.array(SourceSchema).min(1),
  media: z.array(MediaItemSchema).max(3).default([]),
  footnotes: z.string().max(500).optional(),
})

// --- Presentation Layer (How it looks) ---

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const ColorsSchema = z.object({
  primary: hexColor,
  secondary: hexColor.optional(),
  background: hexColor,
  text: hexColor,
  accent: hexColor.optional(),
})

export const ComponentSlot = z.object({
  type: ComponentType,
  dataKey: z.string().optional(),
  labelKey: z.string().optional(),
  mediaId: z.string().max(64).optional(),
})

export const PresentationSchema = z.object({
  theme: ThemeName,
  chartType: ChartType,
  layout: LayoutType,
  layoutFamily: LayoutFamily.default('legacy'),
  heroBlock: HeroBlock.default('chart'),
  visualDensity: VisualDensity.default('balanced'),
  colors: ColorsSchema,
  components: z.array(ComponentSlot).min(1),
})

// --- Full DNA ---

export const DNASchema = z.object({
  content: ContentSchema,
  presentation: PresentationSchema,
}).superRefine((dna, ctx) => {
  const { chartType, components, heroBlock, layoutFamily } = dna.presentation
  const chartComponentSlots = components.filter((slot) =>
    CHART_TYPES.includes(slot.type as ChartTypeValue),
  )
  const mediaSlots = components.filter((slot) =>
    MEDIA_COMPONENT_TYPES.includes(slot.type as MediaKindValue),
  )
  const selectedChartCount = components.filter((slot) => slot.type === chartType).length
  const mediaIds = new Set(dna.content.media.map((item) => item.id))

  if (chartComponentSlots.length !== 1 || selectedChartCount !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: `presentation.components must include exactly one "${chartType}" block and no additional chart types.`,
      path: ['presentation', 'components'],
    })
  }

  if (chartType === 'stat-card' && dna.content.data.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'stat-card infographics must have exactly 1 data point.',
      path: ['content', 'data'],
    })
  }

  if (chartType === 'vs-split' && dna.content.data.length !== 2) {
    ctx.addIssue({
      code: 'custom',
      message: 'vs-split infographics must have exactly 2 data points.',
      path: ['content', 'data'],
    })
  }

  if (chartType === 'grouped-bar-chart') {
    dna.content.data.forEach((point, index) => {
      if (!point.metadata?.group?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'grouped-bar-chart data points require metadata.group.',
          path: ['content', 'data', index, 'metadata', 'group'],
        })
      }
    })
  }

  if (chartType === 'map-chart') {
    dna.content.data.forEach((point, index) => {
      const countryCode = (point.metadata?.countryCode ?? point.label).toUpperCase()
      if (!isValidCountryCode(countryCode)) {
        ctx.addIssue({
          code: 'custom',
          message: 'map-chart labels must be valid ISO 3166-1 alpha-2 country codes.',
          path: ['content', 'data', index, 'label'],
        })
      }
    })
  }

  const seenMediaIds = new Set<string>()
  dna.content.media.forEach((item, index) => {
    if (seenMediaIds.has(item.id)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each media item id must be unique.',
        path: ['content', 'media', index, 'id'],
      })
    }
    seenMediaIds.add(item.id)
  })

  components.forEach((slot, index) => {
    const isMediaComponent = MEDIA_COMPONENT_TYPES.includes(slot.type as MediaKindValue)
    if (!isMediaComponent && slot.mediaId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only media-rendering components may define mediaId.',
        path: ['presentation', 'components', index, 'mediaId'],
      })
    }

    if (!isMediaComponent) return

    if (!slot.mediaId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: `${slot.type} components must reference content.media[].id via mediaId.`,
        path: ['presentation', 'components', index, 'mediaId'],
      })
      return
    }

    if (!mediaIds.has(slot.mediaId)) {
      ctx.addIssue({
        code: 'custom',
        message: `mediaId "${slot.mediaId}" does not exist in content.media[].`,
        path: ['presentation', 'components', index, 'mediaId'],
      })
    }

    const mediaItem = dna.content.media.find((item) => item.id === slot.mediaId)
    if (mediaItem && mediaItem.kind !== slot.type) {
      ctx.addIssue({
        code: 'custom',
        message: `${slot.type} components must reference media items with the same kind.`,
        path: ['presentation', 'components', index, 'type'],
      })
    }
  })

  if (heroBlock === 'chart' && selectedChartCount !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'heroBlock "chart" requires the selected chartType block to be present exactly once.',
      path: ['presentation', 'heroBlock'],
    })
  }

  if (heroBlock === 'stat-card' && chartType !== 'stat-card') {
    ctx.addIssue({
      code: 'custom',
      message: 'heroBlock "stat-card" requires presentation.chartType to be "stat-card".',
      path: ['presentation', 'heroBlock'],
    })
  }

  if (heroBlock !== 'chart' && heroBlock !== 'stat-card') {
    const heroMediaSlotCount = mediaSlots.filter((slot) => slot.type === heroBlock).length
    if (heroMediaSlotCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `heroBlock "${heroBlock}" requires exactly one matching media component in presentation.components.`,
        path: ['presentation', 'heroBlock'],
      })
    }
  }

  if (layoutFamily === 'evidence-board' && mediaSlots.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'evidence-board requires at least one media block.',
      path: ['presentation', 'layoutFamily'],
    })
  }

  if (layoutFamily === 'briefing-sheet' && mediaSlots.length > 2) {
    ctx.addIssue({
      code: 'custom',
      message: 'briefing-sheet supports at most 2 media blocks.',
      path: ['presentation', 'components'],
    })
  }

  if (layoutFamily !== 'legacy' && heroBlock !== 'chart' && heroBlock !== 'stat-card' && mediaSlots.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Non-legacy families using media heroes must include matching media blocks.',
      path: ['presentation', 'components'],
    })
  }
})

// --- Exported Types ---

export type InfographicDNA = z.infer<typeof DNASchema>
export type InfographicDNAInput = z.input<typeof DNASchema>
export type ContentData = z.infer<typeof ContentSchema>
export type PresentationData = z.infer<typeof PresentationSchema>
export type DataPoint = z.infer<typeof DataPointSchema>
export type Source = z.infer<typeof SourceSchema>
export type Colors = z.infer<typeof ColorsSchema>
export type ChartTypeValue = z.infer<typeof ChartType>
export type ThemeNameValue = z.infer<typeof ThemeName>
export type LayoutTypeValue = z.infer<typeof LayoutType>
export type LayoutFamilyValue = z.infer<typeof LayoutFamily>
export type HeroBlockValue = z.infer<typeof HeroBlock>
export type VisualDensityValue = z.infer<typeof VisualDensity>
export type MediaKindValue = z.infer<typeof MediaKind>
export type MediaUsageValue = z.infer<typeof MediaUsage>
export type ComponentTypeValue = z.infer<typeof ComponentType>
export type ComponentSlotData = z.infer<typeof ComponentSlot>
export type MediaItem = z.infer<typeof MediaItemSchema>
export type MediaAnnotation = z.infer<typeof MediaAnnotationSchema>
export type MediaFocusRegion = z.infer<typeof MediaFocusRegionSchema>
