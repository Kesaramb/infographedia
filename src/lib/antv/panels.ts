import type { ChartTypeValue, InfographicDNA } from '@/lib/dna/schema'
import { isValidCountryCode } from '@/lib/dna/country-codes'
import type {
  AntVContentGroup,
  AntVPresentation,
  AntVPresentationPanel,
  AntVPresentationPanelViewTypeValue,
  AntVPresentationPanelLayoutValue,
  InfographicDocumentV2,
} from './schema'

export function ensureAntVDocumentPanels(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
): Pick<InfographicDocumentV2, 'content' | 'presentation'> {
  const panels = document.presentation.panels ?? []
  const panelLayout = document.presentation.panelLayout ?? 'single'
  const dataGroups = document.content.dataGroups ?? []

  if (panels.length > 0) {
    return {
      ...document,
      content: {
        ...document.content,
        dataGroups,
      },
      presentation: {
        ...document.presentation,
        panelLayout,
        panels,
      },
    }
  }

  const firstGroup = dataGroups[0]
  const chartView = chartTypeToPanelView(document.presentation.chartType)

  return {
    ...document,
    presentation: {
      ...document.presentation,
      panelLayout: 'single',
      panels: [
        {
          id: 'panel-primary',
          role: 'primary',
          viewType: chartView,
          sourceGroupId: firstGroup?.id ?? 'group-primary',
          title: firstGroup?.label,
          chartType: document.presentation.chartType,
          emphasis: 'high',
        },
      ],
    },
  }
}

export function alignDocumentToPlannedPanels(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
  plannedPanels: AntVPresentationPanel[],
  panelLayout?: AntVPresentationPanelLayoutValue,
): Pick<InfographicDocumentV2, 'content' | 'presentation'> {
  const normalized = ensureAntVDocumentPanels(document)
  if (plannedPanels.length === 0) {
    return {
      ...normalized,
      presentation: {
        ...normalized.presentation,
        panelLayout: panelLayout ?? normalized.presentation.panelLayout ?? 'single',
      },
    }
  }

  const alignedGroups = plannedPanels.map((panel, index) => {
    const matchedById = normalized.content.dataGroups.find((group) => group.id === panel.sourceGroupId)
    const matchedByExistingPanel = normalized.presentation.panels[index]
      ? normalized.content.dataGroups.find(
          (group) => group.id === normalized.presentation.panels[index]?.sourceGroupId,
        )
      : undefined
    const fallbackGroup =
      matchedById
      ?? matchedByExistingPanel
      ?? normalized.content.dataGroups[index]
      ?? normalized.content.dataGroups[normalized.content.dataGroups.length - 1]

    if (!fallbackGroup) {
      return {
        id: panel.sourceGroupId,
        label: panel.title ?? humanizePanelView(panel.viewType),
        summary: panel.title,
        items: [{ label: panel.title ?? humanizePanelView(panel.viewType), value: index + 1 }],
      } satisfies AntVContentGroup
    }

    return {
      ...fallbackGroup,
      id: panel.sourceGroupId,
      label: fallbackGroup.label || panel.title || humanizePanelView(panel.viewType),
      summary: fallbackGroup.summary ?? panel.title,
    }
  })

  return {
    ...normalized,
    content: {
      ...normalized.content,
      dataGroups: alignedGroups,
    },
    presentation: {
      ...normalized.presentation,
      panelLayout: panelLayout ?? normalized.presentation.panelLayout ?? 'single',
      panels: plannedPanels.map((panel, index) => ({
        ...panel,
        title: panel.title ?? alignedGroups[index]?.label,
      })),
    },
  }
}

export function getPrimaryPanel(document: Pick<InfographicDocumentV2, 'content' | 'presentation'>): AntVPresentationPanel | null {
  const normalized = ensureAntVDocumentPanels(document)
  return normalized.presentation.panels.find((panel) => panel.role === 'primary') ?? normalized.presentation.panels[0] ?? null
}

export function getPanelDataGroup(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
  panel: AntVPresentationPanel,
): AntVContentGroup | undefined {
  return document.content.dataGroups.find((group) => group.id === panel.sourceGroupId)
}

export function getPanelChartType(
  panel: AntVPresentationPanel,
  fallbackChartType: ChartTypeValue,
): ChartTypeValue {
  if (panel.chartType) return panel.chartType

  switch (panel.viewType) {
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
    case 'bar':
    case 'list':
    case 'hierarchy':
    case 'relation':
    case 'media':
    default:
      return fallbackChartType === 'stat-card' ? 'bar-chart' : fallbackChartType
  }
}

