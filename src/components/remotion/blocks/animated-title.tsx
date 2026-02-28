import { useCurrentFrame, interpolate } from 'remotion'
import type { InfographicDNA } from '@/lib/dna/schema'

interface AnimatedTextProps {
  dna: InfographicDNA
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

export function AnimatedTitle({ dna, colors }: AnimatedTextProps) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        color: colors.text,
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 1.2,
        padding: '24px 24px 0',
      }}
    >
      {dna.content.title}
    </div>
  )
}
