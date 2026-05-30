import { interpolate, useCurrentFrame } from 'remotion'
import type { ReactNode } from 'react'
import type { AnimatedRenderableProps } from '@/components/remotion/types'
import {
  getMediaImageFit,
  getMediaItem,
  getMediaObjectPosition,
  getMediaUsageLabel,
} from '@/lib/dna/media'

function useBlockEntrance(startFrame: number) {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - startFrame)

  return {
    opacity: interpolate(localFrame, [0, 24], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    translateY: interpolate(localFrame, [0, 24], [16, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  }
}

function MediaShell({
  children,
  colors,
  usageLabel,
  caption,
  relevance,
  sourceName,
  sourceUrl,
  startFrame,
}: {
  children: ReactNode
  colors: AnimatedRenderableProps['colors']
  usageLabel: string
  caption?: string
  relevance: string
  sourceName: string
  sourceUrl: string
  startFrame: number
}) {
  const { opacity, translateY } = useBlockEntrance(startFrame)

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        borderRadius: 28,
        border: `1px solid ${colors.text}18`,
        background: `linear-gradient(180deg, ${colors.text}0d 0%, transparent 100%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '16px 16px 0',
        }}
      >
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${colors.text}24`,
            padding: '6px 10px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: colors.text,
            backgroundColor: `${colors.text}0d`,
          }}
        >
          {usageLabel}
        </span>
        <a
          href={sourceUrl}
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: colors.text,
            opacity: 0.72,
          }}
        >
          {sourceName}
        </a>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {children}
        {(caption || relevance) ? (
          <div style={{ marginTop: 16 }}>
            {caption ? (
              <div style={{ fontSize: 14, lineHeight: 1.5, color: colors.text }}>{caption}</div>
            ) : null}
            <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.45, color: `${colors.text}8c` }}>
              {relevance}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AnimatedHeroImage({ dna, colors, block }: AnimatedRenderableProps) {
  const media = getMediaItem(dna, block.slot)
  if (!media) return null

  return (
    <MediaShell
      colors={colors}
      usageLabel={getMediaUsageLabel(media)}
      caption={media.caption}
      relevance={media.relevance}
      sourceName={media.source.name}
      sourceUrl={media.source.url}
      startFrame={block.animation.startFrame}
    >
      <div style={{ overflow: 'hidden', borderRadius: 22, border: `1px solid ${colors.text}14` }}>
        <img
          src={media.url}
          alt={media.alt}
          style={{
            display: 'block',
            width: '100%',
            height: 280,
            objectFit: 'cover',
          }}
        />
      </div>
    </MediaShell>
  )
}

export function AnimatedAnnotatedImage({ dna, colors, block }: AnimatedRenderableProps) {
  const media = getMediaItem(dna, block.slot)
  if (!media) return null

  return (
    <MediaShell
      colors={colors}
      usageLabel={getMediaUsageLabel(media)}
      caption={media.caption}
      relevance={media.relevance}
      sourceName={media.source.name}
      sourceUrl={media.source.url}
      startFrame={block.animation.startFrame}
    >
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, border: `1px solid ${colors.text}14` }}>
        <img
          src={media.url}
          alt={media.alt}
          style={{
            display: 'block',
            width: '100%',
            height: 280,
            objectFit: 'cover',
          }}
        />

        {media.annotations?.map((annotation, index) => (
          <div
            key={`${annotation.label}-${index}`}
            style={{
              position: 'absolute',
              left: `${annotation.x * 100}%`,
              top: `${annotation.y * 100}%`,
              transform: 'translate(-12%, -50%)',
              maxWidth: 150,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '999px',
                  border: `2px solid ${colors.background}`,
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 0 4px ${colors.primary}22`,
                }}
              />
              <span
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: colors.background,
                  backgroundColor: colors.primary,
                }}
              >
                {annotation.label}
              </span>
            </div>
            {annotation.detail ? (
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 16,
                  padding: '8px 10px',
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: colors.text,
                  backgroundColor: `${colors.background}cc`,
                  border: `1px solid ${colors.text}14`,
                }}
              >
                {annotation.detail}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </MediaShell>
  )
}

export function AnimatedScanCard({ dna, colors, block }: AnimatedRenderableProps) {
  const media = getMediaItem(dna, block.slot)
  if (!media) return null
  const objectFit = getMediaImageFit(media)

  return (
    <MediaShell
      colors={colors}
      usageLabel={getMediaUsageLabel(media)}
      caption={media.caption}
      relevance={media.relevance}
      sourceName={media.source.name}
      sourceUrl={media.source.url}
      startFrame={block.animation.startFrame}
    >
      <div
        style={{
          overflow: 'hidden',
          borderRadius: 18,
          border: `1px solid ${colors.text}14`,
          padding: 16,
          backgroundColor: `${colors.background}cc`,
        }}
      >
        <img
          src={media.url}
          alt={media.alt}
          style={{
            display: 'block',
            width: '100%',
            height: objectFit === 'cover' ? 260 : undefined,
            maxHeight: objectFit === 'cover' ? undefined : 240,
            objectFit,
            objectPosition: getMediaObjectPosition(media),
            borderRadius: 14,
            backgroundColor: `${colors.text}08`,
          }}
        />
      </div>
    </MediaShell>
  )
}
