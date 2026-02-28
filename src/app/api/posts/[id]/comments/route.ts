import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

/**
 * GET /api/posts/[id]/comments?page=1&limit=20
 *
 * Fetch paginated comments for a post, sorted newest-first.
 * Public — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = await params
    const postId = Number(id)
    if (isNaN(postId)) {
      return NextResponse.json({ docs: [], hasNextPage: false })
    }

    const page = Number(request.nextUrl.searchParams.get('page') ?? '1')
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20')

    const result = await payload.find({
      collection: 'comments',
      where: { post: { equals: postId } },
      sort: '-createdAt',
      limit,
      page,
      depth: 1, // Populate author
    })

    return NextResponse.json({
      docs: result.docs,
      hasNextPage: result.hasNextPage,
      totalDocs: result.totalDocs,
    })
  } catch (error) {
    console.error('[GET /api/posts/[id]/comments]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts/[id]/comments
 *
 * Create a new comment on a post. Auth required.
 * Body: { body: string }
 */
export async function POST(
  request: NextRequest,
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

    const { body } = (await request.json()) as { body?: string }

    if (!body || body.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment body is required.' },
        { status: 400 }
      )
    }

    if (body.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Comment must be 500 characters or less.' },
        { status: 400 }
      )
    }

    // Create the comment
    const comment = await payload.create({
      collection: 'comments',
      data: {
        author: user.id as number,
        post: postId,
        body: body.trim(),
      },
      depth: 1, // Return populated author
    })

    // Increment comment count on the post
    try {
      const post = await payload.findByID({ collection: 'posts', id: postId })
      const currentCount =
        (post.metrics as { comments?: number })?.comments ?? 0
      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          metrics: {
            ...(post.metrics as object),
            comments: currentCount + 1,
          },
        },
      })
    } catch {
      // Non-fatal: counter update failure shouldn't block comment creation
    }

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('[POST /api/posts/[id]/comments]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[id]/comments
 *
 * Delete a comment. Auth required, must be the comment author.
 * Body: { commentId: number }
 */
export async function DELETE(
  request: NextRequest,
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

    const { commentId } = (await request.json()) as { commentId?: number }
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required.' },
        { status: 400 }
      )
    }

    // Verify ownership
    const comment = await payload.findByID({
      collection: 'comments',
      id: commentId,
    })

    const commentAuthorId =
      typeof comment.author === 'object' && comment.author !== null
        ? (comment.author as { id: number }).id
        : (comment.author as number)

    if (commentAuthorId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own comments.' },
        { status: 403 }
      )
    }

    await payload.delete({ collection: 'comments', id: commentId })

    // Decrement comment count on the post
    try {
      const post = await payload.findByID({ collection: 'posts', id: postId })
      const currentCount =
        (post.metrics as { comments?: number })?.comments ?? 0
      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          metrics: {
            ...(post.metrics as object),
            comments: Math.max(0, currentCount - 1),
          },
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/posts/[id]/comments]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
