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

export function AnimatedVsSplit({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data
  const left = data[0]
  const right = data[1]

  if (!left || !right) return null

  // Left side slides in from left
  const leftProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  // Right side slides in from right
  const rightProgress = spring({
    frame: frame - 70,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  // VS divider scales up
  const vsProgress = spring({
    frame: frame - 100,
    fps,
    config: { damping: 12, stiffness: 80 },
  })

  // Count-up for numbers
  const leftValue = interpolate(
    frame,
    [70, 140],
    [0, left.value],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  )
  const rightValue = interpolate(
    frame,
    [80, 140],
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
