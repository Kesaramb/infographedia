import type {
  ChartTypeValue,
  ComponentSlotData,
  ComponentTypeValue,
  InfographicDNA,
  LayoutFamilyValue,
  LayoutTypeValue,
  VisualDensityValue,
} from '@/lib/dna/schema'
import { prepareMapChartData } from '@/lib/dna/map-chart'
import { evaluateSemanticConsistency } from '@/lib/dna/semantic-consistency'
import { getMediaItem, isMediaComponentType, isReadableScanMedia } from '@/lib/dna/media'

export interface ResolvedDNAColors {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
}

export interface RenderProfile {
  name: 'static' | 'preview' | 'remotion'
  width: number
  baseHeight: number
  minHeight: number
  maxHeight: number
  fps: number
  baseDurationFrames: number
  maxDurationFrames: number
  maxTitleLines: number
  titleCharsPerLine: number
  maxSubtitleLines: number
  subtitleCharsPerLine: number
  maxHookLines: number
  hookCharsPerLine: number
  maxFootnoteLines: number
  footnoteCharsPerLine: number
  maxLabelLength: number
  maxSources: number
  maxMediaItems: number
  maxMediaCaptionChars: number
  maxRelevanceChars: number
  maxDataPoints: Record<ChartTypeValue, number>
}

export interface CompiledLayoutBlock {
  id: string
  slot: ComponentSlotData
  type: ComponentTypeValue
  kind: 'text' | 'chart' | 'media' | 'footnote' | 'sources'
  align: 'left' | 'center'
  estimatedHeight: number
  rowId: string
  columnId: string
  surface: 'plain' | 'hero' | 'support'
  animation: {
    startFrame: number
    revealFrames: number
  }
}

export interface CompiledLayoutColumn {
  id: string
  width: 'full' | 'wide' | 'narrow' | 'equal'
  panel: 'none' | 'glass' | 'hero'
  blocks: CompiledLayoutBlock[]
}

export interface CompiledLayoutRow {
  id: string
  role: 'header' | 'hero' | 'support' | 'footer'
  gap: number
  columns: CompiledLayoutColumn[]
}

export interface CompiledLayout {
  profile: RenderProfile
  rows: CompiledLayoutRow[]
  blocks: CompiledLayoutBlock[]
  meta: {
    width: number
    height: number
    fps: number
    durationFrames: number
    layoutFamily: LayoutFamilyValue
  }
}

export interface DNAWarning {
  path: string
  message: string
}

export interface PreflightResult {
  ok: boolean
  errors: DNAWarning[]
  warnings: DNAWarning[]
  compiledLayout: CompiledLayout
}

interface SlotBuckets {
  headerSlots: ComponentSlotData[]
  chartSlot?: ComponentSlotData
  heroSlot?: ComponentSlotData
  mediaSlots: ComponentSlotData[]
  secondaryMediaSlots: ComponentSlotData[]
  supportChartSlot?: ComponentSlotData
  footnoteSlots: ComponentSlotData[]
  sourceSlots: ComponentSlotData[]
}

const MAX_DATA_POINTS: Record<ChartTypeValue, number> = {
  'area-chart': 10,
  'bar-chart': 10,
  'donut-chart': 6,
  'grouped-bar-chart': 10,
  'line-chart': 10,
  'map-chart': 12,
  'pie-chart': 6,
  'pictogram': 6,
  'stat-card': 1,
  'timeline': 8,
  'vs-split': 2,
}

export const STATIC_RENDER_PROFILE: RenderProfile = {
  name: 'static',
  width: 600,
  baseHeight: 800,
  minHeight: 760,
  maxHeight: 1900,
  fps: 30,
  baseDurationFrames: 240,
  maxDurationFrames: 480,
  maxTitleLines: 3,
  titleCharsPerLine: 24,
  maxSubtitleLines: 4,
  subtitleCharsPerLine: 36,
  maxHookLines: 2,
  hookCharsPerLine: 24,
  maxFootnoteLines: 5,
  footnoteCharsPerLine: 42,
  maxLabelLength: 18,
  maxSources: 4,
  maxMediaItems: 3,
  maxMediaCaptionChars: 160,
  maxRelevanceChars: 140,
  maxDataPoints: MAX_DATA_POINTS,
}

export const PREVIEW_RENDER_PROFILE: RenderProfile = {
  ...STATIC_RENDER_PROFILE,
  name: 'preview',
}

export const REMOTION_RENDER_PROFILE: RenderProfile = {
  ...STATIC_RENDER_PROFILE,
  name: 'remotion',
  maxHeight: 2100,
  maxDurationFrames: 560,
}

