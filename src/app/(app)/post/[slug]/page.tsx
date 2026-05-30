import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { PostDetail } from './post-detail'
import { buildPostJsonLd, buildPostMetadata } from '@/lib/post-seo'
import { getPostByParam } from '@/lib/post-queries'
import { isLegacyNumericPostParam } from '@/lib/posts'
import { getPostPath } from '@/lib/site'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Post detail page — server component backed by the Payload Local API.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostByParam(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return buildPostMetadata(post)
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostByParam(slug)

  if (!post) {
    notFound()
  }

  if (isLegacyNumericPostParam(slug)) {
    permanentRedirect(getPostPath(post.slug))
  }

  const jsonLd = buildPostJsonLd(post)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostDetail post={post} />
    </>
  )
}