export function projectDocumentToPrimaryScene(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
): Pick<InfographicDocumentV2, 'content' | 'presentation'> {
  const normalized = ensureAntVDocumentPanels(document)
  const primaryPanel = getPrimaryPanel(normalized)
  const primaryGroup = primaryPanel ? getPanelDataGroup(normalized, primaryPanel) : normalized.content.dataGroups[0]

  return {
    content: {
      ...normalized.content,
      dataGroups: primaryGroup ? [primaryGroup] : normalized.content.dataGroups.slice(0, 1),
      media: [],
    },
    presentation: {
      ...normalized.presentation,
      panelLayout: 'single',
      panels: primaryPanel ? [{ ...primaryPanel, role: 'primary' }] : normalized.presentation.panels.slice(0, 1),
      chartType: primaryPanel ? getPanelChartType(primaryPanel, normalized.presentation.chartType) : normalized.presentation.chartType,
      templateCategory: primaryPanel ? panelViewToTemplateCategory(primaryPanel.viewType) : normalized.presentation.templateCategory,
    },
  }
}

export function chartTypeToPanelView(chartType: ChartTypeValue): AntVPresentationPanelViewTypeValue {
  switch (chartType) {
    case 'map-chart':
      return 'map'
    case 'line-chart':
      return 'line'
    case 'area-chart':
      return 'area'
    case 'timeline':
      return 'timeline'
    case 'vs-split':
      return 'compare'
    case 'stat-card':
      return 'stat'
    case 'grouped-bar-chart':
    case 'bar-chart':
    case 'pie-chart':
    case 'donut-chart':
    case 'pictogram':
    default:
      return 'bar'
  }
}

export function panelViewToTemplateCategory(
  viewType: AntVPresentationPanelViewTypeValue,
): AntVPresentation['templateCategory'] {
  switch (viewType) {
    case 'timeline':
      return 'sequence'
    case 'compare':
      return 'compare'
    case 'hierarchy':
      return 'hierarchy'
    case 'relation':
      return 'relation'
    case 'list':
      return 'list'
    case 'map':
    case 'bar':
    case 'line':
    case 'area':
    case 'stat':
    case 'media':
    default:
      return 'chart'
  }
}

export function getPanelLayoutClass(layout: AntVPresentationPanelLayoutValue): string {
  switch (layout) {
    case 'split-horizontal':
      return 'grid-cols-1 lg:grid-cols-2'
    case 'primary-plus-rail':
      return 'grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]'
    case 'stacked':
      return 'grid-cols-1'
    case 'split-vertical':
    case 'single':
    default:
      return 'grid-cols-1'
  }
}

function humanizePanelView(viewType: AntVPresentationPanelViewTypeValue): string {
  switch (viewType) {
    case 'map':
      return 'Geographic view'
    case 'bar':
      return 'Ranking view'
    case 'line':
      return 'Trend view'
    case 'area':
      return 'Area view'
    case 'timeline':
      return 'Timeline view'
    case 'compare':
      return 'Comparison view'
    case 'list':
      return 'List view'
    case 'hierarchy':
      return 'Hierarchy view'
    case 'relation':
      return 'Relationship view'
    case 'stat':
      return 'Headline stat'
    case 'media':
      return 'Media view'
    default:
      return 'Panel view'
  }
}

export function buildPanelSummaryDNA(input: {
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>
  panel: AntVPresentationPanel
  title?: string
}): InfographicDNA {
  const group = getPanelDataGroup(input.document, input.panel) ?? input.document.content.dataGroups[0]
  const chartType = getPanelChartType(input.panel, input.document.presentation.chartType)
  const compatibilityChartType =
    chartType === 'map-chart' && group?.items.every((item) => {
      const countryCode = (item.metadata?.countryCode ?? item.label).trim().toUpperCase()
      return isValidCountryCode(countryCode)
    })
      ? 'map-chart'
      : chartType === 'map-chart'
        ? 'bar-chart'
        : chartType

  return {
    content: {
      title: input.title ?? group?.label ?? input.document.content.title,
      subtitle: group?.summary ?? input.document.content.subtitle,
      hook: undefined,
      data: (group?.items ?? []).map((item, index) => ({
        label: compatibilityChartType === 'map-chart'
          ? (item.metadata?.countryCode ?? item.label).toUpperCase()
          : item.metadata?.countryCode ?? item.label,
        value: typeof item.value === 'number' ? item.value : index + 1,
        unit: item.unit,
        metadata: compatibilityChartType === 'map-chart'
          ? {
              ...(item.metadata ?? {}),
              countryCode: (item.metadata?.countryCode ?? item.label).toUpperCase(),
              country: item.metadata?.country ?? item.label,
            }
          : item.metadata,
      })).slice(0, compatibilityChartType === 'map-chart' ? 12 : 8),
      sources: input.document.content.sources,
      media: input.document.content.media,
      footnotes: input.document.content.footnotes,
    },
    presentation: {
      theme: input.document.presentation.themeName,
      chartType: compatibilityChartType,
      layout: compatibilityChartType === 'timeline' ? 'stacked' : 'centered',
      layoutFamily: 'legacy',
      heroBlock: 'chart',
      visualDensity: input.document.presentation.visualDensity,
      colors: {
        primary: '#11E68F',
        secondary: '#33C4FF',
        background: '#121326',
        text: '#F5F7FB',
        accent: '#6BE4FF',
      },
      components: [{ type: compatibilityChartType }],
    },
  }
}
