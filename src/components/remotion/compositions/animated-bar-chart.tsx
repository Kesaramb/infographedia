import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
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

export function AnimatedBarChart({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data

  const maxValue = Math.max(...data.map((d) => d.value))
  const chartHeight = 300
  const chartWidth = 500
  const barGap = 8
  const barWidth = Math.min(60, (chartWidth - barGap * (data.length + 1)) / data.length)
  const startX = (chartWidth - (barWidth + barGap) * data.length + barGap) / 2

  return (
    <div style={{ padding: '0 24px' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} width="100%" height="auto">
        {/* Baseline */}
        <line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={`${colors.text}30`}
          strokeWidth={1}
        />

        {data.map((point, i) => {
          const targetHeight = (point.value / maxValue) * (chartHeight - 20)
          const progress = spring({
            frame: frame - 60 - i * 8,
            fps,
            config: { damping: 14, stiffness: 60 },
          })
          const barHeight = targetHeight * progress
          const x = startX + i * (barWidth + barGap)
          const y = chartHeight - barHeight

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={colors.primary}
                opacity={0.9}
              />
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight="bold"
                fill={colors.text}
                opacity={interpolate(frame, [90 + i * 8, 105 + i * 8], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
              >
                {point.value}{point.unit || ''}
              </text>
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize={10}
                fill={colors.text}
                opacity={0.6}
              >
                {point.label.length > 10 ? point.label.slice(0, 10) + '…' : point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
