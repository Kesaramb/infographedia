import { notFound } from 'next/navigation'
import { PostDetail } from './post-detail'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Post detail page — server component that fetches the post,
 * then renders the client-side PostDetail component.
 */
export default async function PostPage({ params }: Props) {
  const { id } = await params

  // Fetch post from Payload REST API with populated relationships
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/posts/${id}?depth=2`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    notFound()
  }

  const post = await response.json()

  if (!post || !post.dna) {
    notFound()
  }

  return <PostDetail post={post} />
}
