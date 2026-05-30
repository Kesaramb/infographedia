import type {
  ChartTypeValue,
  ComponentSlotData,
  DataPoint,
  InfographicDNA,
} from '@/lib/dna/schema'
import { isValidCountryCode } from '@/lib/dna/country-codes'
import { DNASchema } from '@/lib/dna/schema'
import type {
  AntVContentNode,
  InfographicDocumentV2,
} from './schema'
import { getPanelChartType, getPanelDataGroup, getPrimaryPanel, projectDocumentToPrimaryScene } from './panels'
import { themeNameToColors } from './theme'

export function documentV2ToDNA(
  document: InfographicDocumentV2,
): InfographicDNA {
  const projected = projectDocumentToPrimaryScene(document)
  const primaryPanel = getPrimaryPanel(projected)
  const chartType = primaryPanel
    ? normalizePrimaryPanelChartType(projected, primaryPanel)
    : normalizeCompatibilityChartType(projected)
  const data = buildCompatibilityData(projected, chartType)
  const mediaComponents = projected.content.media.map((item) => ({
    type: item.kind,
    mediaId: item.id,
  })) as ComponentSlotData[]
  const layoutFamily = resolveCompatibilityLayoutFamily(
    projected.presentation.layoutFamily,
    mediaComponents.length,
    chartType,
  )
  const heroBlock =
    mediaComponents[0]?.type ?? (chartType === 'stat-card' ? 'stat-card' : 'chart')

  const dna = {
    content: {
      title: document.content.title,
      subtitle: projected.content.subtitle,
      hook: projected.content.hook,
      data,
      sources: projected.content.sources,
      media: projected.content.media,
      footnotes: [projected.content.footnotes, ...projected.content.caveats].filter(Boolean).join(' ').trim() || undefined,
    },
    presentation: {
      theme: projected.presentation.themeName,
      chartType,
      layout: chartType === 'timeline' ? 'stacked' : 'centered',
      layoutFamily,
      heroBlock,
      visualDensity: projected.presentation.visualDensity,
      colors: themeNameToColors(projected.presentation.themeName),
      components: buildComponents(chartType, mediaComponents, Boolean(document.content.hook)),
    },
  }

  return DNASchema.parse(dna)
}

function buildCompatibilityData(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
  chartType: ChartTypeValue,
): DataPoint[] {
  if (chartType === 'map-chart') {
    return document.content.dataGroups[0]?.items
      .map((item, index) => buildMapPoint(item, index))
      .filter((point): point is DataPoint => Boolean(point)) ?? []
  }

  const { templateCategory } = document.presentation

  if (templateCategory === 'sequence') {
    return document.content.dataGroups[0]?.items.map((item, index) => ({
      label: item.label,
      value: parseSequenceValue(item, index),
      unit: item.unit,
      metadata: {
        ...(item.metadata ?? {}),
        time: item.time ?? String(index + 1),
      },
    })) ?? []
  }

  const flattened = document.content.dataGroups.flatMap((group) =>
    group.items.map((item, index) => ({
      label: document.content.dataGroups.length > 1 ? `${group.label}: ${item.label}` : item.label,
      value: typeof item.value === 'number' ? item.value : fallbackValue(item, index),
      unit: item.unit,
      metadata: {
        ...(item.metadata ?? {}),
        group: group.label,
      },
    })),
  )

  if (flattened.length > 0) return flattened

  return [{ label: 'Value', value: 1 }]
}

function normalizePrimaryPanelChartType(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
  primaryPanel: NonNullable<ReturnType<typeof getPrimaryPanel>>,
): ChartTypeValue {
  const candidate = getPanelChartType(primaryPanel, document.presentation.chartType)
  if (candidate !== 'map-chart') {
    return candidate
  }

  const group = getPanelDataGroup(document, primaryPanel)
  const isMapCompatible = group?.items.every((item) => {
    const countryCode = (item.metadata?.countryCode ?? item.label).trim().toUpperCase()
    return isValidCountryCode(countryCode)
  }) ?? false

  return isMapCompatible ? 'map-chart' : 'bar-chart'
}

function buildMapPoint(item: AntVContentNode, index: number): DataPoint | null {
  const countryCode = (item.metadata?.countryCode ?? item.label).trim().toUpperCase()
  if (!isValidCountryCode(countryCode)) {
    return null
  }

  return {
    label: countryCode,
    value: typeof item.value === 'number' ? item.value : fallbackValue(item, index),
    unit: item.unit,
    metadata: {
      ...(item.metadata ?? {}),
      countryCode,
      country: item.metadata?.country ?? item.label,
    },
  }
}

function normalizeCompatibilityChartType(document: Pick<InfographicDocumentV2, 'content' | 'presentation'>): ChartTypeValue {
  const { chartType, templateCategory } = document.presentation

  if (templateCategory === 'sequence') return 'timeline'
  if (templateCategory === 'compare' && document.content.dataGroups.length === 2 && document.content.dataGroups.every((group) => group.items.length === 1)) {
    return 'vs-split'
  }

  if (templateCategory === 'chart') {
    if (chartType === 'line-chart' || chartType === 'area-chart' || chartType === 'donut-chart' || chartType === 'pie-chart' || chartType === 'stat-card') {
      return chartType
    }
    return 'bar-chart'
  }

  if (templateCategory === 'list') return 'bar-chart'
  if (templateCategory === 'hierarchy' || templateCategory === 'relation') return 'bar-chart'

  return chartType
}

function resolveCompatibilityLayoutFamily(
  layoutFamily: InfographicDocumentV2['presentation']['layoutFamily'],
  mediaCount: number,
  chartType: ChartTypeValue,
): InfographicDocumentV2['presentation']['layoutFamily'] {
  if (layoutFamily === 'evidence-board' && mediaCount === 0) {
    return fallbackLayoutFamily(chartType)
  }

  return layoutFamily
}

function fallbackLayoutFamily(
  chartType: ChartTypeValue,
): InfographicDocumentV2['presentation']['layoutFamily'] {
  if (chartType === 'stat-card') return 'editorial-cover'
  if (chartType === 'map-chart' || chartType === 'timeline') return 'briefing-sheet'
  return 'spotlight-rail'
}

function buildComponents(
  chartType: ChartTypeValue,
  mediaComponents: ComponentSlotData[],
  hasHook: boolean,
): ComponentSlotData[] {
  return [
    { type: 'title' },
    { type: 'subtitle' },
    ...(hasHook ? [{ type: 'hook' as const }] : []),
    ...mediaComponents.slice(0, 1),
    { type: chartType },
    ...mediaComponents.slice(1, 3),
    { type: 'footnote' },
    { type: 'source-badge' },
  ]
}

function parseSequenceValue(item: AntVContentNode, index: number): number {
  if (typeof item.value === 'number') return item.value
  if (item.time && /^\d{4}$/.test(item.time)) return Number(item.time)
  return index + 1
}

function fallbackValue(item: AntVContentNode, index: number): number {
  if (item.children?.length) return item.children.length
  return index + 1
}
