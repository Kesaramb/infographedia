import type { Payload } from 'payload'
import { renderAntVDocumentToMedia, renderAntVDocumentToSVG } from '@/lib/antv/render'
import type { StoryDocumentV3 } from './schema'
import { storyDocumentToAntV } from './compat'

export async function renderStoryDocumentToSVG(
  storyDocument: StoryDocumentV3,
): Promise<string> {
  const antvDocument = storyDocumentToAntV(storyDocument)
  return renderAntVDocumentToSVG(antvDocument)
}

export async function renderStoryDocumentToMedia(
  payload: Payload,
  storyDocument: StoryDocumentV3,
  title: string,
): Promise<{ id: number | string; url?: string | null }> {
  const antvDocument = storyDocumentToAntV(storyDocument)
  return renderAntVDocumentToMedia(payload, antvDocument, title)
}
