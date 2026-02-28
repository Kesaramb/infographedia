import type { ComponentType } from 'react'
import type { DNAComponentProps } from './types'

// Blocks
import { TitleBlock } from './blocks/title-block'
import { SubtitleBlock } from './blocks/subtitle-block'
import { HookBlock } from './blocks/hook-block'
import { FootnoteBlock } from './blocks/footnote-block'
import { SourceBadge } from './blocks/source-badge'

// Charts
import { BarChartBlock } from '@/components/charts/bar-chart'
import { PieChartBlock } from '@/components/charts/pie-chart'
import { LineChartBlock } from '@/components/charts/line-chart'
import { AreaChartBlock } from '@/components/charts/area-chart'
import { DonutChartBlock } from '@/components/charts/donut-chart'
import { StatCardBlock } from '@/components/charts/stat-card'
import { TimelineBlock } from '@/components/charts/timeline'
import { GroupedBarChartBlock } from '@/components/charts/grouped-bar-chart'

/**
 * Maps DNA component type strings to React components.
 * The DNARenderer iterates over presentation.components[] and looks up each
 * type in this map. Unknown types are gracefully skipped (return null).
 */
export const COMPONENT_MAP: Record<string, ComponentType<DNAComponentProps>> = {
  // Text blocks
  'title': TitleBlock,
  'subtitle': SubtitleBlock,
  'hook': HookBlock,
  'footnote': FootnoteBlock,
  'source-badge': SourceBadge,

  // Chart components
  'bar-chart': BarChartBlock,
  'pie-chart': PieChartBlock,
  'line-chart': LineChartBlock,
  'area-chart': AreaChartBlock,
  'donut-chart': DonutChartBlock,
  'stat-card': StatCardBlock,
  'timeline': TimelineBlock,
  'grouped-bar-chart': GroupedBarChartBlock,
}
