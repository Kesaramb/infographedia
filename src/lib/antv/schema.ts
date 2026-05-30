import { z } from 'zod/v4'
import {
  type ChartTypeValue,
  type LayoutFamilyValue,
  type ThemeNameValue,
  type VisualDensityValue,
  ChartType,
  LayoutFamily,
  MediaItemSchema,
  SourceSchema,
  ThemeName,
  VisualDensity,
} from '@/lib/dna/schema'

export const ANTV_TEMPLATE_CATEGORIES = [
  'list',
  'sequence',
  'compare',
  'chart',
  'hierarchy',
  'relation',
] as const

export const ANTV_STORY_MODES = [
  'editorial-brief',
  'ranked-comparison',
  'process-flow',
  'comparison-brief',
  'network-map',
  'hierarchy-brief',
  'data-story',
] as const

export const ANTV_PANEL_LAYOUTS = [
  'single',
  'split-horizontal',
  'split-vertical',
  'primary-plus-rail',
  'stacked',
] as const

export const ANTV_PANEL_VIEW_TYPES = [
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

export const ANTV_PANEL_ROLES = [
  'primary',
  'support',
] as const

export const ANTV_PANEL_EMPHASIS = [
  'high',
  'medium',
  'low',
] as const

export const AntVTemplateCategory = z.enum(ANTV_TEMPLATE_CATEGORIES)
export const AntVStoryMode = z.enum(ANTV_STORY_MODES)
export const AntVPanelLayout = z.enum(ANTV_PANEL_LAYOUTS)
export const AntVPanelViewType = z.enum(ANTV_PANEL_VIEW_TYPES)
export const AntVPanelRole = z.enum(ANTV_PANEL_ROLES)
export const AntVPanelEmphasis = z.enum(ANTV_PANEL_EMPHASIS)

export const AntVContentNodeSchema: z.ZodType<AntVContentNode> = z.object({
  id: z.string().min(1).max(64).optional(),
  label: z.string().min(1).max(80),
  value: z.number().optional(),
  unit: z.string().max(24).optional(),
  description: z.string().max(180).optional(),
  icon: z.string().max(64).optional(),
  time: z.string().max(32).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  children: z.array(z.lazy(() => AntVContentNodeSchema)).max(10).optional(),
})

export const AntVContentGroupSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  summary: z.string().max(180).optional(),
  items: z.array(AntVContentNodeSchema).min(1).max(12),
})

export const AntVDocumentContentSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(220).optional(),
  hook: z.string().max(120).optional(),
  dataGroups: z.array(AntVContentGroupSchema).min(1).max(4),
  sources: z.array(SourceSchema).min(1),
  media: z.array(MediaItemSchema).max(3).default([]),
  caveats: z.array(z.string().min(1).max(180)).max(4).default([]),
  footnotes: z.string().max(500).optional(),
})

export const AntVPresentationSchema = z.object({
  storyMode: AntVStoryMode,
  templateCategory: AntVTemplateCategory,
  templateFamily: z.string().min(1).max(80),
  themeName: ThemeName,
  visualDensity: VisualDensity,
  chartType: ChartType,
  layoutFamily: LayoutFamily.default('legacy'),
  panelLayout: AntVPanelLayout.default('single'),
  panels: z.array(z.object({
    id: z.string().min(1).max(64),
    role: AntVPanelRole,
    viewType: AntVPanelViewType,
    sourceGroupId: z.string().min(1).max(64),
    title: z.string().max(80).optional(),
    chartType: ChartType.optional(),
    emphasis: AntVPanelEmphasis.optional(),
  })).max(4).default([]),
  emphasis: z.object({
    highlightLabel: z.string().max(80).optional(),
    highlightLabels: z.array(z.string().min(1).max(80)).max(4).default([]),
    narrativeFocus: z.string().max(160).optional(),
  }).default({ highlightLabels: [] }),
})

