/**
 * Voyage AI embeddings for vectorizing queries and DNA content summaries.
 *
 * Uses Voyage AI (Anthropic's embedding partner) with the voyage-3.5 model.
 * Returns 1024-dimensional vectors for cosine similarity search in Qdrant.
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3.5'

interface VoyageResponse {
  data: Array<{ embedding: number[] }>
}

/** Embed a single text string into a 1024-dim vector */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedBatch([text])
  return results[0]
}

/** Embed multiple texts in a single API call */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not set. Add it to your .env file.')
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Voyage AI API error (${response.status}): ${body}`)
  }

  const data = (await response.json()) as VoyageResponse
  return data.data.map((d) => d.embedding)
}
