import type { ComponentType } from 'react'
import type { InfographicDNA } from '@/lib/dna/schema'

// Chart compositions
import { AnimatedBarChart } from './compositions/animated-bar-chart'
import { AnimatedPieChart } from './compositions/animated-pie-chart'
import { AnimatedDonutChart } from './compositions/animated-donut-chart'
import { AnimatedLineChart } from './compositions/animated-line-chart'
import { AnimatedAreaChart } from './compositions/animated-area-chart'
import { AnimatedStatCard } from './compositions/animated-stat-card'
import { AnimatedTimeline } from './compositions/animated-timeline'
import { AnimatedGroupedBar } from './compositions/animated-grouped-bar'

/** Props shared by all animated chart components */
export interface AnimatedChartProps {
  dna: InfographicDNA
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

/**
 * Maps DNA chartType strings to Remotion-animated chart components.
 * Used by InfographicComposition to render the correct animated chart.
 */
export const ANIMATED_CHART_MAP: Record<string, ComponentType<AnimatedChartProps>> = {
  'bar-chart': AnimatedBarChart,
  'pie-chart': AnimatedPieChart,
  'donut-chart': AnimatedDonutChart,
  'line-chart': AnimatedLineChart,
  'area-chart': AnimatedAreaChart,
  'stat-card': AnimatedStatCard,
  'timeline': AnimatedTimeline,
  'grouped-bar-chart': AnimatedGroupedBar,
}
