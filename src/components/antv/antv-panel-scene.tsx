'use client'

import { COMPONENT_MAP } from '@/components/dna-renderer/component-map'
import { themeNameToColors } from '@/lib/antv/theme'
import {
  buildPanelSummaryDNA,
  ensureAntVDocumentPanels,
  getPanelChartType,
  getPanelDataGroup,
} from '@/lib/antv/panels'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'

interface AntVPanelSceneProps {
  document: InfographicDocumentV2
  className?: string
}

export function AntVPanelScene({
  document,
  className,
}: AntVPanelSceneProps) {
  const normalized = ensureAntVDocumentPanels(document)
  const themeColors = themeNameToColors(normalized.presentation.themeName)
  const colors = {
    primary: themeColors.primary,
    secondary: themeColors.secondary ?? themeColors.primary,
    background: themeColors.background,
    text: themeColors.text,
    accent: themeColors.accent ?? themeColors.primary,
  }
  const primaryPanel = normalized.presentation.panels.find((panel) => panel.role === 'primary') ?? normalized.presentation.panels[0]
  const supportPanels = normalized.presentation.panels.filter((panel) => panel.id !== primaryPanel?.id)

  return (
    <div
      className={`w-full overflow-hidden rounded-[28px] border ${className ?? ''}`}
      style={{
        borderColor: `${colors.text}14`,
        background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.background}ee 100%)`,
      }}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="text-center">
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: colors.text }}>
            {normalized.content.title}
          </h2>
          {normalized.content.subtitle ? (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: `${colors.text}b8` }}>
              {normalized.content.subtitle}
            </p>
          ) : null}
          {normalized.content.hook ? (
            <p className="mx-auto mt-5 max-w-2xl text-xl font-semibold italic sm:text-2xl" style={{ color: colors.accent }}>
              {normalized.content.hook}
            </p>
          ) : null}
        </div>

        {normalized.presentation.panelLayout === 'primary-plus-rail' && primaryPanel ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <PanelCard document={normalized} panel={primaryPanel} />
            <div className="flex flex-col gap-4">
              {supportPanels.map((panel) => (
                <PanelCard key={panel.id} document={normalized} panel={panel} compact />
              ))}
            </div>
          </div>
        ) : normalized.presentation.panelLayout === 'split-horizontal' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {normalized.presentation.panels.map((panel) => (
              <PanelCard key={panel.id} document={normalized} panel={panel} />
            ))}
          </div>
        ) : normalized.presentation.panelLayout === 'stacked' ? (
          <div className="flex flex-col gap-4">
            {primaryPanel ? <PanelCard document={normalized} panel={primaryPanel} /> : null}
            {supportPanels.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {supportPanels.map((panel) => (
                  <PanelCard key={panel.id} document={normalized} panel={panel} compact />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {normalized.presentation.panels.map((panel) => (
              <PanelCard key={panel.id} document={normalized} panel={panel} compact={normalized.presentation.panels.length > 1} />
            ))}
          </div>
        )}

        {(normalized.content.footnotes || normalized.content.caveats.length > 0) ? (
          <div className="px-2 pt-2 text-sm leading-7 italic" style={{ color: `${colors.text}99` }}>
            {[normalized.content.footnotes, ...normalized.content.caveats].filter(Boolean).join(' ')}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 px-1 pb-1">
          {normalized.content.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-3 py-1 text-sm"
              style={{
                borderColor: `${colors.text}18`,
                color: `${colors.text}d9`,
                backgroundColor: `${colors.text}0a`,
              }}
            >
              Source: {source.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function PanelCard({
  document,
  panel,
  compact = false,
}: {
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>
  panel: InfographicDocumentV2['presentation']['panels'][number]
  compact?: boolean
}) {
  const themeColors = themeNameToColors(document.presentation.themeName)
  const colors = {
    primary: themeColors.primary,
    secondary: themeColors.secondary ?? themeColors.primary,
    background: themeColors.background,
    text: themeColors.text,
    accent: themeColors.accent ?? themeColors.primary,
  }
  const group = getPanelDataGroup(document, panel)
  const chartType = getPanelChartType(panel, document.presentation.chartType)
  const slotType = panel.viewType === 'media'
    ? (document.content.media[0]?.kind ?? 'hero-image')
    : chartType
  const slot = panel.viewType === 'media'
    ? { type: slotType, mediaId: document.content.media[0]?.id }
    : { type: slotType }
  const syntheticDNA = buildPanelSummaryDNA({
    document,
    panel,
    title: panel.title ?? group?.label,
  })
  syntheticDNA.presentation.colors = {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    accent: colors.accent,
  }

  const Component = COMPONENT_MAP[slotType]

  return (
    <div
      className="rounded-[28px] border p-4"
      style={{
        borderColor: `${colors.text}18`,
        background: `linear-gradient(180deg, ${colors.text}0c 0%, transparent 100%)`,
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: `${colors.text}9f` }}>
            {panel.role === 'primary' ? 'Primary panel' : 'Supporting panel'}
          </div>
          <div className={`mt-2 font-semibold leading-tight ${compact ? 'text-xl' : 'text-2xl'}`} style={{ color: colors.text }}>
            {panel.title ?? group?.label ?? panel.viewType}
          </div>
          {group?.summary ? (
            <p className="mt-2 text-sm leading-6" style={{ color: `${colors.text}ae` }}>
              {group.summary}
            </p>
          ) : null}
        </div>
        <div
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: colors.background, backgroundColor: colors.primary }}
        >
          {panel.viewType}
        </div>
      </div>

      {Component ? (
        <Component
          dna={syntheticDNA}
          slot={slot}
          colors={colors}
        />
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${colors.text}16`, color: colors.text }}>
          Panel type not available.
        </div>
      )}
    </div>
  )
}
