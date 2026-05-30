import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedStatCard({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const data = dna.content.data[0]
  if (!data) return null

  const countProgress = interpolate(localFrame, [0, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const currentValue = data.value * countProgress
  const displayValue = data.value % 1 === 0
    ? Math.round(currentValue).toLocaleString()
    : currentValue.toFixed(2)

  const opacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const scale = interpolate(localFrame, [0, 30], [0.8, 1], {
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
