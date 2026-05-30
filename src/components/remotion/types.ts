import type { CompiledLayoutBlock, ResolvedDNAColors } from '@/lib/dna/rendering'
import type { InfographicDNA } from '@/lib/dna/schema'

export interface AnimatedRenderableProps {
  dna: InfographicDNA
  colors: ResolvedDNAColors
  block: CompiledLayoutBlock
}
