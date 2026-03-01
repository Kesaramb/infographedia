/** A single knowledge point stored in the Qdrant vector store */
export interface KnowledgePoint {
  id: string
  query: string
  topic: string
  searchResults: KnowledgeSearchResult[]
  dataSummary: string
  dataPoints: number
  chartType: string
  qualityScore: number
  createdAt: string
  postId?: number
}

export interface KnowledgeSearchResult {
  title: string
  url: string
  snippet: string
  usedInDNA: boolean
}

/** A result returned from a knowledge base search */
export interface KnowledgeResult {
  score: number
  query: string
  dataSummary: string
  searchResults: { title: string; url: string; snippet: string }[]
  qualityScore: number
  createdAt: string
  staleWarning?: string
}
