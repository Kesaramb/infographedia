import {
  type CollectionBeforeValidateHook,
  type PayloadRequest,
  type Where,
} from 'payload'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { PostImage, PostSEO, PostTag } from '@/lib/post-meta'
import type { RenderEngineValue } from '@/lib/infographic-engine'
import type { StoryDocumentV3 } from '@/lib/story/schema'
import { adaptLegacyCompatiblePost } from '@/lib/story/legacy-post-adapter'

const NUMERIC_SLUG_PATTERN = /^\d+$/

export interface PublicPost {
  id: number
  slug: string
  title: string
  description?: string | null
  renderEngine: RenderEngineValue
  formatVersion: 1 | 2 | 3
  documentV2?: InfographicDocumentV2 | null
  storyDocument?: StoryDocumentV3 | null
  dna: InfographicDNA
  createdAt: string
  updatedAt?: string
  author: {
    username: string
    avatar?: {
      url?: string | null
    } | null
  }
  renderedImage?: PostImage
  meta?: PostSEO | null
  tags?: PostTag[] | null
  parentPost?: {
    id: number
    slug?: string
    title: string
    author?: {
      username: string
    } | null
  } | null
  metrics: {
    likes: number
    saves: number
    shares: number
    comments: number
    iterationCount: number
  }
}

export function normalizePublicPost(
  doc: Record<string, unknown>,
): PublicPost {
  const readModel = adaptLegacyCompatiblePost(doc)

  return {
    ...(doc as unknown as PublicPost),
    renderEngine: readModel.renderEngine,
    formatVersion: readModel.formatVersion,
    documentV2: readModel.documentV2,
    storyDocument: readModel.storyDocument,
    dna: readModel.dna as PublicPost['dna'],
  }
}

function sanitizeSlugFragment(value: string): string {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  if (!base) return 'post'
  if (NUMERIC_SLUG_PATTERN.test(base)) return `post-${base}`

  return base
}

export function normalizePostSlug(value: string): string {
  return sanitizeSlugFragment(value)
}

function getRequestedSlug(
  data: Partial<{
    slug?: string
    title?: string
  }> | undefined,
  originalDoc?: Partial<{
    slug?: string
    title?: string
  }>,
): string | null {
  if (typeof data?.slug === 'string' && data.slug.trim()) {
    return data.slug.trim()
  }

  if (typeof originalDoc?.slug === 'string' && originalDoc.slug.trim()) {
    return originalDoc.slug.trim()
  }

  if (typeof data?.title === 'string' && data.title.trim()) {
    return data.title.trim()
  }

  if (typeof originalDoc?.title === 'string' && originalDoc.title.trim()) {
    return originalDoc.title.trim()
  }

  return null
}

export async function buildUniquePostSlug(
  req: Pick<PayloadRequest, 'payload'>,
  value: string,
  excludeID?: number | string,
): Promise<string> {
  const base = normalizePostSlug(value)
  let candidate = base
  let suffix = 2

  while (true) {
    const where: Where = excludeID
      ? {
          and: [
            { slug: { equals: candidate } },
            { id: { not_equals: excludeID } },
          ],
        }
      : { slug: { equals: candidate } }

    const existing = await req.payload.find({
      collection: 'posts',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where,
    })

    if (existing.docs.length === 0) {
      return candidate
    }

    candidate = `${base}-${suffix}`
    suffix++
  }
}

export const ensurePostSlug: CollectionBeforeValidateHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const nextData = { ...(data ?? {}) }

  const explicitSlug =
    typeof nextData.slug === 'string' && nextData.slug.trim().length > 0
      ? nextData.slug
      : null

  const shouldPreserveExistingSlug =
    operation === 'update' &&
    !explicitSlug &&
    typeof originalDoc?.slug === 'string' &&
    originalDoc.slug.trim().length > 0

  if (shouldPreserveExistingSlug) {
    nextData.slug = originalDoc.slug
    return nextData
  }

  const slugSource = getRequestedSlug(nextData, originalDoc)
  if (!slugSource) return nextData

  nextData.slug = await buildUniquePostSlug(req, slugSource, originalDoc?.id)
  return nextData
}

export function isLegacyNumericPostParam(value: string): boolean {
  return NUMERIC_SLUG_PATTERN.test(value)
}
