import {
  documentV2ToDNA,
} from '@/lib/antv/compat'
import { finalizeAntVDocument } from '@/lib/antv/syntax'
import type { InfographicDocumentV2, InfographicDocumentV2Draft } from '@/lib/antv/schema'
import type { ChartTypeValue } from '@/lib/dna/schema'
import type { InfographicDNA } from '@/lib/dna/schema'
import {
  resolveStoryChartType,
  resolveStorySceneFamilyToLayoutFamily,
  type StoryDocumentV3,
  type StoryPanelViewTypeValue,
} from './schema'

const TEMPLATE_BY_VIEW: Record<string, { category: InfographicDocumentV2['presentation']['templateCategory']; templateName: string }> = {
  map: { category: 'chart', templateName: 'chart-bar-plain-text' },
  bar: { category: 'chart', templateName: 'chart-bar-plain-text' },
  line: { category: 'chart', templateName: 'chart-line-plain-text' },
  area: { category: 'chart', templateName: 'chart-line-plain-text' },
  timeline: { category: 'sequence', templateName: 'sequence-timeline-rounded-rect-node' },
  compare: { category: 'compare', templateName: 'compare-binary-horizontal-simple-fold' },
  list: { category: 'list', templateName: 'list-grid-badge-card' },
  hierarchy: { category: 'hierarchy', templateName: 'hierarchy-tree-curved-line-rounded-rect-node' },
  relation: { category: 'relation', templateName: 'relation-dagre-flow-tb-simple-circle-node' },
  stat: { category: 'chart', templateName: 'chart-bar-plain-text' },
  media: { category: 'list', templateName: 'list-grid-badge-card' },
}

export function storyDocumentToAntV(
  storyDocument: StoryDocumentV3,
): InfographicDocumentV2 {
  const primaryPanel = getPrimaryStoryPanel(storyDocument)
  const template = resolveStoryTemplate(storyDocument, primaryPanel)
  const draft = storyDocumentToAntVDraft(storyDocument)

  return finalizeAntVDocument(draft, {
    templateCategory: template.category,
    templateName: template.templateName,
    themeName: storyDocument.scene.themeName,
    panelLayout: storyDocument.scene.layout,
    panels: draft.presentation.panels,
  })
}

export function storyDocumentToAntVDraft(
  storyDocument: StoryDocumentV3,
): InfographicDocumentV2Draft {
  const primaryPanel = getPrimaryStoryPanel(storyDocument)
  const template = resolveStoryTemplate(storyDocument, primaryPanel)
  const chartType = primaryPanel
    ? resolveStoryChartType(primaryPanel, storyPanelViewToChartType(primaryPanel.viewType))
    : 'bar-chart'

  return {
    content: {
      title: compactCompatText(storyDocument.story.thesis, 60),
      subtitle: compactCompatText(storyDocument.story.setup, 200),
      hook: compactCompatText(storyDocument.story.reveal, 100),
      sources: storyDocument.evidence.sources.slice(0, 4),
      media: storyDocument.evidence.media,
      caveats: [
        compactCompatText(storyDocument.story.takeaway, 220),
        compactCompatText(storyDocument.story.credibility, 180),
      ].filter(Boolean),
      footnotes: compactCompatText(storyDocument.story.concreteness, 500),
      dataGroups: storyDocument.normalized.datasets.map((dataset) => ({
        id: dataset.id,
        label: dataset.label,
        summary: dataset.summary,
        items: dataset.items.map((item, index) => ({
          id: `${dataset.id}-${index + 1}`,
          label: item.label,
          value: item.value,
          unit: item.unit,
          description: buildDescriptor(item.metadata),
          metadata: item.metadata,
          time: item.metadata.time,
        })),
      })),
    },
    presentation: {
      storyMode: resolveStoryMode(storyDocument),
      templateCategory: template.category,
      templateFamily: template.templateName,
      themeName: storyDocument.scene.themeName,
      visualDensity: storyDocument.scene.visualDensity,
      chartType,
      layoutFamily: resolveStorySceneFamilyToLayoutFamily(storyDocument.scene.family),
      panelLayout: storyDocument.scene.layout,
      panels: storyDocument.scene.panels.map((panel) => ({
        id: panel.id,
        role: panel.role,
        viewType: panel.viewType,
        sourceGroupId: panel.datasetIds[0] ?? storyDocument.normalized.datasets[0]?.id ?? 'group-1',
        title: panel.title,
        chartType: panel.chartType ?? storyPanelViewToChartType(panel.viewType),
        emphasis: panel.emphasis,
      })),
      emphasis: {
        highlightLabel: storyDocument.insights[0]?.supportingLabels[0],
        highlightLabels: storyDocument.insights.flatMap((item) => item.supportingLabels).slice(0, 4),
        narrativeFocus: storyDocument.story.takeaway,
      },
    },
    antv: {
      templateName: template.templateName,
      themeName: storyDocument.scene.themeName,
    },
  }
}

