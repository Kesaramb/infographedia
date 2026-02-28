import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * POST /api/posts/[id]/share
 *
 * Increments the share counter for a post.
 * No auth required — sharing is a fire-and-forget counter bump.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })

    const { id } = await params
    const postId = Number(id)
    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID.' },
        { status: 400 }
      )
    }

    const post = await payload.findByID({ collection: 'posts', id: postId })
    const currentShares =
      (post.metrics as { shares?: number })?.shares ?? 0

    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        metrics: {
          ...(post.metrics as object),
          shares: currentShares + 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      count: currentShares + 1,
    })
  } catch (error) {
    console.error('[/api/posts/[id]/share]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
