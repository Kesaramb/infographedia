import { useCurrentFrame, interpolate } from 'remotion'
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

export function AnimatedAreaChart({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const data = dna.content.data

  const chartWidth = 500
  const chartHeight = 280
  const padding = { top: 20, right: 20, bottom: 40, left: 20 }
  const innerW = chartWidth - padding.left - padding.right
  const innerH = chartHeight - padding.top - padding.bottom

  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * innerW,
    y: padding.top + innerH - ((d.value - minValue) / range) * innerH,
  }))

  const baseline = padding.top + innerH

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = lineD + ` L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`

  const revealProgress = interpolate(frame, [60, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Use a clip rect that reveals left to right
  const clipWidth = chartWidth * revealProgress

  return (
    <div style={{ padding: '0 24px' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="auto">
        <defs>
          <clipPath id="area-reveal">
            <rect x={0} y={0} width={clipWidth} height={chartHeight} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + innerH * (1 - pct)
          return (
            <line
              key={pct}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke={`${colors.text}15`}
              strokeWidth={1}
            />
          )
        })}

        <g clipPath="url(#area-reveal)">
          {/* Area fill */}
          <path d={areaD} fill={colors.primary} opacity={0.2} />
          {/* Line */}
          <path
            d={lineD}
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Data points */}
        {points.map((p, i) => {
          const pointProgress = interpolate(
            frame,
            [60 + (i / (data.length - 1 || 1)) * 80, 80 + (i / (data.length - 1 || 1)) * 80],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={colors.primary}
              opacity={pointProgress}
            />
          )
        })}

        {/* Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={padding.left + (i / (data.length - 1 || 1)) * innerW}
            y={chartHeight - 8}
            textAnchor="middle"
            fontSize={10}
            fill={colors.text}
            opacity={0.6}
          >
            {d.label.length > 8 ? d.label.slice(0, 8) + '…' : d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
