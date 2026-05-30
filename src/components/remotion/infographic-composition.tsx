import { AbsoluteFill } from 'remotion'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { CompiledLayoutColumn } from '@/lib/dna/rendering'
import { ANIMATED_COMPONENT_MAP } from './component-map'
import { compileLayout, REMOTION_RENDER_PROFILE, resolveDNAColors } from '@/lib/dna/rendering'

interface InfographicCompositionProps {
  dna: InfographicDNA
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

export function InfographicComposition({ dna }: InfographicCompositionProps) {
  const compiledLayout = compileLayout(dna, REMOTION_RENDER_PROFILE)
  const resolvedColors = resolveDNAColors(dna)

  return (
    <AbsoluteFill
      style={{
        backgroundColor: resolvedColors.background,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {compiledLayout.rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            flexDirection: row.columns.length > 1 ? 'row' : 'column',
            gap: row.gap,
          }}
        >
          {row.columns.map((column) => (
            <div
              key={column.id}
              style={{
                flex: getColumnFlex(column.width),
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderRadius: column.panel === 'none' ? undefined : 28,
                border: column.panel === 'none' ? undefined : `1px solid ${resolvedColors.text}18`,
                background:
                  column.panel === 'hero'
                    ? `linear-gradient(180deg, ${resolvedColors.text}10 0%, transparent 100%)`
                    : column.panel === 'glass'
                      ? `linear-gradient(180deg, ${resolvedColors.text}0c 0%, transparent 100%)`
                      : undefined,
                padding: column.panel === 'none' ? 0 : 12,
              }}
            >
              {column.blocks.map((block) => {
                const Component = ANIMATED_COMPONENT_MAP[block.slot.type]
                if (!Component) return null

                return (
                  <div
                    key={block.id}
                    style={{
                      flex: block.kind === 'chart' || block.kind === 'media' ? 1 : undefined,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent:
                        block.kind === 'chart' || block.kind === 'media' ? 'center' : undefined,
                      textAlign: block.align,
                    }}
                  >
                    <Component dna={dna} colors={resolvedColors} block={block} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  )
}