export function resolveDNAColors(dna: InfographicDNA): ResolvedDNAColors {
  const { colors } = dna.presentation

  return {
    primary: colors.primary,
    secondary: colors.secondary ?? colors.primary,
    background: colors.background,
    text: colors.text,
    accent: colors.accent ?? colors.primary,
  }
}

export function compileLayout(
  dna: InfographicDNA,
  renderProfile: RenderProfile = STATIC_RENDER_PROFILE,
): CompiledLayout {
  const layoutFamily = getLayoutFamily(dna)
  const rows = buildLayoutRows(dna, renderProfile)
  const timedRows = assignAnimationTiming(rows)
  const blocks = timedRows.flatMap((row) => row.columns.flatMap((column) => column.blocks))
  const durationFrames = clamp(
    Math.max(
      renderProfile.baseDurationFrames,
      ...blocks.map((block) => block.animation.startFrame + block.animation.revealFrames + 36),
    ),
    renderProfile.baseDurationFrames,
    renderProfile.maxDurationFrames,
  )

  const width = getCompositionWidth(dna, renderProfile)
  const height = clamp(
    estimateCompositionHeight(dna, renderProfile, timedRows),
    renderProfile.minHeight,
    renderProfile.maxHeight,
  )

  return {
    profile: renderProfile,
    rows: timedRows,
    blocks,
    meta: {
      width,
      height,
      fps: renderProfile.fps,
      durationFrames,
      layoutFamily,
    },
  }
}

export function preflightDNA(
  dna: InfographicDNA,
  renderProfile: RenderProfile = PREVIEW_RENDER_PROFILE,
): PreflightResult {
  const errors: DNAWarning[] = []
  const warnings: DNAWarning[] = []
  const compiledLayout = compileLayout(dna, renderProfile)
  const { chartType, layoutFamily } = dna.presentation
  const mediaItems = getMediaItems(dna)
  const dataBudget = renderProfile.maxDataPoints[chartType]

  assertLineBudget(errors, 'content.title', dna.content.title, renderProfile.titleCharsPerLine, renderProfile.maxTitleLines, 'Title')
  assertLineBudget(warnings, 'content.subtitle', dna.content.subtitle, renderProfile.subtitleCharsPerLine, renderProfile.maxSubtitleLines, 'Subtitle')
  assertLineBudget(warnings, 'content.hook', dna.content.hook, renderProfile.hookCharsPerLine, renderProfile.maxHookLines, 'Hook')
  assertLineBudget(warnings, 'content.footnotes', dna.content.footnotes, renderProfile.footnoteCharsPerLine, renderProfile.maxFootnoteLines, 'Footnotes')

  if (dna.content.sources.length > renderProfile.maxSources) {
    errors.push({
      path: 'content.sources',
      message: `Too many sources for the ${renderProfile.name} surface. Use at most ${renderProfile.maxSources}.`,
    })
  }

  if (mediaItems.length > renderProfile.maxMediaItems) {
    errors.push({
      path: 'content.media',
      message: `Too many media items for the ${renderProfile.name} surface. Use at most ${renderProfile.maxMediaItems}.`,
    })
  }

  if (dna.content.data.length > dataBudget) {
    errors.push({
      path: 'content.data',
      message: `${chartType} renders best with at most ${dataBudget} data points on the ${renderProfile.name} surface.`,
    })
  }

  dna.content.data.forEach((point, index) => {
    if (point.label.length > renderProfile.maxLabelLength) {
      errors.push({
        path: `content.data.${index}.label`,
        message: `Labels must stay under ${renderProfile.maxLabelLength} characters for readable rendering.`,
      })
    }
  })

  mediaItems.forEach((item, index) => {
    if ((item.caption?.length ?? 0) > renderProfile.maxMediaCaptionChars) {
      warnings.push({
        path: `content.media.${index}.caption`,
        message: `Media captions should stay under ${renderProfile.maxMediaCaptionChars} characters.`,
      })
    }

    if (item.relevance.length > renderProfile.maxRelevanceChars) {
      warnings.push({
        path: `content.media.${index}.relevance`,
        message: `Media relevance notes should stay under ${renderProfile.maxRelevanceChars} characters.`,
      })
    }

    if (item.usage === 'context' && !item.contextLabel?.trim()) {
      errors.push({
        path: `content.media.${index}.contextLabel`,
        message: 'Context media must render with a visible label.',
      })
    }

    if (item.kind === 'scan-card' && !isReadableScanMedia(item)) {
      errors.push({
        path: `content.media.${index}`,
        message: 'scan-card blocks must use a readable document-style excerpt or define a focusRegion. Full webpage screenshots should use annotated-image or be removed.',
      })
    }
  })

  if ((layoutFamily ?? 'legacy') !== 'legacy' && compiledLayout.rows.length < 3) {
    warnings.push({
      path: 'presentation.layoutFamily',
      message: `${layoutFamily} is present, but the compiled layout is sparse. Consider adding a supporting block or media for better variety.`,
    })
  }

  if (chartType === 'map-chart') {
    const mapData = prepareMapChartData(dna.content.data)

    if (mapData.hasDuplicateCountries && !mapData.hasCityMetadata) {
      warnings.push({
        path: 'content.data',
        message:
          'Repeated country codes are aggregated on map charts. Add metadata.city labels or consolidate duplicates for clearer inspection.',
      })
    }

    if (mapData.hasCityMetadata && dna.content.data.length > 8) {
      warnings.push({
        path: 'content.data',
        message:
          'Hub-style map charts get crowded beyond 8 entries. Trim lower-ranked hubs or switch to a comparison chart if labels start competing for space.',
      })
    }
  }

  if (compiledLayout.blocks.length === 0) {
    errors.push({
      path: 'presentation.components',
      message: 'No renderable blocks were compiled from presentation.components.',
    })
  }

  const semanticConsistency = evaluateSemanticConsistency(dna)
  errors.push(...semanticConsistency.errors)
  warnings.push(...semanticConsistency.warnings)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    compiledLayout,
  }
}

