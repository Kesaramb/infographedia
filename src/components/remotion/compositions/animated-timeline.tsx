import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { InfographicDNA } from '@/lib/dna/schema'

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

export function AnimatedTimeline({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data
  const itemHeight = 60
  const totalHeight = data.length * itemHeight

  return (
    <div style={{ padding: '0 24px' }}>
      <svg viewBox={`0 0 500 ${totalHeight}`} width="100%" height="auto">
        {/* Vertical line */}
        <line
          x1={80}
          y1={0}
          x2={80}
          y2={totalHeight}
          stroke={`${colors.text}20`}
          strokeWidth={2}
        />

        {data.map((point, i) => {
          const progress = spring({
            frame: frame - 60 - i * 12,
            fps,
            config: { damping: 14, stiffness: 60 },
          })
          const y = i * itemHeight + itemHeight / 2

          return (
            <g key={i} opacity={progress}>
              {/* Dot */}
              <circle
                cx={80}
                cy={y}
                r={8 * progress}
                fill={colors.primary}
              />
              {/* Year/value */}
              <text
                x={20}
                y={y + 4}
                fontSize={14}
                fontWeight="bold"
                fill={colors.text}
                textAnchor="middle"
              >
                {point.value}
              </text>
              {/* Label */}
              <text
                x={100}
                y={y + 4}
                fontSize={13}
                fill={colors.text}
                opacity={0.8}
              >
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
