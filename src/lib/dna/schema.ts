import { z } from 'zod/v4'

// ============================================================
// DNA Schema — The core data structure of every infographic
//
// Two layers, always separate:
//   content:       WHAT the data says (facts, numbers, sources)
//   presentation:  HOW it looks (theme, chart type, colors)
// ============================================================

// --- Enums ---

export const ChartType = z.enum([
  'bar-chart',
  'pie-chart',
  'line-chart',
  'area-chart',
  'timeline',
  'stat-card',
  'grouped-bar-chart',
  'donut-chart',
])

export const ThemeName = z.enum([
  'glass-dark',
  'glass-light',
  'neon-cyberpunk',
  'minimalist',
  'editorial',
  'warm-earth',
  'ocean-depth',
])

export const LayoutType = z.enum([
  'centered',
  'left-aligned',
  'split',
  'stacked',
])

// --- Content Layer (What the data says) ---

export const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  accessedAt: z.string().min(1), // YYYY-MM-DD
})

export const DataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

export const ContentSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  data: z.array(DataPointSchema).min(1),
  sources: z.array(SourceSchema).min(1),
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
  type: z.string().min(1),
  dataKey: z.string().optional(),
  labelKey: z.string().optional(),
})

export const PresentationSchema = z.object({
  theme: ThemeName,
  chartType: ChartType,
  layout: LayoutType,
  colors: ColorsSchema,
  components: z.array(ComponentSlot).min(1),
})

// --- Full DNA ---

export const DNASchema = z.object({
  content: ContentSchema,
  presentation: PresentationSchema,
})

// --- Exported Types ---

export type InfographicDNA = z.infer<typeof DNASchema>
export type ContentData = z.infer<typeof ContentSchema>
export type PresentationData = z.infer<typeof PresentationSchema>
export type DataPoint = z.infer<typeof DataPointSchema>
export type Source = z.infer<typeof SourceSchema>
export type Colors = z.infer<typeof ColorsSchema>
export type ChartTypeValue = z.infer<typeof ChartType>
export type ThemeNameValue = z.infer<typeof ThemeName>
export type LayoutTypeValue = z.infer<typeof LayoutType>