function buildLayoutRows(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  const renderableSlots = dna.presentation.components.filter((slot) => shouldRenderSlot(dna, slot))
  const slots = collectSlots(dna, renderableSlots)
  const layoutFamily = getLayoutFamily(dna)

  switch (layoutFamily) {
    case 'editorial-cover':
      return buildEditorialRows(dna, slots, renderProfile)
    case 'spotlight-rail':
      return buildSpotlightRows(dna, slots, renderProfile)
    case 'evidence-board':
      return buildEvidenceRows(dna, slots, renderProfile)
    case 'briefing-sheet':
      return buildBriefingRows(dna, slots, renderProfile)
    case 'legacy':
    default:
      return buildLegacyRows(dna, renderableSlots, renderProfile)
  }
}

function buildLegacyRows(
  dna: InfographicDNA,
  renderableSlots: ComponentSlotData[],
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  return renderableSlots.map((slot, index) =>
    createRow({
      id: `legacy-${index}`,
      role: getLegacyRowRole(slot.type),
      gap: getDensityGap(getVisualDensity(dna)),
      columns: [
        {
          id: `legacy-${index}-col-0`,
          width: 'full',
          panel: 'none',
          blocks: [
            createBlock({
              dna,
              slot,
              slotIndex: index,
              rowId: `legacy-${index}`,
              columnId: `legacy-${index}-col-0`,
              surface: slot.type === dna.presentation.chartType ? 'hero' : 'plain',
              renderProfile,
            }),
          ],
        },
      ],
    }),
  )
}

function buildEditorialRows(
  dna: InfographicDNA,
  slots: SlotBuckets,
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  const rows: CompiledLayoutRow[] = []
  const densityGap = getDensityGap(getVisualDensity(dna))

  pushHeaderRow(rows, dna, slots.headerSlots, renderProfile)

  if (slots.heroSlot) {
    rows.push(
      createSingleColumnRow({
        id: 'editorial-hero',
        role: 'hero',
        panel: 'hero',
        width: 'full',
        surface: 'hero',
        slots: [slots.heroSlot],
        dna,
        renderProfile,
      }),
    )
  }

  const supportSlots = [
    ...(slots.supportChartSlot ? [slots.supportChartSlot] : []),
    ...slots.secondaryMediaSlots,
  ]

  if (supportSlots.length > 0) {
    rows.push(
      createSingleColumnRow({
        id: 'editorial-support',
        role: 'support',
        panel: 'glass',
        width: 'full',
        surface: 'support',
        slots: supportSlots.slice(0, 2),
        dna,
        renderProfile,
      }),
    )
  }

  pushFooterRows(rows, dna, slots, renderProfile, densityGap)
  return rows
}

function buildSpotlightRows(
  dna: InfographicDNA,
  slots: SlotBuckets,
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  const rows: CompiledLayoutRow[] = []
  const densityGap = getDensityGap(getVisualDensity(dna))

  pushHeaderRow(rows, dna, slots.headerSlots, renderProfile)

  const heroSlot = slots.heroSlot ?? slots.chartSlot
  const sideSlots = [
    ...(slots.supportChartSlot ? [slots.supportChartSlot] : []),
    ...slots.secondaryMediaSlots,
  ]

  if (heroSlot && sideSlots.length > 0) {
    rows.push(
      ...createAdaptivePairRows({
        id: 'spotlight-main',
        role: 'hero',
        gap: densityGap,
        left: {
          width: 'wide',
          panel: 'hero',
          surface: 'hero',
          slots: [heroSlot],
        },
        right: {
          width: 'narrow',
          panel: 'glass',
          surface: 'support',
          slots: sideSlots.slice(0, 2),
        },
        dna,
        renderProfile,
      }),
    )
  } else if (heroSlot) {
    rows.push(
      createSingleColumnRow({
        id: 'spotlight-fallback',
        role: 'hero',
        panel: 'hero',
        width: 'full',
        surface: 'hero',
        slots: [heroSlot],
        dna,
        renderProfile,
      }),
    )
  }

  pushFooterRows(rows, dna, slots, renderProfile, densityGap)
  return rows
}

