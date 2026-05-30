import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedTitle({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const opacity = interpolate(localFrame, [0, 28], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(localFrame, [0, 28], [20, 0], { extrapolateRight: 'clamp' })

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
        textAlign: block.align,
      }}
    >
      {dna.content.title}
    </div>
  )
}
