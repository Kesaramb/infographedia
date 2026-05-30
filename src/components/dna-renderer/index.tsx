'use client'

import type { CSSProperties } from 'react'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { CompiledLayoutColumn } from '@/lib/dna/rendering'
import type { ResolvedColors } from './types'
import { COMPONENT_MAP } from './component-map'
import { compileLayout, resolveDNAColors, STATIC_RENDER_PROFILE } from '@/lib/dna/rendering'

interface DNARendererProps {
  dna: InfographicDNA
  className?: string
}

function getColumnFlex(width: CompiledLayoutColumn['width']): number {
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

function getColumnMinWidth(width: CompiledLayoutColumn['width']): number | undefined {
  switch (width) {
    case 'wide':
      return 300
    case 'narrow':
      return 280
    case 'equal':
      return 250
    default:
      return undefined
  }
}

function getColumnStyle(
  column: CompiledLayoutColumn,
  colors: ResolvedColors,
): CSSProperties {
  if (column.panel === 'none') {
      return {
        flex: getColumnFlex(column.width),
        minWidth: getColumnMinWidth(column.width) ?? 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }
  }

  const borderColor = `${colors.text}18`
  const background =
    column.panel === 'hero'
      ? `linear-gradient(180deg, ${colors.text}10 0%, transparent 100%)`
      : `linear-gradient(180deg, ${colors.text}0c 0%, transparent 100%)`

  return {
    flex: getColumnFlex(column.width),
    minWidth: getColumnMinWidth(column.width) ?? 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderRadius: 28,
    border: `1px solid ${borderColor}`,
    background,
    padding: 12,
  }
}

export function DNARenderer({ dna, className = '' }: DNARendererProps) {
  const compiledLayout = compileLayout(dna, STATIC_RENDER_PROFILE)
  const colors: ResolvedColors = resolveDNAColors(dna)

  const cssVars = {
    '--dna-primary': colors.primary,
    '--dna-secondary': colors.secondary,
    '--dna-bg': colors.background,
    '--dna-text': colors.text,
    '--dna-accent': colors.accent,
  } as CSSProperties

  return (
    <div
      className={`dna-infographic w-full overflow-hidden rounded-xl ${className}`}
      style={{
        ...cssVars,
        backgroundColor: colors.background,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        {compiledLayout.rows.map((row) => (
          <div
            key={row.id}
            className={`flex ${row.columns.length > 1 ? 'flex-row' : 'flex-col'}`}
            style={{
              gap: row.gap,
              flexWrap: row.columns.length > 1 ? 'wrap' : 'nowrap',
              alignItems: 'flex-start',
            }}
          >
            {row.columns.map((column) => (
              <div key={column.id} style={getColumnStyle(column, colors)}>
                {column.blocks.map((block, index) => {
                  const Component = COMPONENT_MAP[block.slot.type]
                  if (!Component) return null

                  return (
                    <div
                      key={`${block.id}-${index}`}
                      style={{
                        textAlign: block.align,
                        flexGrow: block.kind === 'chart' || block.kind === 'media' ? 1 : 0,
                      }}
                    >
                      <Component
                        dna={dna}
                        slot={block.slot}
                        colors={colors}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