function buildEvidenceRows(
  dna: InfographicDNA,
  slots: SlotBuckets,
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  const rows: CompiledLayoutRow[] = []
  const densityGap = getDensityGap(getVisualDensity(dna))
  const leadingMedia = slots.mediaSlots[0]
  const supportingSlots = [
    ...(slots.supportChartSlot ? [slots.supportChartSlot] : slots.chartSlot ? [slots.chartSlot] : []),
    ...slots.secondaryMediaSlots,
  ].filter((slot) => slot !== leadingMedia)

  pushHeaderRow(rows, dna, slots.headerSlots, renderProfile)

  if (leadingMedia && supportingSlots.length > 0) {
    rows.push(
      ...createAdaptivePairRows({
        id: 'evidence-main',
        role: 'support',
        gap: densityGap,
        left: {
          width: 'wide',
          panel: 'hero',
          surface: 'hero',
          slots: [leadingMedia],
        },
        right: {
          width: 'narrow',
          panel: 'glass',
          surface: 'support',
          slots: supportingSlots.slice(0, 2),
        },
        dna,
        renderProfile,
      }),
    )
  } else if (slots.chartSlot) {
    rows.push(
      createSingleColumnRow({
        id: 'evidence-fallback',
        role: 'support',
        panel: 'glass',
        width: 'full',
        surface: 'support',
        slots: [slots.chartSlot],
        dna,
        renderProfile,
      }),
    )
  }

  pushFooterRows(rows, dna, slots, renderProfile, densityGap)
  return rows
}

function buildBriefingRows(
  dna: InfographicDNA,
  slots: SlotBuckets,
  renderProfile: RenderProfile,
): CompiledLayoutRow[] {
  const rows: CompiledLayoutRow[] = []
  const densityGap = getDensityGap(getVisualDensity(dna))
  const primarySlot = slots.chartSlot ?? slots.heroSlot
  const sideSlots = [
    ...slots.mediaSlots.filter((slot) => slot !== primarySlot),
  ]

  pushHeaderRow(rows, dna, slots.headerSlots, renderProfile)

  if (primarySlot && sideSlots.length > 0) {
    rows.push(
      ...createAdaptivePairRows({
        id: 'briefing-main',
        role: 'support',
        gap: densityGap,
        left: {
          width: 'wide',
          panel: 'hero',
          surface: 'hero',
          slots: [primarySlot],
        },
        right: {
          width: 'narrow',
          panel: 'glass',
          surface: 'support',
          slots: sideSlots.slice(0, 2),
        },
        dna,
        renderProfile,
      }),
    )
  } else if (primarySlot) {
    rows.push(
      createSingleColumnRow({
        id: 'briefing-primary',
        role: 'hero',
        panel: 'hero',
        width: 'full',
        surface: 'hero',
        slots: [primarySlot],
        dna,
        renderProfile,
      }),
    )
  }

  pushFooterRows(rows, dna, slots, renderProfile, densityGap)
  return rows
}

function pushHeaderRow(
  rows: CompiledLayoutRow[],
  dna: InfographicDNA,
  slots: ComponentSlotData[],
  renderProfile: RenderProfile,
): void {
  if (slots.length === 0) return

  rows.push(
    createSingleColumnRow({
      id: 'header',
      role: 'header',
      panel: 'none',
      width: 'full',
      surface: 'plain',
      slots,
      dna,
      renderProfile,
    }),
  )
}

function pushFooterRows(
  rows: CompiledLayoutRow[],
  dna: InfographicDNA,
  slots: SlotBuckets,
  renderProfile: RenderProfile,
  densityGap: number,
): void {
  if (slots.footnoteSlots.length > 0) {
    rows.push(
      createSingleColumnRow({
        id: 'footer-footnote',
        role: 'footer',
        panel: 'none',
        width: 'full',
        surface: 'plain',
        slots: slots.footnoteSlots,
        dna,
        renderProfile,
      }),
    )
  }

  if (slots.sourceSlots.length > 0) {
    rows.push(
      createRow({
        id: 'footer-sources',
        role: 'footer',
        gap: densityGap,
        columns: [
          createColumn({
            id: 'footer-sources-col',
            width: 'full',
            panel: 'none',
            surface: 'plain',
            slots: slots.sourceSlots,
            dna,
            renderProfile,
          }),
        ],
      }),
    )
  }
}

