import { AbsoluteFill } from 'remotion'
import type { InfographicDNA } from '@/lib/dna/schema'

// Text blocks
import { AnimatedTitle } from './blocks/animated-title'
import { AnimatedSubtitle } from './blocks/animated-subtitle'
import { AnimatedHook } from './blocks/animated-hook'
import { AnimatedFootnote } from './blocks/animated-footnote'
import { AnimatedSourceBadge } from './blocks/animated-source-badge'

// Chart map
import { ANIMATED_CHART_MAP } from './component-map'

interface InfographicCompositionProps {
  dna: InfographicDNA
}

/**
 * Root Remotion composition for an animated infographic.
 *
 * Renders all DNA components in order:
 * title → subtitle → hook → chart → footnote → source-badge
 *
 * Each component handles its own animation timing internally
 * using useCurrentFrame() + interpolate().
 */
export function InfographicComposition({ dna }: InfographicCompositionProps) {
  const { colors, chartType } = dna.presentation

  const resolvedColors = {
    primary: colors.primary,
    secondary: colors.secondary || colors.primary,
    background: colors.background,
    text: colors.text,
    accent: colors.accent || colors.primary,
  }

  const ChartComponent = ANIMATED_CHART_MAP[chartType]

  return (
    <AbsoluteFill
      style={{
        backgroundColor: resolvedColors.background,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Text blocks */}
      <AnimatedTitle dna={dna} colors={resolvedColors} />
      <AnimatedSubtitle dna={dna} colors={resolvedColors} />
      <AnimatedHook dna={dna} colors={resolvedColors} />

      {/* Chart — flexes to fill available space */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {ChartComponent ? (
          <div style={{ width: '100%' }}>
            <ChartComponent dna={dna} colors={resolvedColors} />
          </div>
        ) : null}
      </div>

      {/* Footer blocks */}
      <AnimatedFootnote dna={dna} colors={resolvedColors} />
      <AnimatedSourceBadge dna={dna} colors={resolvedColors} />
    </AbsoluteFill>
  )
}
