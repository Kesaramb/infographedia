import type { StoryDocumentV3Draft } from './schema'

export function mineDeterministicInsights(
  draft: Pick<StoryDocumentV3Draft, 'normalized'>,
): StoryDocumentV3Draft['insights'] {
  const insights: StoryDocumentV3Draft['insights'] = []

  for (const dataset of draft.normalized.datasets.slice(0, 2)) {
    const sorted = [...dataset.items].sort((a, b) => b.value - a.value)
    const leader = sorted[0]
    const laggard = sorted[sorted.length - 1]

    if (leader) {
      insights.push({
        id: `${dataset.id}-leader`,
        type: 'leader',
        title: `${leader.label} leads`,
        description: `${leader.label} is the leading result in ${dataset.label.toLowerCase()}.`,
        datasetId: dataset.id,
        score: 0.9,
        supportingLabels: [leader.label],
      })
    }

    if (laggard && laggard.label !== leader?.label) {
      insights.push({
        id: `${dataset.id}-laggard`,
        type: 'laggard',
        title: `${laggard.label} trails`,
        description: `${laggard.label} sits at the bottom of ${dataset.label.toLowerCase()}.`,
        datasetId: dataset.id,
        score: 0.66,
        supportingLabels: [laggard.label],
      })
    }

    if (sorted.length >= 3) {
      const total = sorted.reduce((sum, item) => sum + item.value, 0)
      const topShare = total > 0 ? sorted.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / total : 0
      insights.push({
        id: `${dataset.id}-concentration`,
        type: 'concentration',
        title: 'A few entries dominate',
        description: `The top entries account for most of the visible weight in ${dataset.label.toLowerCase()}.`,
        datasetId: dataset.id,
        score: Math.max(0.5, Math.min(0.95, topShare)),
        supportingLabels: sorted.slice(0, 3).map((item) => item.label),
      })
    }
  }

  return insights.slice(0, 4)
}
