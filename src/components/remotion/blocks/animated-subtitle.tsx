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

export function AnimatedSubtitle({ dna, colors }: AnimatedTextProps) {
  const frame = useCurrentFrame()
  if (!dna.content.subtitle) return null

  const opacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity: opacity * 0.7,
        color: colors.text,
        fontSize: 16,
        padding: '4px 24px 0',
      }}
    >
      {dna.content.subtitle}
    </div>
  )
}