function createSingleColumnRow({
  id,
  role,
  panel,
  width,
  surface,
  slots,
  dna,
  renderProfile,
}: {
  id: string
  role: CompiledLayoutRow['role']
  panel: CompiledLayoutColumn['panel']
  width: CompiledLayoutColumn['width']
  surface: CompiledLayoutBlock['surface']
  slots: ComponentSlotData[]
  dna: InfographicDNA
  renderProfile: RenderProfile
}): CompiledLayoutRow {
  return createRow({
    id,
    role,
    gap: getDensityGap(getVisualDensity(dna)),
    columns: [
      createColumn({
        id: `${id}-col-0`,
        width,
        panel,
        surface,
        slots,
        dna,
        renderProfile,
      }),
    ],
  })
}

function createAdaptivePairRows({
  id,
  role,
  gap,
  left,
  right,
  dna,
  renderProfile,
}: {
  id: string
  role: CompiledLayoutRow['role']
  gap: number
  left: {
    width: CompiledLayoutColumn['width']
    panel: CompiledLayoutColumn['panel']
    surface: CompiledLayoutBlock['surface']
    slots: ComponentSlotData[]
  }
  right: {
    width: CompiledLayoutColumn['width']
    panel: CompiledLayoutColumn['panel']
    surface: CompiledLayoutBlock['surface']
    slots: ComponentSlotData[]
  }
  dna: InfographicDNA
  renderProfile: RenderProfile
}): CompiledLayoutRow[] {
  if (canUseSplitColumns(dna, renderProfile, gap, left, right)) {
    return [
      createRow({
        id,
        role,
        gap,
        columns: [
          createColumn({
            id: `${id}-left`,
            width: left.width,
            panel: left.panel,
            surface: left.surface,
            slots: left.slots,
            dna,
            renderProfile,
          }),
          createColumn({
            id: `${id}-right`,
            width: right.width,
            panel: right.panel,
            surface: right.surface,
            slots: right.slots,
            dna,
            renderProfile,
          }),
        ],
      }),
    ]
  }

  return [
    createSingleColumnRow({
      id: `${id}-primary`,
      role,
      panel: left.panel,
      width: 'full',
      surface: left.surface,
      slots: left.slots,
      dna,
      renderProfile,
    }),
    createSingleColumnRow({
      id: `${id}-secondary`,
      role: 'support',
      panel: right.panel,
      width: 'full',
      surface: right.surface,
      slots: right.slots,
      dna,
      renderProfile,
    }),
  ]
}

function createRow({
  id,
  role,
  gap,
  columns,
}: {
  id: string
  role: CompiledLayoutRow['role']
  gap: number
  columns: CompiledLayoutColumn[]
}): CompiledLayoutRow {
  return {
    id,
    role,
    gap,
    columns,
  }
}

function createColumn({
  id,
  width,
  panel,
  surface,
  slots,
  dna,
  renderProfile,
}: {
  id: string
  width: CompiledLayoutColumn['width']
  panel: CompiledLayoutColumn['panel']
  surface: CompiledLayoutBlock['surface']
  slots: ComponentSlotData[]
  dna: InfographicDNA
  renderProfile: RenderProfile
}): CompiledLayoutColumn {
  return {
    id,
    width,
    panel,
    blocks: slots.map((slot, slotIndex) =>
      createBlock({
        dna,
        slot,
        slotIndex,
        rowId: id.split('-col-')[0] ?? id,
        columnId: id,
        surface,
        renderProfile,
      }),
    ),
  }
}

function createBlock({
  dna,
  slot,
  slotIndex,
  rowId,
  columnId,
  surface,
  renderProfile,
}: {
  dna: InfographicDNA
  slot: ComponentSlotData
  slotIndex: number
  rowId: string
  columnId: string
  surface: CompiledLayoutBlock['surface']
  renderProfile: RenderProfile
}): CompiledLayoutBlock {
  return {
    id: `${rowId}-${columnId}-${slot.type}-${slotIndex}`,
    slot,
    type: slot.type,
    kind: getBlockKind(slot.type),
    align: getBlockAlignment(dna.presentation.layout, slot.type, getLayoutFamily(dna)),
    estimatedHeight: estimateBlockHeight(dna, slot, renderProfile),
    rowId,
    columnId,
    surface,
    animation: {
      startFrame: 0,
      revealFrames: estimateRevealFrames(dna, slot.type),
    },
  }
}

