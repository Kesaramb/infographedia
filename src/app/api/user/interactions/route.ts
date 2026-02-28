import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

/**
 * GET /api/user/interactions?postIds=1,2,3
 *
 * Returns which posts the current user has liked/saved.
 * Used by the feed to batch-check interaction state without N+1 queries.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList })

    if (!user) {
      return NextResponse.json({ liked: [], saved: [] })
    }

    const postIdsParam = request.nextUrl.searchParams.get('postIds')
    if (!postIdsParam) {
      return NextResponse.json({ liked: [], saved: [] })
    }

    const postIds = postIdsParam
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n))

    if (postIds.length === 0) {
      return NextResponse.json({ liked: [], saved: [] })
    }

    // Batch fetch likes and saves for these posts by the current user
    const [likes, saves] = await Promise.all([
      payload.find({
        collection: 'likes',
        where: {
          user: { equals: user.id },
          post: { in: postIds },
        },
        limit: postIds.length,
      }),
      payload.find({
        collection: 'saves',
        where: {
          user: { equals: user.id },
          post: { in: postIds },
        },
        limit: postIds.length,
      }),
    ])

    const likedPostIds = likes.docs.map((doc) =>
      typeof doc.post === 'object' && doc.post !== null
        ? (doc.post as { id: number }).id
        : (doc.post as number)
    )

    const savedPostIds = saves.docs.map((doc) =>
      typeof doc.post === 'object' && doc.post !== null
        ? (doc.post as { id: number }).id
        : (doc.post as number)
    )

    return NextResponse.json({
      liked: likedPostIds,
      saved: savedPostIds,
    })
  } catch (error) {
    console.error('[/api/user/interactions]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
