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

export function AnimatedHook({ dna, colors }: AnimatedTextProps) {
  const frame = useCurrentFrame()
  if (!dna.content.hook) return null

  const opacity = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scale = interpolate(frame, [40, 70], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        color: colors.accent || colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'italic',
        padding: '8px 24px 0',
      }}
    >
      {dna.content.hook}
    </div>
  )
}
