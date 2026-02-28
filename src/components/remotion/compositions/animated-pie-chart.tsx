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

const SLICE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

export function AnimatedPieChart({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const data = dna.content.data
  const total = data.reduce((sum, d) => sum + d.value, 0)

  const cx = 200
  const cy = 170
  const r = 130

  let currentAngle = 0

  return (
    <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 400 340" width="100%" height="auto" style={{ maxWidth: 400 }}>
        {data.map((point, i) => {
          const sliceAngle = (point.value / total) * 360
          const startAngle = currentAngle

          const progress = interpolate(frame, [20 + i * 8, 40 + i * 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          const animatedAngle = sliceAngle * progress
          currentAngle += sliceAngle

          if (animatedAngle < 0.1) return null

          const color = i === 0 ? colors.primary : SLICE_COLORS[i % SLICE_COLORS.length]
          const path = describeArc(cx, cy, r, startAngle, startAngle + animatedAngle)

          return (
            <path
              key={i}
              d={path}
              fill={color}
              opacity={0.85}
              stroke={colors.background}
              strokeWidth={2}
            />
          )
        })}
      </svg>
    </div>
  )
}
