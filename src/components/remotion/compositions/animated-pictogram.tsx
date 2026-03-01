import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { InfographicDNA } from '@/lib/dna/schema'
import { getIconSVGPaths } from '@/components/charts/pictogram/icon-registry'

interface AnimatedChartProps {
  dna: InfographicDNA
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

const MAX_ICONS = 20
const ICON_SIZE = 28
const ICON_GAP = 6
const ICONS_PER_ROW = 10
const ROW_HEIGHT = 70

export function AnimatedPictogram({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data

  const totalHeight = data.length * ROW_HEIGHT + 20
  let globalIconIndex = 0

  return (
    <div style={{ padding: '0 24px' }}>
      <svg viewBox={`0 0 500 ${totalHeight}`} width="100%" height="auto">
        {data.map((point, rowIndex) => {
          const iconName = point.metadata?.icon ?? 'default'
          const paths = getIconSVGPaths(iconName)
          const iconCount = Math.min(Math.max(1, Math.round(point.value)), MAX_ICONS)
          const rowY = rowIndex * ROW_HEIGHT + 10

          // Label + value text
          const labelProgress = spring({
            frame: frame - 50 - rowIndex * 15,
            fps,
            config: { damping: 14, stiffness: 60 },
          })

          return (
            <g key={rowIndex}>
              {/* Label */}
              <text
                x={0}
                y={rowY + 14}
                fontSize={12}
                fill={colors.text}
                opacity={labelProgress * 0.7}
              >
                {point.label}
              </text>

              {/* Value */}
              <text
                x={500}
                y={rowY + 14}
                fontSize={14}
                fontWeight="bold"
                fill={colors.primary}
                textAnchor="end"
                opacity={labelProgress}
              >
                {point.value.toLocaleString()}
                {point.unit ? ` ${point.unit}` : ''}
              </text>

              {/* Icons */}
              {Array.from({ length: iconCount }).map((_, iconIdx) => {
                const currentGlobalIndex = globalIconIndex++
                const progress = spring({
                  frame: frame - 60 - currentGlobalIndex * 6,
                  fps,
                  config: { damping: 14, stiffness: 60 },
                })

                const col = iconIdx % ICONS_PER_ROW
                const iconRow = Math.floor(iconIdx / ICONS_PER_ROW)
                const x = col * (ICON_SIZE + ICON_GAP)
                const y = rowY + 22 + iconRow * (ICON_SIZE + ICON_GAP)
                const color = iconIdx % 2 === 0 ? colors.primary : colors.secondary

                return (
                  <g
                    key={iconIdx}
                    transform={`translate(${x}, ${y}) scale(${progress})`}
                    opacity={progress}
                  >
                    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE}>
                      {paths.map((d, pi) => (
                        <path
                          key={pi}
                          d={d}
                          fill="none"
                          stroke={color}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </svg>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
