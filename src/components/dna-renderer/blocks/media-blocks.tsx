import type { ReactNode } from 'react'
import type { DNAComponentProps } from '@/components/dna-renderer/types'
import {
  getMediaImageFit,
  getMediaItem,
  getMediaObjectPosition,
  getMediaUsageLabel,
} from '@/lib/dna/media'

function MediaShell({
  children,
  colors,
  usageLabel,
  caption,
  relevance,
  sourceName,
  sourceUrl,
}: {
  children: ReactNode
  colors: DNAComponentProps['colors']
  usageLabel: string
  caption?: string
  relevance: string
  sourceName: string
  sourceUrl: string
}) {
  return (
    <div
      className="overflow-hidden rounded-[28px] border"
      style={{
        borderColor: `${colors.text}18`,
        background: `linear-gradient(180deg, ${colors.text}0d 0%, transparent 100%)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <span
          className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            borderColor: `${colors.text}24`,
            color: colors.text,
            backgroundColor: `${colors.text}0d`,
          }}
        >
          {usageLabel}
        </span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-70 transition-opacity hover:opacity-100"
          style={{ color: colors.text }}
        >
          {sourceName}
        </a>
      </div>

      <div className="px-4 pb-4 pt-3">
        {children}

        {(caption || relevance) ? (
          <div className="mt-4 space-y-2">
            {caption ? (
              <p className="text-sm leading-6" style={{ color: colors.text }}>
                {caption}
              </p>
            ) : null}
            <p className="text-xs leading-5" style={{ color: `${colors.text}8c` }}>
              {relevance}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function HeroImageBlock({ dna, slot, colors }: DNAComponentProps) {
  const media = getMediaItem(dna, slot)
  if (!media) return null

  return (
    <MediaShell
      colors={colors}
      usageLabel={getMediaUsageLabel(media)}
      caption={media.caption}
      relevance={media.relevance}
      sourceName={media.source.name}
      sourceUrl={media.source.url}
    >
      <div className="overflow-hidden rounded-[22px] border" style={{ borderColor: `${colors.text}14` }}>
        <img
          src={media.url}
          alt={media.alt}
          className="h-[280px] w-full object-cover"
        />
      </div>
    </MediaShell>
  )
}

export function AnnotatedImageBlock({ dna, slot, colors }: DNAComponentProps) {
  const media = getMediaItem(dna, slot)
  if (!media) return null

  return (
    <MediaShell
      colors={colors}
      usageLabel={getMediaUsageLabel(media)}
      caption={media.caption}
      relevance={media.relevance}
      sourceName={media.source.name}
      sourceUrl={media.source.url}
    >
      <div
        className="relative overflow-hidden rounded-[22px] border"
        style={{ borderColor: `${colors.text}14` }}
      >
        <img
          src={media.url}
          alt={media.alt}
          className="h-[280px] w-full object-cover"
        />

        {media.annotations?.map((annotation, index) => (
          <div
            key={`${annotation.label}-${index}`}
            className="absolute flex max-w-[150px] flex-col"
            style={{
              left: `${annotation.x * 100}%`,
              top: `${annotation.y * 100}%`,
              transform: 'translate(-10%, -50%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border-2"
                style={{
                  borderColor: colors.background,
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 0 4px ${colors.primary}22`,
                }}
              />
              <span
                className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  color: colors.background,
                  backgroundColor: colors.primary,
                }}
              >
                {annotation.label}
              </span>
            </div>
            {annotation.detail ? (
              <span
                className="mt-2 rounded-2xl px-3 py-2 text-[11px] leading-4"
                style={{
                  color: colors.text,
                  backgroundColor: `${colors.background}cc`,
                  border: `1px solid ${colors.text}14`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                {annotation.detail}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </MediaShell>
  )
}

export function ScanCardBlock({ dna, slot, colors }: DNAComponentProps) {
  const media = getMediaItem(dna, slot)
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
    >
      <div
        className="overflow-hidden rounded-[18px] border px-4 py-4"
        style={{
          borderColor: `${colors.text}14`,
          backgroundColor: `${colors.background}cc`,
        }}
      >
        <img
          src={media.url}
          alt={media.alt}
          className={`w-full rounded-xl ${objectFit === 'cover' ? 'h-[260px]' : 'max-h-[240px]'}`}
          style={{
            backgroundColor: `${colors.text}08`,
            objectFit,
            objectPosition: getMediaObjectPosition(media),
          }}
        />
      </div>
    </MediaShell>
  )
}
