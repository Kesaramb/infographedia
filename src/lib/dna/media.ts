import type {
  ComponentSlotData,
  ComponentTypeValue,
  InfographicDNA,
  MediaItem,
  MediaKindValue,
} from '@/lib/dna/schema'
import { MEDIA_COMPONENT_TYPES } from '@/lib/dna/schema'

export function isMediaComponentType(type: ComponentTypeValue): type is MediaKindValue {
  return MEDIA_COMPONENT_TYPES.includes(type as MediaKindValue)
}

export function getMediaItem(
  dna: InfographicDNA,
  slotOrMediaId: ComponentSlotData | string | undefined,
): MediaItem | undefined {
  const mediaId =
    typeof slotOrMediaId === 'string'
      ? slotOrMediaId
      : slotOrMediaId?.mediaId

  if (!mediaId) return undefined
  return (dna.content.media ?? []).find((item) => item.id === mediaId)
}

export function getMediaUsageLabel(media: MediaItem): string {
  if (media.usage === 'context') {
    return media.contextLabel ?? 'Context image'
  }

  switch (media.kind) {
    case 'scan-card':
      return 'Evidence scan'
    case 'annotated-image':
      return 'Annotated evidence'
    default:
      return 'Evidence image'
  }
}

const DOCUMENT_HINTS = [
  '.pdf',
  '/pdf',
  'report',
  'study',
  'paper',
  'filing',
  'document',
  'court',
  'memo',
  'brief',
  'appendix',
  'whitepaper',
  'dataset',
  'table',
  'figure',
  'chart',
] as const

const READABLE_SCAN_HINTS = [
  'excerpt',
  'page',
  'report',
  'filing',
  'document',
  'table',
  'chart',
  'figure',
  'study',
  'paper',
  'brief',
  'official',
] as const

export function hasMediaFocusRegion(
  media: Pick<MediaItem, 'focusRegion'>,
): boolean {
  return Boolean(media.focusRegion)
}

export function isReadableScanMedia(
  media: Pick<MediaItem, 'kind' | 'url' | 'alt' | 'caption' | 'relevance' | 'source' | 'focusRegion'>,
): boolean {
  if (media.kind !== 'scan-card') return true
  if (hasMediaFocusRegion(media)) return true

  const sourceHaystack = `${media.url} ${media.source.url}`.toLowerCase()
  const textHaystack = `${media.alt} ${media.caption ?? ''} ${media.relevance}`.toLowerCase()

  return (
    DOCUMENT_HINTS.some((hint) => sourceHaystack.includes(hint)) &&
    READABLE_SCAN_HINTS.some((hint) => textHaystack.includes(hint))
  )
}

export function getMediaImageFit(media: Pick<MediaItem, 'kind' | 'focusRegion'>): 'cover' | 'contain' {
  if (media.kind === 'scan-card' && !hasMediaFocusRegion(media)) {
    return 'contain'
  }

  return 'cover'
}

export function getMediaObjectPosition(
  media: Pick<MediaItem, 'focusRegion'>,
): string {
  if (!media.focusRegion) return 'center'

  const centerX = clamp(media.focusRegion.x + media.focusRegion.width / 2, 0.1, 0.9)
  const centerY = clamp(media.focusRegion.y + media.focusRegion.height / 2, 0.1, 0.9)

  return `${Math.round(centerX * 100)}% ${Math.round(centerY * 100)}%`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
