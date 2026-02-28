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

export function AnimatedFootnote({ dna, colors }: AnimatedTextProps) {
  const frame = useCurrentFrame()
  if (!dna.content.footnotes) return null

  const opacity = interpolate(frame, [160, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity: opacity * 0.5,
        color: colors.text,
        fontSize: 11,
        padding: '4px 24px',
      }}
    >
      {dna.content.footnotes}
    </div>
  )
}
