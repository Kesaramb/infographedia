import { QdrantClient } from '@qdrant/js-client-rest'

const COLLECTION_NAME = 'infographedia-knowledge'
const VECTOR_SIZE = 1024 // Voyage voyage-3.5 dimensions

let _client: QdrantClient | null = null
let _collectionReady = false

function getClient(): QdrantClient {
  if (_client) return _client

  const url = process.env.QDRANT_URL
  if (!url) {
    throw new Error('QDRANT_URL is not set. Add it to your .env file.')
  }

  _client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

  return _client
}

/** Ensure the collection exists, creating it if needed. Called once per process. */
async function ensureCollection(): Promise<void> {
  if (_collectionReady) return

  const client = getClient()

  try {
    await client.getCollection(COLLECTION_NAME)
    _collectionReady = true
  } catch {
    // Collection doesn't exist — create it
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    })

    // Create payload indexes for filtering and sorting
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'createdAt',
      field_schema: 'datetime',
    })
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'qualityScore',
      field_schema: 'float',
    })

    _collectionReady = true
  }
}

export { getClient, ensureCollection, COLLECTION_NAME }
