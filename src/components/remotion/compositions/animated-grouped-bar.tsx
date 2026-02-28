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

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6']

export function AnimatedGroupedBar({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data

  // Extract groups from metadata
  const groups = [...new Set(data.map((d) => d.metadata?.group || 'default'))]
  const labels = [...new Set(data.map((d) => {
    // Remove group from label if present
    const group = d.metadata?.group || ''
    return d.label.replace(group, '').trim()
  }))]

  const maxValue = Math.max(...data.map((d) => d.value))
  const chartHeight = 300
  const chartWidth = 500
  const groupWidth = chartWidth / (labels.length || 1)
  const barWidth = Math.min(30, (groupWidth - 16) / (groups.length || 1))

  return (
    <div style={{ padding: '0 24px' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 50}`} width="100%" height="auto">
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
          const groupIndex = groups.indexOf(point.metadata?.group || 'default')
          const labelBase = point.label.replace(point.metadata?.group || '', '').trim()
          const labelIndex = labels.indexOf(labelBase)

          const targetHeight = (point.value / maxValue) * (chartHeight - 20)
          const progress = spring({
            frame: frame - 20 - i * 4,
            fps,
            config: { damping: 12, stiffness: 80 },
          })
          const barHeight = targetHeight * progress

          const groupCenter = labelIndex * groupWidth + groupWidth / 2
          const totalBarsWidth = groups.length * barWidth + (groups.length - 1) * 4
          const x = groupCenter - totalBarsWidth / 2 + groupIndex * (barWidth + 4)
          const y = chartHeight - barHeight

          const color = groupIndex === 0 ? colors.primary : GROUP_COLORS[groupIndex % GROUP_COLORS.length]

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={color}
                opacity={0.85}
              />
              {/* Value */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill={colors.text}
                opacity={interpolate(frame, [35 + i * 4, 45 + i * 4], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
              >
                {point.value}{point.unit || ''}
              </text>
            </g>
          )
        })}

        {/* Group labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={i * groupWidth + groupWidth / 2}
            y={chartHeight + 16}
            textAnchor="middle"
            fontSize={10}
            fill={colors.text}
            opacity={0.6}
          >
            {label.length > 12 ? label.slice(0, 12) + '…' : label}
          </text>
        ))}

        {/* Legend */}
        {groups.length > 1 && groups.map((group, i) => {
          const color = i === 0 ? colors.primary : GROUP_COLORS[i % GROUP_COLORS.length]
          return (
            <g key={i} transform={`translate(${i * 100 + 20}, ${chartHeight + 32})`}>
              <rect width={10} height={10} rx={2} fill={color} />
              <text x={14} y={9} fontSize={10} fill={colors.text} opacity={0.6}>
                {group}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
