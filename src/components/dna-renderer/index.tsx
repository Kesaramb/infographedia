'use client'

import type { InfographicDNA } from '@/lib/dna/schema'
import type { ResolvedColors } from './types'
import { COMPONENT_MAP } from './component-map'

interface DNARendererProps {
  dna: InfographicDNA
  className?: string
}

/**
 * The core rendering engine.
 * Takes an InfographicDNA JSON object and renders it as a React component tree.
 *
 * 1. Sets CSS custom properties on the container for non-Recharts elements
 * 2. Resolves colors into a props object for Recharts (which can't read CSS vars)
 * 3. Iterates over presentation.components[] and mounts the matching component
 * 4. Unknown component types are silently skipped
 */
export function DNARenderer({ dna, className = '' }: DNARendererProps) {
  const { presentation } = dna

  // Resolve colors for Recharts (props-based) and non-Recharts (CSS vars)
  const colors: ResolvedColors = {
    primary: presentation.colors.primary,
    secondary: presentation.colors.secondary ?? presentation.colors.primary,
    background: presentation.colors.background,
    text: presentation.colors.text,
    accent: presentation.colors.accent ?? presentation.colors.primary,
  }

  // CSS custom properties for non-Recharts elements (title, badges, etc.)
  const cssVars = {
    '--dna-primary': colors.primary,
    '--dna-secondary': colors.secondary,
    '--dna-bg': colors.background,
    '--dna-text': colors.text,
    '--dna-accent': colors.accent,
  } as React.CSSProperties

  return (
    <div
      className={`dna-infographic w-full overflow-hidden rounded-xl ${className}`}
      style={{
        ...cssVars,
        backgroundColor: colors.background,
      }}
    >
      {presentation.components.map((slot, i) => {
        const Component = COMPONENT_MAP[slot.type]

        // Gracefully skip unknown component types
        if (!Component) return null

        return (
          <Component
            key={`${slot.type}-${i}`}
            dna={dna}
            slot={slot}
            colors={colors}
          />
        )
      })}
    </div>
  )
}
