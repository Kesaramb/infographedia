import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedSubtitle({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  if (!dna.content.subtitle) return null
  const localFrame = Math.max(0, frame - block.animation.startFrame)

  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity: opacity * 0.7,
        color: colors.text,
        fontSize: 16,
        padding: '4px 24px 0',
        textAlign: block.align,
      }}
    >
      {dna.content.subtitle}
    </div>
  )
}
