import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import type { Payload } from 'payload'
import { ensureAntVDocumentPanels, getPanelDataGroup } from './panels'
import type { InfographicDocumentV2 } from './schema'
import { themeNameToColors } from './theme'

const ANT_V_IMPORT_TIMEOUT_MS = 12000
const ENABLE_ANTV_NATIVE_SSR = process.env.ENABLE_ANTV_NATIVE_SSR === 'true'

export async function renderAntVDocumentToSVG(
  document: InfographicDocumentV2,
): Promise<string> {
  const normalized = ensureAntVDocumentPanels(document)
  const canAttemptNativeSSR = ENABLE_ANTV_NATIVE_SSR && normalized.presentation.panels.length <= 1

  if (canAttemptNativeSSR) {
    const nativeSvg = await tryRenderAntVNative(document)
    if (nativeSvg) {
      return nativeSvg
    }
  }

  return renderFallbackSceneSVG(document)
}

export async function renderAntVDocumentToMedia(
  payload: Payload,
  document: InfographicDocumentV2,
  title: string,
): Promise<{ id: number | string; url?: string | null }> {
  const svg = await renderAntVDocumentToSVG(document)
  const mediaSvg = svgContainsForeignObject(svg)
    ? renderFallbackSceneSVG(document)
    : svg
  const buffer = await sharp(Buffer.from(mediaSvg)).webp({ quality: 92 }).toBuffer()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'infographedia-antv-'))
  const tempFile = path.join(tempDir, `${sanitizeFilename(title)}.webp`)

  await fs.writeFile(tempFile, buffer)

  try {
    return await payload.create({
      collection: 'media',
      filePath: tempFile,
      data: {
        alt: title,
        relevance: 'Server-rendered AntV preview artifact.',
      } as Record<string, unknown>,
    }) as { id: number | string; url?: string | null }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

function svgContainsForeignObject(svg: string): boolean {
  return /<foreignObject[\s>]/i.test(svg)
}

async function tryRenderAntVNative(
  document: InfographicDocumentV2,
): Promise<string | null> {
  try {
    const module = await Promise.race([
      import('@antv/infographic/ssr'),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out while importing AntV SSR renderer.')), ANT_V_IMPORT_TIMEOUT_MS)
      }),
    ])

    return await module.renderToString(document.antv.syntax, {
      width: document.antv.renderMeta.width,
      height: document.antv.renderMeta.height,
      padding: 24,
    })
  } catch (error) {
    console.warn(
      '[antv-render] Falling back to summary SVG:',
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

function renderFallbackSceneSVG(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation' | 'antv'>,
): string {
  const normalizedPanels = ensureAntVDocumentPanels({
    content: document.content,
    presentation: document.presentation,
  })
  const normalized = {
    ...document,
    content: normalizedPanels.content,
    presentation: normalizedPanels.presentation,
  }
  const colors = themeNameToColors(normalized.presentation.themeName)
  const width = normalized.antv.renderMeta.width
  const height = normalized.antv.renderMeta.height
  const panels = normalized.presentation.panels
  const headerHeight = 180
  const footerHeight = 120
  const margin = 28
  const gap = 18
  const panelRects = buildPanelRects({
    width,
    height: height - headerHeight - footerHeight,
    panelCount: panels.length,
    layout: normalized.presentation.panelLayout,
    x: margin,
    y: headerHeight,
    gap,
  })

  const titleLines = wrapText(normalized.content.title, 28, 2)
  const subtitleLines = wrapText(normalized.content.subtitle ?? '', 48, 3)
  const hookLines = wrapText(normalized.content.hook ?? '', 42, 2)
  const footnote = [normalized.content.footnotes, ...normalized.content.caveats]
    .filter(Boolean)
    .join(' ')
    .trim()
  const footnoteLines = wrapText(footnote, 72, 3)
  const sourceLine = normalized.content.sources
    .slice(0, 3)
    .map((source) => source.name)
    .join(' • ')

  const panelMarkup = panels
    .map((panel, index) => renderPanelCard(normalized, panel, panelRects[index]!, colors))
    .join('')

  const titleMarkup = renderTextLines({
    lines: titleLines,
    x: width / 2,
    y: 62,
    lineHeight: 36,
    anchor: 'middle',
    fill: colors.text,
    fontSize: 30,
    fontWeight: 700,
  })

  const subtitleMarkup = subtitleLines.length > 0
    ? renderTextLines({
        lines: subtitleLines,
        x: width / 2,
        y: 134,
        lineHeight: 22,
        anchor: 'middle',
        fill: withAlpha(colors.text, 0.78),
        fontSize: 16,
        fontWeight: 400,
      })
    : ''

  const hookMarkup = hookLines.length > 0
    ? renderTextLines({
        lines: hookLines,
        x: width / 2,
        y: 134 + subtitleLines.length * 22 + 30,
        lineHeight: 24,
        anchor: 'middle',
        fill: colors.accent ?? colors.primary,
        fontSize: 18,
        fontWeight: 700,
      })
    : ''

  const footerY = height - footerHeight + 16
  const footnoteMarkup = footnoteLines.length > 0
    ? renderTextLines({
        lines: footnoteLines,
        x: margin,
        y: footerY,
        lineHeight: 20,
        anchor: 'start',
        fill: withAlpha(colors.text, 0.65),
        fontSize: 13,
        fontWeight: 400,
      })
    : ''
  const sourcesMarkup = sourceLine
    ? `<text x="${margin}" y="${height - 18}" fill="${withAlpha(colors.text, 0.85)}" font-size="12" font-family="Arial, sans-serif">Sources: ${escapeXml(sourceLine)}</text>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${colors.background}" />
      <stop offset="100%" stop-color="${withAlpha(colors.background, 0.94)}" />
    </linearGradient>
    <linearGradient id="panelGlow" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${withAlpha(colors.text, 0.1)}" />
      <stop offset="100%" stop-color="${withAlpha(colors.primary, 0.05)}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="28" fill="url(#bg)" />
  <rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="${withAlpha(colors.text, 0.02)}" />
  ${titleMarkup}
  ${subtitleMarkup}
  ${hookMarkup}
  ${panelMarkup}
  ${footnoteMarkup}
  ${sourcesMarkup}
</svg>`
}

function renderPanelCard(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation' | 'antv'>,
  panel: InfographicDocumentV2['presentation']['panels'][number],
  rect: { x: number; y: number; width: number; height: number },
  colors: ReturnType<typeof themeNameToColors>,
): string {
  const group = getPanelDataGroup(document, panel)
  const title = panel.title ?? group?.label ?? panel.viewType
  const items = group?.items.slice(0, panel.role === 'primary' ? 10 : 6) ?? []

  if (panel.viewType === 'timeline' || document.presentation.templateFamily.startsWith('sequence-')) {
    return renderTimelinePanelCard(rect, colors, title, items)
  }

  if (panel.viewType === 'compare' || document.presentation.templateFamily.startsWith('compare-')) {
    return renderComparePanelCard(document, rect, colors, title)
  }

  if (panel.chartType === 'bar-chart' || panel.viewType === 'bar' || panel.viewType === 'list') {
    return renderRankingPanelCard(document, panel, rect, colors, title, items)
  }

  const innerX = rect.x + 18
  const innerY = rect.y + 24
  const badgeWidth = Math.max(80, panel.viewType.length * 10 + 20)
  const badgeX = rect.x + rect.width - badgeWidth - 18
  const badgeTextX = badgeX + badgeWidth / 2
  const summaryValue = items[0]?.value
  const summaryUnit = items[0]?.unit ?? ''
  const summaryText =
    typeof summaryValue === 'number'
      ? `${formatNumber(summaryValue)}${summaryUnit}`
      : (group?.summary ?? '')
  const linesMarkup = items
    .map((item, index) => {
      const y = innerY + 84 + index * 38
      const detail = typeof item.value === 'number'
        ? `${formatNumber(item.value)}${item.unit ?? ''}${item.description ? ` • ${item.description}` : ''}`
        : item.description ?? ''

      const labelLine = `<text x="${innerX}" y="${y}" fill="${colors.text}" font-size="15" font-weight="600" font-family="Arial, sans-serif">${escapeXml(item.label)}</text>`
      const detailLine = detail
        ? `<text x="${innerX}" y="${y + 18}" fill="${withAlpha(colors.text, 0.72)}" font-size="12" font-family="Arial, sans-serif">${escapeXml(detail)}</text>`
        : ''

      return `${labelLine}${detailLine}`
    })
    .join('')

  const mediaLabel = document.content.media[0]
    ? (document.content.media[0].caption ?? document.content.media[0].alt)
    : ''
  const mediaHint = panel.viewType === 'media' && document.content.media[0]
    ? `<text x="${innerX}" y="${innerY + 88}" fill="${withAlpha(colors.text, 0.72)}" font-size="13" font-family="Arial, sans-serif">${escapeXml(mediaLabel)}</text>`
    : ''

  return `
    <g>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="24" fill="url(#panelGlow)" stroke="${withAlpha(colors.text, 0.14)}" />
      <text x="${innerX}" y="${innerY}" fill="${withAlpha(colors.text, 0.72)}" font-size="11" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">${escapeXml(panel.role === 'primary' ? 'PRIMARY PANEL' : 'SUPPORT PANEL')}</text>
      <text x="${innerX}" y="${innerY + 34}" fill="${colors.text}" font-size="${panel.role === 'primary' ? 22 : 19}" font-weight="700" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      <rect x="${badgeX}" y="${rect.y + 18}" width="${badgeWidth}" height="30" rx="15" fill="${colors.primary}" />
      <text x="${badgeTextX}" y="${rect.y + 37}" text-anchor="middle" fill="${colors.background}" font-size="12" font-weight="700" font-family="Arial, sans-serif">${escapeXml(panel.viewType.toUpperCase())}</text>
      ${summaryText ? `<text x="${innerX}" y="${innerY + 64}" fill="${colors.accent ?? colors.primary}" font-size="${panel.role === 'primary' ? 30 : 24}" font-weight="700" font-family="Arial, sans-serif">${escapeXml(summaryText)}</text>` : ''}
      ${linesMarkup}
      ${mediaHint}
    </g>
  `
}

function renderTimelinePanelCard(
  rect: { x: number; y: number; width: number; height: number },
  colors: ReturnType<typeof themeNameToColors>,
  title: string,
  items: Array<{
    label: string
    value?: number
    unit?: string
    description?: string
    time?: string
  }>,
): string {
  const innerX = rect.x + 18
  const innerY = rect.y + 24
  const safeItems = items.slice(0, 5)
  const lineX = innerX + 92
  const rowGap = safeItems.length > 1
    ? Math.min(74, Math.max(54, Math.floor((rect.height - 150) / Math.max(safeItems.length - 1, 1))))
    : 0
  const startY = innerY + 92
  const gradientId = `timeline-${rect.x}-${rect.y}`
  const lastY = startY + rowGap * Math.max(safeItems.length - 1, 0)

  const rowsMarkup = safeItems
    .map((item, index) => {
      const y = startY + index * rowGap
      const yearText = truncateText(item.time ?? `STEP ${index + 1}`, 10).toUpperCase()
      const cardX = lineX + 28
      const cardWidth = rect.width - (cardX - rect.x) - 24
      const cardHeight = 42
      const desc = truncateText(item.label, 48)

      return `
        <g>
          <text x="${innerX}" y="${y + 6}" fill="${index % 2 === 0 ? colors.primary : colors.secondary ?? colors.primary}" font-size="17" font-weight="700" font-family="Arial, sans-serif">${escapeXml(yearText)}</text>
          <circle cx="${lineX}" cy="${y}" r="6" fill="${index % 2 === 0 ? colors.primary : colors.secondary ?? colors.primary}" />
          <rect x="${cardX}" y="${y - 20}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="${withAlpha(index % 2 === 0 ? colors.primary : colors.secondary ?? colors.primary, 0.2)}" stroke="${index % 2 === 0 ? colors.primary : colors.secondary ?? colors.primary}" stroke-width="1" />
          <text x="${cardX + 18}" y="${y + 5}" fill="${colors.text}" font-size="14" font-weight="600" font-family="Arial, sans-serif">${escapeXml(desc)}</text>
        </g>
      `
    })
    .join('')

  return `
    <g>
      <defs>
        <linearGradient id="${gradientId}" x1="${lineX}" y1="${startY}" x2="${lineX}" y2="${lastY || startY}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${colors.primary}" />
          <stop offset="100%" stop-color="${colors.secondary ?? colors.accent ?? colors.primary}" />
        </linearGradient>
      </defs>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="24" fill="url(#panelGlow)" stroke="${withAlpha(colors.text, 0.14)}" />
      <text x="${innerX}" y="${innerY}" fill="${withAlpha(colors.text, 0.72)}" font-size="11" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">PRIMARY PANEL</text>
      <text x="${innerX}" y="${innerY + 34}" fill="${colors.text}" font-size="22" font-weight="700" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      <path d="M ${lineX} ${startY} L ${lineX} ${lastY || startY}" stroke="url(#${gradientId})" stroke-width="3" />
      ${rowsMarkup}
    </g>
  `
}

function renderComparePanelCard(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation' | 'antv'>,
  rect: { x: number; y: number; width: number; height: number },
  colors: ReturnType<typeof themeNameToColors>,
  title: string,
): string {
  const groups = document.content.dataGroups.slice(0, 2)
  if (groups.length < 2) {
    return renderPanelCardFallback(rect, colors, title, [])
  }

  const innerX = rect.x + 18
  const innerY = rect.y + 24
  const columnGap = 18
  const centerSize = Math.min(92, Math.floor(rect.width * 0.14))
  const leftWidth = Math.floor((rect.width - 36 - centerSize - columnGap * 2) / 2)
  const leftX = rect.x + 18
  const rightX = leftX + leftWidth + columnGap + centerSize + columnGap
  const cardWidth = leftWidth
  const cardHeight = 80
  const startY = innerY + 86

  const renderSide = (
    group: typeof groups[number],
    x: number,
    align: 'start' | 'end',
    fill: string,
  ) => group.items.slice(0, 2).map((item, index) => {
    const y = startY + index * (cardHeight + 18)
    return `
      <g transform="translate(${x}, ${y})">
        <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="10" fill="${withAlpha(fill, 0.2)}" />
        <text x="${align === 'end' ? cardWidth - 12 : 12}" y="26" text-anchor="${align}" fill="${colors.text}" font-size="14" font-weight="700" font-family="Arial, sans-serif">${escapeXml(truncateText(item.label, 24))}</text>
        <text x="${align === 'end' ? cardWidth - 12 : 12}" y="54" text-anchor="${align}" fill="${withAlpha(colors.text, 0.82)}" font-size="11" font-family="Arial, sans-serif">${escapeXml(truncateText(item.description ?? formatPanelValue(item), 34))}</text>
      </g>
    `
  }).join('')

  const badgeX = rect.x + (rect.width - centerSize) / 2
  const badgeY = startY + 16

  return `
    <g>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="24" fill="url(#panelGlow)" stroke="${withAlpha(colors.text, 0.14)}" />
      <text x="${innerX}" y="${innerY}" fill="${withAlpha(colors.text, 0.72)}" font-size="11" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">PRIMARY PANEL</text>
      <text x="${innerX}" y="${innerY + 34}" fill="${colors.text}" font-size="22" font-weight="700" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      ${renderSide(groups[0]!, leftX, 'end', colors.primary)}
      ${renderSide(groups[1]!, rightX, 'start', colors.secondary ?? colors.primary)}
      <circle cx="${badgeX + centerSize / 2}" cy="${badgeY + centerSize / 2}" r="${centerSize / 2}" fill="${withAlpha(colors.primary, 0.92)}" />
      <text x="${badgeX + centerSize / 2}" y="${badgeY + centerSize / 2 + 4}" text-anchor="middle" fill="${colors.background}" font-size="${Math.floor(centerSize * 0.48)}" font-weight="800" font-family="Arial, sans-serif">VS</text>
    </g>
  `
}

function renderPanelCardFallback(
  rect: { x: number; y: number; width: number; height: number },
  colors: ReturnType<typeof themeNameToColors>,
  title: string,
  lines: string[],
): string {
  const innerX = rect.x + 18
  const innerY = rect.y + 24
  const linesMarkup = lines
    .map((line, index) => `<text x="${innerX}" y="${innerY + 84 + index * 24}" fill="${withAlpha(colors.text, 0.78)}" font-size="13" font-family="Arial, sans-serif">${escapeXml(line)}</text>`)
    .join('')

  return `
    <g>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="24" fill="url(#panelGlow)" stroke="${withAlpha(colors.text, 0.14)}" />
      <text x="${innerX}" y="${innerY}" fill="${withAlpha(colors.text, 0.72)}" font-size="11" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">PRIMARY PANEL</text>
      <text x="${innerX}" y="${innerY + 34}" fill="${colors.text}" font-size="22" font-weight="700" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      ${linesMarkup}
    </g>
  `
}

function renderRankingPanelCard(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation' | 'antv'>,
  panel: InfographicDocumentV2['presentation']['panels'][number],
  rect: { x: number; y: number; width: number; height: number },
  colors: ReturnType<typeof themeNameToColors>,
  title: string,
  items: Array<{
    label: string
    value?: number
    unit?: string
    description?: string
    metadata?: Record<string, string>
  }>,
): string {
  const innerX = rect.x + 18
  const innerY = rect.y + 24
  const badgeWidth = Math.max(80, panel.viewType.length * 10 + 20)
  const badgeX = rect.x + rect.width - badgeWidth - 18
  const badgeTextX = badgeX + badgeWidth / 2
  const observedValueCount = items.filter((item) => item.metadata?.metric === 'score').length
  const useObservedBars = observedValueCount >= Math.ceil(items.length * 0.6)
  const maxValue = Math.max(...items.map((item) => item.value ?? 0), 1)
  const contentTop = innerY + 74
  const availableHeight = rect.height - 110
  const rowHeight = Math.max(34, Math.min(68, Math.floor(availableHeight / Math.max(items.length, 1))))
  const barX = innerX + 138
  const barWidth = rect.width - 220
  const labelWidth = 126

  const rowsMarkup = items
    .map((item, index) => {
      const y = contentTop + index * rowHeight
      const rankLabel = item.metadata?.rank ? `#${item.metadata.rank}` : `#${index + 1}`
      const scoreText = formatPanelValue(item)
      const normalizedValue = useObservedBars
        ? Math.max(0.12, (item.value ?? 0) / maxValue)
        : Math.max(0.12, (items.length - index) / Math.max(items.length, 1))
      const fillWidth = Math.max(18, Math.round(barWidth * normalizedValue))
      const label = truncateText(item.label, labelWidth <= 110 ? 12 : 18)
      const valueX = rect.x + rect.width - 22

      return `
        <g>
          <rect x="${innerX}" y="${y - 16}" width="48" height="24" rx="12" fill="${withAlpha(colors.primary, 0.18)}" />
          <text x="${innerX + 24}" y="${y}" text-anchor="middle" fill="${colors.primary}" font-size="12" font-weight="700" font-family="Arial, sans-serif">${escapeXml(rankLabel)}</text>
          <text x="${innerX + 58}" y="${y}" fill="${colors.text}" font-size="15" font-weight="600" font-family="Arial, sans-serif">${escapeXml(label)}</text>
          <text x="${valueX}" y="${y}" text-anchor="end" fill="${withAlpha(colors.text, 0.82)}" font-size="13" font-weight="600" font-family="Arial, sans-serif">${escapeXml(scoreText)}</text>
          <rect x="${barX}" y="${y + 10}" width="${barWidth}" height="10" rx="5" fill="${withAlpha(colors.text, 0.08)}" />
          <rect x="${barX}" y="${y + 10}" width="${fillWidth}" height="10" rx="5" fill="${colors.primary}" />
        </g>
      `
    })
    .join('')

  const metricLabel = useObservedBars ? 'Observed score' : 'Grounded rank'

  return `
    <g>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="24" fill="url(#panelGlow)" stroke="${withAlpha(colors.text, 0.14)}" />
      <text x="${innerX}" y="${innerY}" fill="${withAlpha(colors.text, 0.72)}" font-size="11" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">${escapeXml(panel.role === 'primary' ? 'PRIMARY PANEL' : 'SUPPORT PANEL')}</text>
      <text x="${innerX}" y="${innerY + 34}" fill="${colors.text}" font-size="${panel.role === 'primary' ? 22 : 19}" font-weight="700" font-family="Arial, sans-serif">${escapeXml(title)}</text>
      <text x="${innerX}" y="${innerY + 56}" fill="${withAlpha(colors.text, 0.68)}" font-size="12" font-weight="500" font-family="Arial, sans-serif">${escapeXml(metricLabel)}</text>
      <rect x="${badgeX}" y="${rect.y + 18}" width="${badgeWidth}" height="30" rx="15" fill="${colors.primary}" />
      <text x="${badgeTextX}" y="${rect.y + 37}" text-anchor="middle" fill="${colors.background}" font-size="12" font-weight="700" font-family="Arial, sans-serif">${escapeXml(panel.viewType.toUpperCase())}</text>
      ${rowsMarkup}
    </g>
  `
}

function buildPanelRects(input: {
  width: number
  height: number
  panelCount: number
  layout: InfographicDocumentV2['presentation']['panelLayout']
  x: number
  y: number
  gap: number
}): Array<{ x: number; y: number; width: number; height: number }> {
  const { width, height, panelCount, layout, x, y, gap } = input
  const innerWidth = width - x * 2

  if (panelCount <= 1 || layout === 'single' || layout === 'split-vertical') {
    const panelHeight = (height - gap * Math.max(panelCount - 1, 0)) / Math.max(panelCount, 1)
    return Array.from({ length: Math.max(panelCount, 1) }, (_, index) => ({
      x,
      y: y + index * (panelHeight + gap),
      width: innerWidth,
      height: panelHeight,
    }))
  }

  if (layout === 'primary-plus-rail') {
    const leftWidth = innerWidth * 0.58
    const rightWidth = innerWidth - leftWidth - gap
    const supportCount = Math.max(panelCount - 1, 1)
    const supportHeight = (height - gap * (supportCount - 1)) / supportCount

    return [
      { x, y, width: leftWidth, height },
      ...Array.from({ length: panelCount - 1 }, (_, index) => ({
        x: x + leftWidth + gap,
        y: y + index * (supportHeight + gap),
        width: rightWidth,
        height: supportHeight,
      })),
    ]
  }

  if (layout === 'split-horizontal' && panelCount === 2) {
    const panelWidth = (innerWidth - gap) / 2
    return [
      { x, y, width: panelWidth, height },
      { x: x + panelWidth + gap, y, width: panelWidth, height },
    ]
  }

  const primaryHeight = panelCount > 1 ? height * 0.46 : height
  const supportCount = Math.max(panelCount - 1, 1)
  const columnCount = Math.min(2, supportCount)
  const rowCount = Math.ceil(supportCount / columnCount)
  const supportWidth = (innerWidth - gap * (columnCount - 1)) / columnCount
  const supportHeight = (height - primaryHeight - gap * (rowCount + 1)) / rowCount

  return [
    { x, y, width: innerWidth, height: primaryHeight },
    ...Array.from({ length: panelCount - 1 }, (_, index) => {
      const row = Math.floor(index / columnCount)
      const column = index % columnCount
      return {
        x: x + column * (supportWidth + gap),
        y: y + primaryHeight + gap + row * (supportHeight + gap),
        width: supportWidth,
        height: supportHeight,
      }
    }),
  ]
}

function renderTextLines(input: {
  lines: string[]
  x: number
  y: number
  lineHeight: number
  anchor: 'start' | 'middle' | 'end'
  fill: string
  fontSize: number
  fontWeight: number
}): string {
  return input.lines
    .map(
      (line, index) =>
        `<text x="${input.x}" y="${input.y + index * input.lineHeight}" text-anchor="${input.anchor}" fill="${input.fill}" font-size="${input.fontSize}" font-weight="${input.fontWeight}" font-family="Arial, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('')
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxCharsPerLine) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }
    current = word

    if (lines.length === maxLines - 1) {
      break
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current)
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines)
  }

  const consumed = lines.join(' ')
  if (consumed.length < normalized.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1]!.replace(/\s+\S*$/, '') || lines[lines.length - 1]}…`
  }

  return lines.slice(0, maxLines)
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${trimTrailingZeroes((value / 1_000_000_000).toFixed(1))}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${trimTrailingZeroes((value / 1_000_000).toFixed(1))}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${trimTrailingZeroes((value / 1_000).toFixed(1))}K`
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  return trimTrailingZeroes(value.toFixed(1))
}

function formatPanelValue(
  item: {
    value?: number
    unit?: string
    metadata?: Record<string, string>
  },
): string {
  if (typeof item.value === 'number' && item.metadata?.metric === 'score') {
    return `${formatNumber(item.value)}${item.unit ?? ''}`
  }

  if (item.metadata?.rank) {
    return `Rank ${item.metadata.rank}`
  }

  if (typeof item.value === 'number') {
    return `${formatNumber(item.value)}${item.unit ?? ''}`
  }

  return ''
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const shortened = value.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return `${(boundary > Math.floor(maxLength * 0.6) ? shortened.slice(0, boundary) : shortened).trim()}…`
}

function trimTrailingZeroes(value: string): string {
  return value.replace(/\.0$/, '')
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'infographic'
}
