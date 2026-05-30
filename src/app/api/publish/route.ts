import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { DNASchema } from '@/lib/dna/schema'
import { PREVIEW_RENDER_PROFILE, preflightDNA } from '@/lib/dna/rendering'
import { normalizePostSlug } from '@/lib/posts'
import { ingestContentMedia } from '@/lib/media/ingest'
import { StoryDocumentSchema } from '@/lib/story/schema'
import { renderStoryDocumentToMedia, renderStoryDocumentToSVG } from '@/lib/story/render'
import { storyDocumentToDNA } from '@/lib/story/compat'

/**
 * POST /api/publish
 *
 * Creates a new post with validated DNA.
 * Requires authentication — uses the session cookie to identify the author.
 *
 * Body: {
 *   title: string
 *   description?: string
 *   dna: InfographicDNA
 *   parentPostId?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authenticate via session cookie
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, storyDocument, parentPostId } = body as {
      title?: string
      description?: string
      storyDocument?: unknown
      parentPostId?: number
    }

    if (!storyDocument) {
      return NextResponse.json(
        { success: false, error: 'StoryDocument is required.' },
        { status: 400 }
      )
    }

    const storyResult = StoryDocumentSchema.safeParse(storyDocument)
    if (!storyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid StoryDocument format.',
          details: storyResult.error.issues,
        },
        { status: 400 }
      )
    }

    let normalizedStoryDocument = storyResult.data
    let normalizedDNA = DNASchema.parse(storyDocumentToDNA(storyResult.data))
    let renderedImageId: number | string | undefined

    try {
      const ingestedMedia = await ingestContentMedia(payload, normalizedStoryDocument.evidence.media)
      normalizedStoryDocument = {
        ...normalizedStoryDocument,
        story: {
          ...normalizedStoryDocument.story,
          thesis: title?.trim() || normalizedStoryDocument.story.thesis,
        },
        evidence: {
          ...normalizedStoryDocument.evidence,
          media: ingestedMedia,
        },
      }

      const svg = await renderStoryDocumentToSVG(normalizedStoryDocument)
      const compatibilityDNA = storyDocumentToDNA(normalizedStoryDocument)
      const preflight = preflightDNA(compatibilityDNA, PREVIEW_RENDER_PROFILE)
      if (!preflight.ok) {
        return NextResponse.json(
          {
            success: false,
            error: preflight.errors.map((issue) => issue.message).join(' '),
            details: preflight.errors,
          },
          { status: 400 }
        )
      }

      normalizedStoryDocument = StoryDocumentSchema.parse({
        ...normalizedStoryDocument,
        artifacts: {
          ...normalizedStoryDocument.artifacts,
          svg,
        },
        compatibility: {
          dna: compatibilityDNA,
        },
      })
      normalizedDNA = DNASchema.parse(compatibilityDNA)

      const renderedImage = await renderStoryDocumentToMedia(
        payload,
        normalizedStoryDocument,
        title?.trim() || normalizedStoryDocument.story.thesis,
      )
      renderedImageId = renderedImage.id
      normalizedStoryDocument = {
        ...normalizedStoryDocument,
        artifacts: {
          ...normalizedStoryDocument.artifacts,
          renderedImageId,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown StoryDocument publish error'
      return NextResponse.json(
        {
          success: false,
          error: `Failed to finalize StoryDocument publish: ${message}. Please retry or regenerate.`,
        },
        { status: 400 }
      )
    }
    const resolvedTitle = title?.trim() || normalizedStoryDocument.story.thesis

    if (!resolvedTitle) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 }
      )
    }

    // Create the post with authenticated user as author
    const post = await payload.create({
      collection: 'posts',
      draft: false,
      data: {
        title: resolvedTitle,
        slug: normalizePostSlug(resolvedTitle),
        description: description?.trim(),
        renderEngine: 'story-v3' as unknown as 'dna-legacy' | 'antv',
        formatVersion: 3,
        storyDocument: normalizedStoryDocument,
        dna: normalizedDNA,
        renderedImage: typeof renderedImageId === 'number' ? renderedImageId : undefined,
        author: user.id as number,
        parentPost: parentPostId as number | undefined,
        metrics: {
          likes: 0,
          saves: 0,
          shares: 0,
          iterationCount: 0,
        },
      } as never,
    })

    // If this is an iteration, increment parent's iterationCount
    if (parentPostId) {
      try {
        const parent = await payload.findByID({
          collection: 'posts',
          id: parentPostId,
        })
        const currentCount =
          (parent.metrics as { iterationCount?: number })?.iterationCount ?? 0
        await payload.update({
          collection: 'posts',
          id: parentPostId,
          draft: false,
          data: {
            metrics: {
              ...(parent.metrics as object),
              iterationCount: currentCount + 1,
            },
          },
        })
      } catch {
        // Non-fatal: parent update failure shouldn't block post creation
        console.warn(`[/api/publish] Failed to increment parent ${parentPostId} iterationCount`)
      }
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('[/api/publish] Unexpected error:', error)
    const message = error instanceof Error ? error.message : String(error)

    if (
      message.includes('enum_posts_render_engine')
      || message.includes('story-v3')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Publishing is temporarily unavailable while the server finishes a required schema update. Please retry in a moment.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
