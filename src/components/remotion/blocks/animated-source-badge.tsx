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

export function AnimatedSourceBadge({ dna, colors }: AnimatedTextProps) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [80, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity: opacity * 0.4,
        color: colors.text,
        fontSize: 10,
        padding: '8px 24px 24px',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap' as const,
      }}
    >
      {dna.content.sources.map((source, i) => (
        <span key={i} style={{
          padding: '2px 8px',
          borderRadius: 4,
          backgroundColor: `${colors.text}10`,
        }}>
          {source.name}
        </span>
      ))}
    </div>
  )
}