function assignAnimationTiming(rows: CompiledLayoutRow[]): CompiledLayoutRow[] {
  let frameCursor = 0

  return rows.map((row) => {
    const timedColumns = row.columns.map((column) => {
      const timedBlocks = column.blocks.map((block) => {
        const timedBlock: CompiledLayoutBlock = {
          ...block,
          animation: {
            startFrame: frameCursor,
            revealFrames: block.animation.revealFrames,
          },
        }

        frameCursor += getFrameAdvance(block)
        return timedBlock
      })

      return {
        ...column,
        blocks: timedBlocks,
      }
    })

    frameCursor += 8

    return {
      ...row,
      columns: timedColumns,
    }
  })
}

function collectSlots(
  dna: InfographicDNA,
  renderableSlots: ComponentSlotData[],
): SlotBuckets {
  const headerSlots = renderableSlots.filter((slot) =>
    slot.type === 'title' || slot.type === 'subtitle' || slot.type === 'hook',
  )
  const chartSlot = renderableSlots.find((slot) => slot.type === dna.presentation.chartType)
  const mediaSlots = renderableSlots.filter((slot) => isMediaComponentType(slot.type))
  const footnoteSlots = renderableSlots.filter((slot) => slot.type === 'footnote')
  const sourceSlots = renderableSlots.filter((slot) => slot.type === 'source-badge')
  let heroSlot: ComponentSlotData | undefined

  const heroBlock = getHeroBlock(dna)

  if (heroBlock === 'chart' || heroBlock === 'stat-card') {
    heroSlot = chartSlot
  } else {
    heroSlot = mediaSlots.find((slot) => slot.type === heroBlock)
  }

  const secondaryMediaSlots = mediaSlots.filter((slot) => slot !== heroSlot)
  const supportChartSlot = chartSlot && chartSlot !== heroSlot ? chartSlot : undefined

  return {
    headerSlots,
    chartSlot,
    heroSlot,
    mediaSlots,
    secondaryMediaSlots,
    supportChartSlot,
    footnoteSlots,
    sourceSlots,
  }
}

function shouldRenderSlot(dna: InfographicDNA, slot: ComponentSlotData): boolean {
  switch (slot.type) {
    case 'subtitle':
      return Boolean(dna.content.subtitle)
    case 'hook':
      return Boolean(dna.content.hook)
    case 'footnote':
      return Boolean(dna.content.footnotes)
    case 'source-badge':
      return dna.content.sources.length > 0
    default:
      if (isMediaComponentType(slot.type)) {
        return Boolean(getMediaItem(dna, slot))
      }

      return true
  }
}

function getBlockKind(type: ComponentTypeValue): CompiledLayoutBlock['kind'] {
  if (type === 'source-badge') return 'sources'
  if (type === 'footnote') return 'footnote'
  if (isMediaComponentType(type)) return 'media'
  if (type.endsWith('chart') || type === 'timeline' || type === 'stat-card' || type === 'pictogram' || type === 'vs-split') {
    return 'chart'
  }

  return 'text'
}

function getBlockAlignment(
  layout: LayoutTypeValue,
  type: ComponentTypeValue,
  layoutFamily: LayoutFamilyValue,
): 'left' | 'center' {
  if (layoutFamily === 'editorial-cover' && type === 'title') return 'center'

  if (type === 'source-badge' || getBlockKind(type) === 'chart' || getBlockKind(type) === 'media') {
    return layout === 'centered' ? 'center' : 'left'
  }

  return layout === 'centered' ? 'center' : 'left'
}

function estimateBlockHeight(
  dna: InfographicDNA,
  slot: ComponentSlotData,
  renderProfile: RenderProfile,
): number {
  const titleLines = estimateLines(dna.content.title, renderProfile.titleCharsPerLine)
  const subtitleLines = estimateLines(dna.content.subtitle, renderProfile.subtitleCharsPerLine)
  const hookLines = estimateLines(dna.content.hook, renderProfile.hookCharsPerLine)
  const footnoteLines = estimateLines(dna.content.footnotes, renderProfile.footnoteCharsPerLine)
  const sourceRows = Math.ceil(dna.content.sources.length / 2)

  switch (slot.type) {
    case 'title':
      return 48 + titleLines * 22
    case 'subtitle':
      return subtitleLines > 0 ? 18 + subtitleLines * 18 : 0
    case 'hook':
      return hookLines > 0 ? 24 + hookLines * 22 : 0
    case 'footnote':
      return footnoteLines > 0 ? 18 + footnoteLines * 14 : 0
    case 'source-badge':
      return 22 + sourceRows * 22
    case 'hero-image':
    case 'annotated-image':
    case 'scan-card':
      return estimateMediaHeight(dna, slot)
    default:
      return estimateChartHeight(dna)
  }
}