export const AntVRenderMetaSchema = z.object({
  width: z.number().int().min(480).max(1600),
  height: z.number().int().min(640).max(2400),
  aspectRatio: z.number().min(0.5).max(2).optional(),
})

export const AntVDocumentSchema = z.object({
  content: AntVDocumentContentSchema,
  presentation: AntVPresentationSchema,
  antv: z.object({
    syntax: z.string().min(1),
    templateName: z.string().min(1).max(80),
    themeName: ThemeName,
    renderMeta: AntVRenderMetaSchema,
  }),
}).superRefine((document, ctx) => {
  if (document.antv.templateName !== document.presentation.templateFamily) {
    ctx.addIssue({
      code: 'custom',
      message: 'antv.templateName must match presentation.templateFamily.',
      path: ['antv', 'templateName'],
    })
  }

  if (document.antv.themeName !== document.presentation.themeName) {
    ctx.addIssue({
      code: 'custom',
      message: 'antv.themeName must match presentation.themeName.',
      path: ['antv', 'themeName'],
    })
  }

  if (document.presentation.panels.length > 0) {
    const primaryPanels = document.presentation.panels.filter((panel) => panel.role === 'primary')

    if (primaryPanels.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'presentation.panels must contain exactly one primary panel.',
        path: ['presentation', 'panels'],
      })
    }

    if (document.presentation.panels.length > 4) {
      ctx.addIssue({
        code: 'custom',
        message: 'presentation.panels may include at most 4 panels.',
        path: ['presentation', 'panels'],
      })
    }

    document.presentation.panels.forEach((panel, index) => {
      if (!document.content.dataGroups.some((group) => group.id === panel.sourceGroupId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Panel sourceGroupId "${panel.sourceGroupId}" must match a content.dataGroups[].id value.`,
          path: ['presentation', 'panels', index, 'sourceGroupId'],
        })
      }
    })
  }
})

export const AntVDocumentDraftSchema = z.object({
  content: AntVDocumentContentSchema,
  presentation: AntVPresentationSchema,
  antv: z.object({
    templateName: z.string().min(1).max(80).optional(),
    themeName: ThemeName.optional(),
  }).default({}),
})

export type AntVTemplateCategoryValue = z.infer<typeof AntVTemplateCategory>
export type AntVStoryModeValue = z.infer<typeof AntVStoryMode>
export type AntVPresentationPanelLayoutValue = z.infer<typeof AntVPanelLayout>
export type AntVPresentationPanelViewTypeValue = z.infer<typeof AntVPanelViewType>
export type AntVPresentationPanelRoleValue = z.infer<typeof AntVPanelRole>
export type AntVPresentationPanelEmphasisValue = z.infer<typeof AntVPanelEmphasis>
export type AntVContentNode = {
  id?: string
  label: string
  value?: number
  unit?: string
  description?: string
  icon?: string
  time?: string
  metadata?: Record<string, string>
  children?: AntVContentNode[]
}
export type AntVContentGroup = z.infer<typeof AntVContentGroupSchema>
export type AntVDocumentContent = z.infer<typeof AntVDocumentContentSchema>
export type AntVPresentation = z.infer<typeof AntVPresentationSchema>
export type AntVPresentationPanel = AntVPresentation['panels'][number]
export type AntVRenderMeta = z.infer<typeof AntVRenderMetaSchema>
export type InfographicDocumentV2 = z.infer<typeof AntVDocumentSchema>
export type InfographicDocumentV2Draft = z.infer<typeof AntVDocumentDraftSchema>

export interface AntVTemplatePlan {
  templateCategory: AntVTemplateCategoryValue
  templateName: string
  storyMode: AntVStoryModeValue
  chartType: ChartTypeValue
  themeName: ThemeNameValue
  visualDensity: VisualDensityValue
  layoutFamily: LayoutFamilyValue
  panelLayout: AntVPresentationPanelLayoutValue
  panels: AntVPresentationPanel[]
  recentUsageSummary: string
}