export function storyDocumentToDNA(
  storyDocument: StoryDocumentV3,
): InfographicDNA {
  const document = storyDocumentToAntV(storyDocument)
  const primaryPanel = getPrimaryStoryPanel(storyDocument)
  const primaryGroupIds = new Set(primaryPanel?.datasetIds ?? [])
  const primaryGroupFallback = document.content.dataGroups[0]?.id
  const selectedGroupIds = primaryGroupIds.size > 0
    ? primaryGroupIds
    : new Set(primaryGroupFallback ? [primaryGroupFallback] : [])

  const compatibilityDNA = documentV2ToDNA({
    ...document,
    content: {
      ...document.content,
      dataGroups: document.content.dataGroups.filter((group) => selectedGroupIds.has(group.id)),
      media: [],
    },
    presentation: {
      ...document.presentation,
      panels: primaryPanel
        ? document.presentation.panels.filter((panel) => panel.id === primaryPanel.id)
        : document.presentation.panels.slice(0, 1),
    },
  })

  return {
    ...compatibilityDNA,
    content: {
      ...compatibilityDNA.content,
      title: compactCompatText(compatibilityDNA.content.title, 54),
      hook: compatibilityDNA.content.hook
        ? compactCompatText(compatibilityDNA.content.hook, 88)
        : compatibilityDNA.content.hook,
      sources: compatibilityDNA.content.sources.slice(0, 4),
      data: compatibilityDNA.content.data.map((point) => ({
        ...point,
        label: compactCompatLabel(point.label),
      })),
    },
  }
}

export function getPrimaryStoryPanel(
  storyDocument: Pick<StoryDocumentV3, 'scene'>,
) {
  return storyDocument.scene.panels.find((panel) => panel.role === 'primary') ?? storyDocument.scene.panels[0]
}

export function buildStoryDescription(
  storyDocument: StoryDocumentV3,
): string {
  return [
    storyDocument.story.setup,
    storyDocument.story.takeaway,
  ].filter(Boolean).join(' ').trim()
}

function resolveStoryMode(
  storyDocument: StoryDocumentV3,
): InfographicDocumentV2Draft['presentation']['storyMode'] {
  switch (storyDocument.scene.family) {
    case 'ranked-comparison':
      return 'ranked-comparison'
    case 'timeline-briefing':
      return 'process-flow'
    case 'evidence-board':
      return 'editorial-brief'
    case 'map-briefing':
      return 'data-story'
    case 'briefing-sheet':
      return 'editorial-brief'
    case 'single-focus':
    default:
      return 'editorial-brief'
  }
}

function resolveStoryTemplate(
  storyDocument: StoryDocumentV3,
  primaryPanel: ReturnType<typeof getPrimaryStoryPanel> | undefined,
): { category: InfographicDocumentV2['presentation']['templateCategory']; templateName: string } {
  const fallback = TEMPLATE_BY_VIEW[primaryPanel?.viewType ?? 'bar'] ?? TEMPLATE_BY_VIEW.bar

  switch (storyDocument.scene.family) {
    case 'ranked-comparison':
      if (primaryPanel?.viewType === 'list') {
        return { category: 'list', templateName: 'list-grid-badge-card' }
      }

      if (primaryPanel?.viewType === 'compare') {
        return { category: 'compare', templateName: 'compare-binary-horizontal-badge-card-vs' }
      }

      return { category: 'chart', templateName: 'chart-column-simple' }

    case 'timeline-briefing':
      return { category: 'sequence', templateName: 'sequence-timeline-rounded-rect-node' }

    case 'evidence-board':
      if (primaryPanel?.viewType === 'media' || primaryPanel?.viewType === 'list') {
        return { category: 'list', templateName: 'list-grid-badge-card' }
      }

      if (primaryPanel?.viewType === 'compare') {
        return { category: 'compare', templateName: 'compare-binary-horizontal-badge-card-vs' }
      }

      return fallback

    case 'briefing-sheet':
      if (primaryPanel?.viewType === 'timeline') {
        return { category: 'sequence', templateName: 'sequence-timeline-simple' }
      }

      if (primaryPanel?.viewType === 'compare') {
        return { category: 'compare', templateName: 'compare-binary-horizontal-compact-card-vs' }
      }

      return primaryPanel?.viewType === 'bar'
        ? { category: 'chart', templateName: 'chart-column-simple' }
        : fallback

    case 'single-focus':
      if (primaryPanel?.viewType === 'compare') {
        return { category: 'compare', templateName: 'compare-binary-horizontal-simple-vs' }
      }

      return fallback

    case 'map-briefing':
    default:
      return fallback
  }
}

function storyPanelViewToChartType(
  viewType: StoryPanelViewTypeValue,
): ChartTypeValue {
  switch (viewType) {
    case 'map':
      return 'map-chart'
    case 'line':
      return 'line-chart'
    case 'area':
      return 'area-chart'
    case 'timeline':
      return 'timeline'
    case 'compare':
      return 'vs-split'
    case 'stat':
      return 'stat-card'
    case 'list':
    case 'bar':
    case 'hierarchy':
    case 'relation':
    case 'media':
    default:
      return 'bar-chart'
  }
}

function buildDescriptor(
  metadata: Record<string, string>,
): string | undefined {
  const tokens = [
    metadata.country,
    metadata.city,
    metadata.group,
    metadata.detail,
  ].filter(Boolean)

  if (tokens.length === 0) return undefined
  return tokens.join(' • ')
}

function compactCompatText(value: string | undefined, maxLength: number): string {
  const normalized = (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim()

  if (normalized.length <= maxLength) return normalized

  const shortened = normalized.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return (boundary > Math.floor(maxLength * 0.6) ? shortened.slice(0, boundary) : shortened).trim()
}

function compactCompatLabel(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 18) return normalized

  const shortened = normalized.slice(0, 18)
  const boundary = shortened.lastIndexOf(' ')
  return (boundary > 8 ? shortened.slice(0, boundary) : shortened).trim()
}
