import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedVsSplit({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const data = dna.content.data
  const left = data[0]
  const right = data[1]

  if (!left || !right) return null

  // Left side slides in from left
  const leftProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  // Right side slides in from right
  const rightProgress = spring({
    frame: localFrame - 10,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  // VS divider scales up
  const vsProgress = spring({
    frame: localFrame - 24,
    fps,
    config: { damping: 12, stiffness: 80 },
  })

  // Count-up for numbers
  const leftValue = interpolate(
    localFrame,
    [12, 80],
    [0, left.value],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  )
  const rightValue = interpolate(
    localFrame,
    [18, 86],
    [0, right.value],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  )

  const leftX = interpolate(leftProgress, [0, 1], [-200, 0])
  const rightX = interpolate(rightProgress, [0, 1], [200, 0])

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        minHeight: 200,
        alignItems: 'center',
      }}
    >
      {/* Left side */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          transform: `translateX(${leftX}px)`,
          opacity: leftProgress,
        }}
      >
        <span
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: colors.primary,
          }}
        >
          {Math.round(leftValue).toLocaleString()}
        </span>
        {left.unit && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginTop: 4,
              color: colors.primary,
              opacity: 0.7,
            }}
          >
            {left.unit}
          </span>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginTop: 12,
            color: colors.text,
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          {left.label}
        </span>
      </div>

      {/* VS divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
          transform: `scale(${vsProgress})`,
          opacity: vsProgress,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: colors.accent,
            textTransform: 'uppercase',
          }}
        >
          VS
        </span>
      </div>

      {/* Right side */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          transform: `translateX(${rightX}px)`,
          opacity: rightProgress,
        }}
      >
        <span
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: colors.secondary,
          }}
        >
          {Math.round(rightValue).toLocaleString()}
        </span>
        {right.unit && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginTop: 4,
              color: colors.secondary,
              opacity: 0.7,
            }}
          >
            {right.unit}
          </span>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginTop: 12,
            color: colors.text,
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          {right.label}
        </span>
      </div>
    </div>
  )
}
