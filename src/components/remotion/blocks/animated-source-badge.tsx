import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedSourceBadge({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
        justifyContent: block.align === 'center' ? 'center' : 'flex-start',
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
