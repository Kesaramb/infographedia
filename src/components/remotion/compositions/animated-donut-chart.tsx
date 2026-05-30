import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

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

export function AnimatedDonutChart({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const data = dna.content.data
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1

  const cx = 210
  const cy = 140
  const outerR = 112
  const innerR = 64
  const legendY = 300
  const legendColumns = data.length > 3 ? 2 : 1
  const legendColumnWidth = 190

  let currentAngle = 0

  return (
    <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 420 400" width="100%" height="auto" style={{ maxWidth: 420 }}>
        <defs>
          <mask id="donut-mask">
            <rect width="420" height="400" fill="white" />
            <circle cx={cx} cy={cy} r={innerR} fill="black" />
          </mask>
        </defs>

        <g mask="url(#donut-mask)">
          {data.map((point, i) => {
            const sliceAngle = (point.value / total) * 360
            const startAngle = currentAngle
            const percent = point.value / total

            const progress = interpolate(localFrame, [i * 12, 28 + i * 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })

            const animatedAngle = sliceAngle * progress
            currentAngle += sliceAngle

            if (animatedAngle < 0.1) return null

            const color =
              i === 0
                ? colors.primary
                : i === 1
                  ? colors.secondary
                  : i === 2
                    ? colors.accent
                    : SLICE_COLORS[i % SLICE_COLORS.length]

            const path = describeArc(cx, cy, outerR, startAngle, startAngle + animatedAngle)
            const labelPosition = polarToCartesian(cx, cy, outerR + 20, startAngle + sliceAngle / 2)
            const labelOpacity = interpolate(localFrame, [18 + i * 12, 36 + i * 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })

            return (
              <g key={i}>
                <path
                  d={path}
                  fill={color}
                  opacity={0.88}
                  stroke={colors.background}
                  strokeWidth={2}
                />
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor={labelPosition.x < cx ? 'end' : 'start'}
                  fontSize={10}
                  fill={colors.text}
                  opacity={labelOpacity * 0.85}
                >
                  {Math.round(percent * 100)}%
                </text>
              </g>
            )
          })}
        </g>

        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={12}
          fill={colors.text}
          opacity={0.55}
        >
          Total
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fontSize={26}
          fontWeight={700}
          fill={colors.text}
        >
          {total.toLocaleString()}
        </text>

        {data.map((point, i) => {
          const legendOpacity = interpolate(localFrame, [34 + i * 8, 52 + i * 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const color =
            i === 0
              ? colors.primary
              : i === 1
                ? colors.secondary
                : i === 2
                  ? colors.accent
                  : SLICE_COLORS[i % SLICE_COLORS.length]

          const column = legendColumns === 1 ? 0 : i % legendColumns
          const row = legendColumns === 1 ? i : Math.floor(i / legendColumns)
          const x = legendColumns === 1 ? 104 : 18 + column * legendColumnWidth
          const y = legendY + row * 20

          return (
            <g key={`legend-${i}`} opacity={legendOpacity}>
              <rect x={x} y={y - 9} width={10} height={10} rx={3} fill={color} />
              <text x={x + 16} y={y} fontSize={10} fill={colors.text}>
                {point.label.length > 18 ? `${point.label.slice(0, 18)}...` : point.label}
              </text>
              <text x={x + 120} y={y} fontSize={10} fill={colors.text} opacity={0.7}>
                {point.value}
                {point.unit ?? ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
