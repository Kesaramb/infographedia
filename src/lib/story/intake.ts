import type { InfographicDNA } from '@/lib/dna/schema'
import type { StoryDocumentV3, StoryRequestedViewValue } from './schema'

const VIEW_PATTERNS: Array<{ view: StoryRequestedViewValue; patterns: string[] }> = [
  { view: 'map', patterns: ['world map', 'country map', 'regional map', 'geographic', 'map', 'region', 'country'] },
  { view: 'bar', patterns: ['bar chart', 'bar graph', 'ranking bar', 'bars'] },
  { view: 'line', patterns: ['line chart', 'line graph', 'trend line', 'growth line'] },
  { view: 'area', patterns: ['area chart', 'area graph'] },
  { view: 'timeline', patterns: ['timeline', 'history', 'historical', 'chronology', 'over time', 'since '] },
  { view: 'compare', patterns: ['compare', 'comparison', 'versus', 'vs ', 'head-to-head'] },
  { view: 'list', patterns: ['top ', 'ranking', 'leaderboard', 'ranked list', 'list'] },
  { view: 'hierarchy', patterns: ['hierarchy', 'tree', 'taxonomy', 'org chart'] },
  { view: 'relation', patterns: ['relation', 'relationship', 'network', 'ecosystem', 'flow'] },
  { view: 'stat', patterns: ['single stat', 'stat card', 'headline number', 'big number'] },
  { view: 'media', patterns: ['photo', 'image', 'portrait', 'scan', 'document'] },
]

const HUMAN_STAKE_PATTERNS: Array<{ stake: string; patterns: string[] }> = [
  { stake: 'Cost of living and affordability for ordinary households.', patterns: ['housing', 'rent', 'afford', 'price', 'cost', 'mortgage'] },
  { stake: 'Jobs, wages, and future opportunity for workers and families.', patterns: ['job', 'jobs', 'salary', 'income', 'employment', 'layoff'] },
  { stake: 'Health and safety consequences that affect everyday life.', patterns: ['health', 'hospital', 'disease', 'death', 'safety', 'crime'] },
  { stake: 'Status, pride, or competitive advantage that people can immediately feel.', patterns: ['leader', 'dominates', 'beats', 'wins', 'ranking'] },
]

export interface StoryIntakeInput {
  prompt: string
  parentDNA?: InfographicDNA
  parentStoryDocument?: StoryDocumentV3
}

export interface StoryIntakePlan {
  prompt: string
  topic: string
  audience: string
  humanStake: string
  requestedViews: StoryRequestedViewValue[]
  constraints: string[]
  iterationMode: 'new' | 'iterate'
  parentFormat: 'legacy' | 'story-v3' | 'none'
}

export function buildStoryIntakePlan(
  input: StoryIntakeInput,
): StoryIntakePlan {
  const normalizedPrompt = normalizePrompt(input.prompt)
  const requestedViews = detectRequestedViews(normalizedPrompt)
  const topic = refineTopic(input.prompt)

  return {
    prompt: input.prompt.trim(),
    topic,
    audience: inferAudience(normalizedPrompt),
    humanStake: inferHumanStake(normalizedPrompt),
    requestedViews,
    constraints: inferConstraints(normalizedPrompt, requestedViews),
    iterationMode: input.parentDNA || input.parentStoryDocument ? 'iterate' : 'new',
    parentFormat: input.parentStoryDocument ? 'story-v3' : input.parentDNA ? 'legacy' : 'none',
  }
}

export function buildStorySearchQueries(
  intake: StoryIntakePlan,
): string[] {
  const queries = new Set<string>()
  const topic = intake.topic

  queries.add(`${topic} latest statistics`)

  if (intake.requestedViews.includes('map')) {
    queries.add(`${topic} by country latest`)
  }

  if (intake.requestedViews.includes('timeline') || intake.requestedViews.includes('line') || intake.requestedViews.includes('area')) {
    queries.add(`${topic} trend by year latest`)
  }

  if (intake.requestedViews.includes('compare') || intake.requestedViews.includes('list') || intake.requestedViews.includes('bar')) {
    queries.add(`${topic} ranking latest`)
  }

  return Array.from(queries).slice(0, 4)
}

function detectRequestedViews(prompt: string): StoryRequestedViewValue[] {
  const ranked = VIEW_PATTERNS
    .map(({ view, patterns }) => ({
      view,
      index: firstMatchIndex(prompt, patterns),
    }))
    .filter((entry): entry is { view: StoryRequestedViewValue; index: number } => entry.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (ranked.length === 0) {
    return ['bar']
  }

  const resolved = [...new Set(ranked.map((entry) => entry.view))].slice(0, 4)

  if (
    resolved.length === 1
    && resolved[0] === 'list'
    && /\b(top\s+\d{1,2}|ranking|leaderboard|most popular|top databases?)\b/i.test(prompt)
    && !/\blist\b/i.test(prompt)
  ) {
    return ['bar']
  }

  return resolved
}

function refineTopic(prompt: string): string {
  const refined = prompt
    .replace(/^(create|design|make|generate)\s+(an?\s+)?infographic\s+(about|on|showing|with|for)\s*/i, '')
    .replace(/\b(matters because|show why|explain why|keep the framing|keep it)\b[\s\S]*$/i, '')
    .replace(/\b(reveal that|reveal how|reveal why)\b[\s\S]*$/i, '')
    .replace(/\bin the tech world\b/gi, '')
    .replace(/\btheir data\b/gi, '')
    .replace(/\s+and\s*$/i, '')
    .replace(/\.\.\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

  if (/\bdatabase types?\b/i.test(refined)) {
    return refined.replace(/\bdatabase types?\b/gi, 'database management systems').trim()
  }

  return refined
}

function inferAudience(prompt: string): string {
  if (/\b(famil(y|ies)|parents|workers|students|voters|consumers)\b/.test(prompt)) {
    return 'General public'
  }

  if (/\b(founder|ceo|investor|developer|marketer|analyst)\b/.test(prompt)) {
    return 'Curious professionals and the general public'
  }

  return 'General public'
}

function inferHumanStake(prompt: string): string {
  for (const candidate of HUMAN_STAKE_PATTERNS) {
    if (candidate.patterns.some((pattern) => prompt.includes(pattern))) {
      return candidate.stake
    }
  }

  return 'The outcome affects public choices, costs, jobs, or access in ways ordinary people can actually feel.'
}

function inferConstraints(
  prompt: string,
  requestedViews: StoryRequestedViewValue[],
): string[] {
  const constraints: string[] = []

  if (requestedViews.length > 1) {
    constraints.push('Preserve the requested multi-view structure if the evidence supports it.')
  }

  if (prompt.includes('credible')) {
    constraints.push('Keep the framing credible and grounded in visible evidence.')
  }

  if (prompt.includes('ranking')) {
    constraints.push('Keep the primary view readable as a ranking.')
  }

  if (prompt.includes('young families')) {
    constraints.push('Keep the human stake centered on young families.')
  }

  return constraints.slice(0, 6)
}

function firstMatchIndex(text: string, patterns: string[]): number {
  let best = Number.POSITIVE_INFINITY

  for (const pattern of patterns) {
    const index = text.indexOf(pattern)
    if (index >= 0) best = Math.min(best, index)
  }

  return Number.isFinite(best) ? best : -1
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, ' ').trim()
}