function estimateMediaHeight(dna: InfographicDNA, slot: ComponentSlotData): number {
  const media = getMediaItem(dna, slot)
  if (!media) return 0

  const captionLines = estimateLines(media.caption, 32)
  const relevanceLines = estimateLines(media.relevance, 34)
  const annotationCount = media.annotations?.length ?? 0

  switch (slot.type) {
    case 'annotated-image':
      return 320 + captionLines * 18 + relevanceLines * 16 + annotationCount * 20
    case 'scan-card':
      return 260 + captionLines * 18 + relevanceLines * 16
    case 'hero-image':
    default:
      return 300 + captionLines * 18 + relevanceLines * 16
  }
}

function estimateChartHeight(dna: InfographicDNA): number {
  const dataCount = dna.content.data.length

  switch (dna.presentation.chartType) {
    case 'timeline':
      return 250 + dataCount * 24
    case 'pictogram':
      return 240 + dataCount * 34
    case 'map-chart':
      return estimateMapChartHeight(dna)
    case 'vs-split':
      return 260
    case 'stat-card':
      return 220
    default:
      return 300 + Math.max(0, dataCount - 4) * 12
  }
}

function estimateMapChartHeight(dna: InfographicDNA): number {
  const mapData = prepareMapChartData(dna.content.data)
  const detailEntryCount = mapData.rankedEntries.slice(1, mapData.hasCityMetadata ? 6 : 5).length
  const mapPanelHeight = mapData.hasCityMetadata ? 420 : 380
  const spotlightHeight = mapData.hasCityMetadata ? 250 : 300

  if (detailEntryCount === 0) {
    return mapPanelHeight + spotlightHeight
  }

  const compactCardHeight = mapData.hasCityMetadata ? 128 : 168
  const detailStackHeight = detailEntryCount * compactCardHeight + Math.max(0, detailEntryCount - 1) * 8

  return mapPanelHeight + 16 + spotlightHeight + 12 + detailStackHeight
}

function estimateRevealFrames(dna: InfographicDNA, type: ComponentTypeValue): number {
  const dataCount = dna.content.data.length

  switch (type) {
    case 'title':
      return 28
    case 'subtitle':
      return 20
    case 'hook':
      return 24
    case 'footnote':
      return 18
    case 'source-badge':
      return 20 + Math.min(dna.content.sources.length, 4) * 4
    case 'hero-image':
    case 'annotated-image':
    case 'scan-card':
      return 76
    default:
      switch (dna.presentation.chartType) {
        case 'timeline':
          return 90 + dataCount * 12
        case 'pictogram':
          return 110 + dataCount * 16
        case 'map-chart': {
          const mapData = prepareMapChartData(dna.content.data)
          return mapData.hasCityMetadata ? 178 : 150
        }
        case 'bar-chart':
        case 'grouped-bar-chart':
          return 96 + dataCount * 10
        case 'pie-chart':
        case 'donut-chart':
          return 96 + dataCount * 12
        case 'line-chart':
        case 'area-chart':
          return 100 + dataCount * 8
        case 'vs-split':
          return 110
        case 'stat-card':
          return 96
      }
  }
}

function getFrameAdvance(block: CompiledLayoutBlock): number {
  if (block.kind === 'chart') {
    return Math.max(42, Math.round(block.animation.revealFrames * 0.55))
  }

  if (block.kind === 'media') {
    return Math.max(30, Math.round(block.animation.revealFrames * 0.45))
  }

  if (block.kind === 'sources') {
    return 18
  }

  return 14
}

function estimateCompositionHeight(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
  rows: CompiledLayoutRow[],
): number {
  const visualDensity = getVisualDensity(dna)
  const rowHeights = rows.map((row) => estimateRowHeight(visualDensity, row))
  const verticalGap = getDensityGap(visualDensity)
  const totalHeight =
    32 +
    rowHeights.reduce((sum, height) => sum + height, 0) +
    Math.max(0, rows.length - 1) * verticalGap +
    32

  return Math.max(renderProfile.baseHeight, totalHeight)
}

function estimateRowHeight(
  visualDensity: VisualDensityValue,
  row: CompiledLayoutRow,
): number {
  return Math.max(
    ...row.columns.map((column) =>
      column.blocks.reduce(
        (sum, block, index) =>
          sum + block.estimatedHeight + (index > 0 ? getColumnGap(visualDensity) : 0),
        0,
      ),
    ),
    0,
  )
}

function getCompositionWidth(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
): number {
  const layoutFamily = getLayoutFamily(dna)
  const mediaItems = getMediaItems(dna)

  if (
    layoutFamily === 'spotlight-rail' ||
    layoutFamily === 'evidence-board' ||
    layoutFamily === 'briefing-sheet'
  ) {
    return 680
  }

  if (dna.presentation.chartType === 'map-chart' || mediaItems.length > 0) {
    return 660
  }

  if (dna.presentation.layout === 'split' || dna.presentation.chartType === 'vs-split') {
    return 640
  }

  return renderProfile.width
}

