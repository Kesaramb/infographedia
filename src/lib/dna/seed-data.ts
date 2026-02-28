import type { InfographicDNA } from './schema'

/**
 * 8 sample DNA objects for seeding the database.
 * Covers all chart types and multiple themes.
 * Each is a complete, valid InfographicDNA.
 */
export const SEED_DNA: Array<{
  title: string
  description: string
  dna: InfographicDNA
  tags: string[]
}> = [
  // 1. Bar Chart — Glass Dark
  {
    title: 'Top 5 Most Populated Countries (2026)',
    description:
      'A look at the five most populated nations on Earth and how their populations compare. #Population #Demographics',
    tags: ['population', 'demographics', 'world'],
    dna: {
      content: {
        title: 'Top 5 Most Populated Countries (2026)',
        subtitle: 'In billions and millions',
        data: [
          { label: 'India', value: 1.45, unit: 'billion' },
          { label: 'China', value: 1.42, unit: 'billion' },
          { label: 'United States', value: 341, unit: 'million' },
          { label: 'Indonesia', value: 279, unit: 'million' },
          { label: 'Pakistan', value: 240, unit: 'million' },
        ],
        sources: [
          {
            name: 'United Nations Population Division',
            url: 'https://population.un.org/wpp/',
            accessedAt: '2026-02-27',
          },
        ],
        footnotes: 'India overtook China as the most populous country in 2023.',
      },
      presentation: {
        theme: 'glass-dark',
        chartType: 'bar-chart',
        layout: 'centered',
        colors: {
          primary: '#3b82f6',
          secondary: '#1e40af',
          background: '#0a0a0a',
          text: '#ffffff',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'bar-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'footnote' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 2. Pie Chart — Neon Cyberpunk
  {
    title: 'Global Coffee Consumption by Region',
    description:
      'Which regions drink the most coffee? The answer might surprise you. #Coffee #GlobalData',
    tags: ['coffee', 'food', 'global'],
    dna: {
      content: {
        title: 'Global Coffee Consumption by Region',
        data: [
          { label: 'Europe', value: 33 },
          { label: 'Asia Pacific', value: 28 },
          { label: 'North America', value: 18 },
          { label: 'South America', value: 14 },
          { label: 'Africa & Middle East', value: 7 },
        ],
        sources: [
          {
            name: 'International Coffee Organization',
            url: 'https://www.ico.org/Market-Report-25-26-e.asp',
            accessedAt: '2026-02-20',
          },
        ],
      },
      presentation: {
        theme: 'neon-cyberpunk',
        chartType: 'pie-chart',
        layout: 'centered',
        colors: {
          primary: '#00ff88',
          secondary: '#ff00ff',
          background: '#0a0014',
          text: '#e0ffe0',
          accent: '#00ffff',
        },
        components: [
          { type: 'title' },
          { type: 'pie-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 3. Line Chart — Minimalist
  {
    title: 'Global Average Temperature Anomaly (2015-2025)',
    description:
      'Tracking the global temperature deviation from the 20th century average over the past decade. #Climate #Science',
    tags: ['climate', 'temperature', 'science'],
    dna: {
      content: {
        title: 'Global Average Temperature Anomaly',
        subtitle: 'Deviation from 20th century average (°C)',
        data: [
          { label: '2015', value: 0.9 },
          { label: '2016', value: 0.99 },
          { label: '2017', value: 0.91 },
          { label: '2018', value: 0.83 },
          { label: '2019', value: 0.95 },
          { label: '2020', value: 0.98 },
          { label: '2021', value: 0.84 },
          { label: '2022', value: 0.86 },
          { label: '2023', value: 1.18 },
          { label: '2024', value: 1.29 },
          { label: '2025', value: 1.33 },
        ],
        sources: [
          {
            name: 'NOAA National Centers for Environmental Information',
            url: 'https://www.ncei.noaa.gov/access/monitoring/global-temperature-anomalies/',
            accessedAt: '2026-02-25',
          },
        ],
        footnotes: '2024 was the hottest year on record at the time of measurement.',
      },
      presentation: {
        theme: 'minimalist',
        chartType: 'line-chart',
        layout: 'centered',
        colors: {
          primary: '#dc2626',
          background: '#fafafa',
          text: '#171717',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'line-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'footnote' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 4. Stat Card — Editorial
  {
    title: 'The Cost of a Data Breach (2025)',
    description:
      'The average cost of a data breach hit an all-time high. Here is the single most important number. #Cybersecurity',
    tags: ['cybersecurity', 'business', 'technology'],
    dna: {
      content: {
        title: 'Average Cost of a Data Breach',
        subtitle: '2025 Global Average',
        data: [{ label: 'Average Cost', value: 4.88, unit: 'million USD' }],
        sources: [
          {
            name: 'IBM Security Cost of a Data Breach Report',
            url: 'https://www.ibm.com/reports/data-breach',
            accessedAt: '2026-01-15',
          },
        ],
        footnotes: 'Up 10% from 2024. Healthcare remains the most expensive industry for breaches.',
      },
      presentation: {
        theme: 'editorial',
        chartType: 'stat-card',
        layout: 'centered',
        colors: {
          primary: '#b91c1c',
          background: '#fffbeb',
          text: '#1c1917',
          accent: '#f59e0b',
        },
        components: [
          { type: 'title' },
          { type: 'stat-card', dataKey: 'value', labelKey: 'label' },
          { type: 'footnote' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 5. Donut Chart — Ocean Depth
  {
    title: "Earth's Water Distribution",
    description:
      "97% of Earth's water is in the oceans. Here is how the remaining 3% breaks down. #Water #Environment",
    tags: ['environment', 'water', 'science'],
    dna: {
      content: {
        title: "Earth's Freshwater Distribution",
        subtitle: 'Of the 3% that is not saltwater',
        data: [
          { label: 'Ice Caps & Glaciers', value: 68.7 },
          { label: 'Groundwater', value: 30.1 },
          { label: 'Surface Water', value: 0.9 },
          { label: 'Other', value: 0.3 },
        ],
        sources: [
          {
            name: 'USGS Water Science School',
            url: 'https://www.usgs.gov/special-topics/water-science-school/science/where-earths-water',
            accessedAt: '2026-02-10',
          },
        ],
      },
      presentation: {
        theme: 'ocean-depth',
        chartType: 'donut-chart',
        layout: 'centered',
        colors: {
          primary: '#0ea5e9',
          secondary: '#0369a1',
          background: '#0c1929',
          text: '#e0f2fe',
          accent: '#38bdf8',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'donut-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 6. Area Chart — Warm Earth
  {
    title: 'Global Renewable Energy Capacity (2018-2025)',
    description:
      'Renewable energy capacity has more than doubled in seven years. #Energy #Renewables',
    tags: ['energy', 'renewables', 'climate'],
    dna: {
      content: {
        title: 'Global Renewable Energy Capacity',
        subtitle: 'Total installed capacity in GW',
        data: [
          { label: '2018', value: 2351, unit: 'GW' },
          { label: '2019', value: 2537, unit: 'GW' },
          { label: '2020', value: 2799, unit: 'GW' },
          { label: '2021', value: 3064, unit: 'GW' },
          { label: '2022', value: 3372, unit: 'GW' },
          { label: '2023', value: 3870, unit: 'GW' },
          { label: '2024', value: 4460, unit: 'GW' },
          { label: '2025', value: 5200, unit: 'GW' },
        ],
        sources: [
          {
            name: 'IRENA Renewable Capacity Statistics',
            url: 'https://www.irena.org/publications/2025/Mar/Renewable-capacity-statistics-2025',
            accessedAt: '2026-02-18',
          },
        ],
        footnotes: 'Solar PV accounts for 60% of new additions since 2022.',
      },
      presentation: {
        theme: 'warm-earth',
        chartType: 'area-chart',
        layout: 'centered',
        colors: {
          primary: '#16a34a',
          secondary: '#4ade80',
          background: '#1a1207',
          text: '#fef3c7',
          accent: '#a3e635',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'area-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'footnote' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 7. Timeline — Glass Light
  {
    title: 'Major AI Milestones (2020-2025)',
    description:
      'A timeline of the key moments that shaped the AI revolution. #AI #Technology #Timeline',
    tags: ['ai', 'technology', 'history'],
    dna: {
      content: {
        title: 'Major AI Milestones',
        subtitle: '2020 – 2025',
        data: [
          { label: 'GPT-3 Released', value: 2020 },
          { label: 'DALL-E Introduced', value: 2021 },
          { label: 'ChatGPT Launch', value: 2022 },
          { label: 'GPT-4 & Claude 2', value: 2023 },
          { label: 'AI Agents & Multimodal', value: 2024 },
          { label: 'Autonomous AI Coding', value: 2025 },
        ],
        sources: [
          {
            name: 'Stanford AI Index Report 2025',
            url: 'https://aiindex.stanford.edu/report/',
            accessedAt: '2026-02-22',
          },
        ],
      },
      presentation: {
        theme: 'glass-light',
        chartType: 'timeline',
        layout: 'left-aligned',
        colors: {
          primary: '#7c3aed',
          secondary: '#a78bfa',
          background: '#f5f5f5',
          text: '#1e1b4b',
          accent: '#c084fc',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'timeline', dataKey: 'value', labelKey: 'label' },
          { type: 'source-badge' },
        ],
      },
    },
  },

  // 8. Grouped Bar Chart — Glass Dark (ITERATION of post #1)
  {
    title: 'Population Growth: 2020 vs 2026 (Top 5)',
    description:
      'Iterated from @data.pioneer — comparing population figures from 2020 and 2026 projections. #Population #Comparison',
    tags: ['population', 'demographics', 'comparison'],
    dna: {
      content: {
        title: 'Population Growth: 2020 vs 2026',
        subtitle: 'Top 5 most populated countries',
        data: [
          { label: 'India 2020', value: 1.38, unit: 'billion', metadata: { group: '2020' } },
          { label: 'India 2026', value: 1.45, unit: 'billion', metadata: { group: '2026' } },
          { label: 'China 2020', value: 1.44, unit: 'billion', metadata: { group: '2020' } },
          { label: 'China 2026', value: 1.42, unit: 'billion', metadata: { group: '2026' } },
          { label: 'USA 2020', value: 331, unit: 'million', metadata: { group: '2020' } },
          { label: 'USA 2026', value: 341, unit: 'million', metadata: { group: '2026' } },
          { label: 'Indonesia 2020', value: 274, unit: 'million', metadata: { group: '2020' } },
          { label: 'Indonesia 2026', value: 279, unit: 'million', metadata: { group: '2026' } },
          { label: 'Pakistan 2020', value: 221, unit: 'million', metadata: { group: '2020' } },
          { label: 'Pakistan 2026', value: 240, unit: 'million', metadata: { group: '2026' } },
        ],
        sources: [
          {
            name: 'United Nations Population Division',
            url: 'https://population.un.org/wpp/',
            accessedAt: '2026-02-27',
          },
          {
            name: 'World Bank Open Data',
            url: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
            accessedAt: '2026-02-27',
          },
        ],
        footnotes:
          'China is the only top-5 country with declining population. India added ~70 million people.',
      },
      presentation: {
        theme: 'glass-dark',
        chartType: 'grouped-bar-chart',
        layout: 'centered',
        colors: {
          primary: '#6366f1',
          secondary: '#a5b4fc',
          background: '#0a0a0a',
          text: '#ffffff',
          accent: '#818cf8',
        },
        components: [
          { type: 'title' },
          { type: 'subtitle' },
          { type: 'grouped-bar-chart', dataKey: 'value', labelKey: 'label' },
          { type: 'footnote' },
          { type: 'source-badge' },
        ],
      },
    },
  },
]
