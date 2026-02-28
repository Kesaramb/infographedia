import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

/**
 * POST /api/posts/[id]/like
 *
 * Toggles the like state for the authenticated user on the given post.
 * If already liked → removes like (unlike). If not → creates like.
 * Also updates the post's aggregate metrics.likes counter.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const postId = Number(id)
    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID.' },
        { status: 400 }
      )
    }

    // Check if already liked
    const existing = await payload.find({
      collection: 'likes',
      where: {
        user: { equals: user.id },
        post: { equals: postId },
      },
      limit: 1,
    })

    let liked: boolean

    if (existing.docs.length > 0) {
      // Unlike — delete the like record
      await payload.delete({
        collection: 'likes',
        id: existing.docs[0].id,
      })
      liked = false
    } else {
      // Like — create a new like record
      await payload.create({
        collection: 'likes',
        data: {
          user: user.id as number,
          post: postId,
        },
      })
      liked = true
    }

    // Recount likes for accuracy
    const likeCount = await payload.count({
      collection: 'likes',
      where: { post: { equals: postId } },
    })

    // Update post aggregate metric
    const post = await payload.findByID({ collection: 'posts', id: postId })
    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        metrics: {
          ...(post.metrics as object),
          likes: likeCount.totalDocs,
        },
      },
    })

    return NextResponse.json({
      success: true,
      liked,
      count: likeCount.totalDocs,
    })
  } catch (error) {
    console.error('[/api/posts/[id]/like]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