function canUseSplitColumns(
  dna: InfographicDNA,
  renderProfile: RenderProfile,
  gap: number,
  left: {
    width: CompiledLayoutColumn['width']
    slots: ComponentSlotData[]
  },
  right: {
    width: CompiledLayoutColumn['width']
    slots: ComponentSlotData[]
  },
): boolean {
  const availableWidth = getCompositionWidth(dna, renderProfile) - 32
  const totalWeight = getColumnFlexValue(left.width) + getColumnFlexValue(right.width)
  const usableWidth = availableWidth - gap
  const leftWidth = (usableWidth * getColumnFlexValue(left.width)) / totalWeight
  const rightWidth = (usableWidth * getColumnFlexValue(right.width)) / totalWeight

  return (
    leftWidth >= getRequiredColumnWidth(left.width, left.slots) &&
    rightWidth >= getRequiredColumnWidth(right.width, right.slots)
  )
}

function getRequiredColumnWidth(
  width: CompiledLayoutColumn['width'],
  slots: ComponentSlotData[],
): number {
  const baseWidth =
    width === 'wide'
      ? 300
      : width === 'narrow'
        ? 280
        : width === 'equal'
          ? 250
          : 0

  return Math.max(baseWidth, ...slots.map((slot) => getRequiredSlotWidth(slot.type)))
}

function getRequiredSlotWidth(type: ComponentTypeValue): number {
  switch (type) {
    case 'map-chart':
      return 340
    case 'scan-card':
      return 320
    case 'annotated-image':
    case 'hero-image':
      return 300
    case 'timeline':
      return 300
    case 'grouped-bar-chart':
    case 'bar-chart':
    case 'line-chart':
    case 'area-chart':
      return 270
    case 'pie-chart':
    case 'donut-chart':
    case 'pictogram':
    case 'vs-split':
    case 'stat-card':
      return 220
    case 'title':
      return 260
    default:
      return 180
  }
}

function getColumnFlexValue(width: CompiledLayoutColumn['width']): number {
  switch (width) {
    case 'wide':
      return 1.12
    case 'narrow':
      return 0.88
    case 'equal':
      return 1
    case 'full':
    default:
      return 1
  }
}

function getMediaItems(dna: InfographicDNA) {
  return dna.content.media ?? []
}

function getLayoutFamily(dna: InfographicDNA): LayoutFamilyValue {
  return dna.presentation.layoutFamily ?? 'legacy'
}

function getVisualDensity(dna: InfographicDNA): VisualDensityValue {
  return dna.presentation.visualDensity ?? 'balanced'
}

function getHeroBlock(dna: InfographicDNA) {
  if (dna.presentation.heroBlock) return dna.presentation.heroBlock
  return dna.presentation.chartType === 'stat-card' ? 'stat-card' : 'chart'
}

function getLegacyRowRole(type: ComponentTypeValue): CompiledLayoutRow['role'] {
  switch (type) {
    case 'title':
    case 'subtitle':
    case 'hook':
      return 'header'
    case 'footnote':
    case 'source-badge':
      return 'footer'
    default:
      return 'hero'
  }
}

function getDensityGap(visualDensity: VisualDensityValue): number {
  switch (visualDensity) {
    case 'minimal':
      return 18
    case 'dense':
      return 12
    case 'balanced':
    default:
      return 16
  }
}

function getColumnGap(visualDensity: VisualDensityValue): number {
  switch (visualDensity) {
    case 'minimal':
      return 16
    case 'dense':
      return 10
    case 'balanced':
    default:
      return 12
  }
}

function estimateLines(text: string | undefined, charsPerLine: number): number {
  if (!text?.trim()) return 0

  const words = text.trim().split(/\s+/)
  let lines = 1
  let currentLineLength = 0

  for (const word of words) {
    if (currentLineLength === 0) {
      currentLineLength = word.length
      continue
    }

    if (currentLineLength + 1 + word.length > charsPerLine) {
      lines++
      currentLineLength = word.length
      continue
    }

    currentLineLength += 1 + word.length
  }

  return lines
}

function assertLineBudget(
  bucket: DNAWarning[],
  path: string,
  text: string | undefined,
  charsPerLine: number,
  maxLines: number,
  label: string,
): void {
  const lines = estimateLines(text, charsPerLine)
  if (lines > maxLines) {
    bucket.push({
      path,
      message: `${label} is too long for the render surface. Keep it within ${maxLines} lines.`,
    })
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
