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

export function AnimatedStatCard({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const data = dna.content.data[0]
  if (!data) return null

  const countProgress = interpolate(frame, [20, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const currentValue = data.value * countProgress
  const displayValue = data.value % 1 === 0
    ? Math.round(currentValue).toLocaleString()
    : currentValue.toFixed(2)

  const opacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const scale = interpolate(frame, [15, 35], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: colors.primary,
          lineHeight: 1,
        }}
      >
        {displayValue}
        {data.unit && (
          <span style={{ fontSize: 36, marginLeft: 4, opacity: 0.8 }}>
            {data.unit}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 18,
          color: colors.text,
          marginTop: 12,
          opacity: 0.7,
        }}
      >
        {data.label}
      </div>
    </div>
  )
}
