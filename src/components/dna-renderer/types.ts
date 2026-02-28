import type { InfographicDNA } from '@/lib/dna/schema'

/** Props shared by every DNA-rendered component (charts, blocks, badges) */
export interface DNAComponentProps {
  /** The full DNA object — components read content.data and presentation.colors */
  dna: InfographicDNA
  /** The component slot from presentation.components[] */
  slot: {
    type: string
    dataKey?: string
    labelKey?: string
  }
  /** Resolved color values from presentation.colors (for Recharts props) */
  colors: ResolvedColors
}

/** Colors extracted from DNA and passed as props (Recharts can't read CSS vars) */
export interface ResolvedColors {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
}
