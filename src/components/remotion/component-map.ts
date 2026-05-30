import type { ComponentType } from 'react'
import type { AnimatedRenderableProps } from './types'

// Chart compositions
import { AnimatedBarChart } from './compositions/animated-bar-chart'
import { AnimatedPieChart } from './compositions/animated-pie-chart'
import { AnimatedDonutChart } from './compositions/animated-donut-chart'
import { AnimatedLineChart } from './compositions/animated-line-chart'
import { AnimatedAreaChart } from './compositions/animated-area-chart'
import { AnimatedStatCard } from './compositions/animated-stat-card'
import { AnimatedTimeline } from './compositions/animated-timeline'
import { AnimatedGroupedBar } from './compositions/animated-grouped-bar'
import { AnimatedPictogram } from './compositions/animated-pictogram'
import { AnimatedVsSplit } from './compositions/animated-vs-split'
import { AnimatedMapChart } from './compositions/animated-map-chart'
import { AnimatedTitle } from './blocks/animated-title'
import { AnimatedSubtitle } from './blocks/animated-subtitle'
import { AnimatedHook } from './blocks/animated-hook'
import { AnimatedFootnote } from './blocks/animated-footnote'
import { AnimatedSourceBadge } from './blocks/animated-source-badge'
import {
  AnimatedAnnotatedImage,
  AnimatedHeroImage,
  AnimatedScanCard,
} from './blocks/animated-media-blocks'

export const ANIMATED_BLOCK_MAP: Record<string, ComponentType<AnimatedRenderableProps>> = {
  'title': AnimatedTitle,
  'subtitle': AnimatedSubtitle,
  'hook': AnimatedHook,
  'footnote': AnimatedFootnote,
  'source-badge': AnimatedSourceBadge,
  'hero-image': AnimatedHeroImage,
  'annotated-image': AnimatedAnnotatedImage,
  'scan-card': AnimatedScanCard,
}

/**
 * Maps DNA chartType strings to Remotion-animated chart components.
 * Used by InfographicComposition to render the correct animated chart.
 */
export const ANIMATED_CHART_MAP: Record<string, ComponentType<AnimatedRenderableProps>> = {
  'bar-chart': AnimatedBarChart,
  'pie-chart': AnimatedPieChart,
  'donut-chart': AnimatedDonutChart,
  'line-chart': AnimatedLineChart,
  'area-chart': AnimatedAreaChart,
  'stat-card': AnimatedStatCard,
  'timeline': AnimatedTimeline,
  'grouped-bar-chart': AnimatedGroupedBar,
  'pictogram': AnimatedPictogram,
  'vs-split': AnimatedVsSplit,
  'map-chart': AnimatedMapChart,
}

export const ANIMATED_COMPONENT_MAP: Record<string, ComponentType<AnimatedRenderableProps>> = {
  ...ANIMATED_BLOCK_MAP,
  ...ANIMATED_CHART_MAP,
}
