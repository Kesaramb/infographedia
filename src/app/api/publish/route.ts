import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { DNASchema } from '@/lib/dna/schema'

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
    const { title, description, dna, parentPostId } = body as {
      title?: string
      description?: string
      dna?: unknown
      parentPostId?: number
    }

    // Validate DNA
    if (!dna) {
      return NextResponse.json(
        { success: false, error: 'DNA is required.' },
        { status: 400 }
      )
    }

    const dnaResult = DNASchema.safeParse(dna)
    if (!dnaResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid DNA format.',
          details: dnaResult.error.issues,
        },
        { status: 400 }
      )
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 }
      )
    }

    // Create the post with authenticated user as author
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: title.trim(),
        description: description?.trim(),
        dna: dnaResult.data,
        author: user.id as number,
        parentPost: parentPostId as number | undefined,
        metrics: {
          likes: 0,
          saves: 0,
          shares: 0,
          iterationCount: 0,
        },
      },
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
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
