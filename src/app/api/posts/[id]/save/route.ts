import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

/**
 * POST /api/posts/[id]/save
 *
 * Toggles the save (bookmark) state for the authenticated user on the given post.
 * Also updates the post's aggregate metrics.saves counter.
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

    // Check if already saved
    const existing = await payload.find({
      collection: 'saves',
      where: {
        user: { equals: user.id },
        post: { equals: postId },
      },
      limit: 1,
    })

    let saved: boolean

    if (existing.docs.length > 0) {
      // Unsave
      await payload.delete({
        collection: 'saves',
        id: existing.docs[0].id,
      })
      saved = false
    } else {
      // Save
      await payload.create({
        collection: 'saves',
        data: {
          user: user.id as number,
          post: postId,
        },
      })
      saved = true
    }

    // Recount saves for accuracy
    const saveCount = await payload.count({
      collection: 'saves',
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
          saves: saveCount.totalDocs,
        },
      },
    })

    return NextResponse.json({
      success: true,
      saved,
      count: saveCount.totalDocs,
    })
  } catch (error) {
    console.error('[/api/posts/[id]/save]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
