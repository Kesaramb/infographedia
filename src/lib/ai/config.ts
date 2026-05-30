import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_SYSTEM_PROMPT } from './prompts'
import type { LayoutFamilyValue, ThemeNameValue } from '@/lib/dna/schema'
import type { AntVTemplateCategoryValue } from '@/lib/antv/schema'

// ============================================================
// AI Configuration — reads admin-editable settings from Payload
//
// Falls back to hardcoded defaults when:
// - The global hasn't been configured yet
// - Payload isn't available (e.g., during build)
// - Any field is missing or null
// ============================================================

export interface AIConfig {
  model: string
  temperature: number
  maxTokens: number
  maxToolRounds: number
  enableWebSearch: boolean
  enableKnowledgeBase: boolean
  enableStoryPipelineV3: boolean
  enableLegacyReadAdapter: boolean
  enableInsightMiner: boolean
  enableCritic: boolean
  enableDiversityPlanner: boolean
  enableGroundedMedia: boolean
  // Deprecated compatibility fields retained in code until old helper modules are deleted.
  enableAntVGenerator: boolean
  enableAntVPreview: boolean
  enableEngineRouter: boolean
  enableMultiPanelAntV: boolean
  defaultNewPostEngine: 'dna-legacy' | 'antv'
  systemPrompt: string
  allowedChartTypes: string[]
  allowedThemes: string[]
  allowedLayoutFamilies: LayoutFamilyValue[]
  allowedAntVTemplateCategories: AntVTemplateCategoryValue[]
  allowedAntVThemes: ThemeNameValue[]
  fewShotExamples: Array<{ label: string; dnaJson: unknown }>
}

const DEFAULTS: AIConfig = {
  model: 'claude-sonnet-4-20250514',
  temperature: 1,
  maxTokens: 4096,
  maxToolRounds: 8,
  enableWebSearch: true,
  enableKnowledgeBase: true,
  enableStoryPipelineV3: true,
  enableLegacyReadAdapter: true,
  enableInsightMiner: true,
  enableCritic: true,
  enableDiversityPlanner: true,
  enableGroundedMedia: true,
  enableAntVGenerator: false,
  enableAntVPreview: false,
  enableEngineRouter: true,
  enableMultiPanelAntV: true,
  defaultNewPostEngine: 'dna-legacy',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  allowedChartTypes: [
    'bar-chart',
    'pie-chart',
    'line-chart',
    'area-chart',
    'timeline',
    'stat-card',
    'grouped-bar-chart',
    'donut-chart',
    'pictogram',
    'vs-split',
    'map-chart',
  ],
  allowedThemes: [
    'glass-dark',
    'glass-light',
    'neon-cyberpunk',
    'minimalist',
    'editorial',
    'warm-earth',
    'ocean-depth',
  ],
  allowedLayoutFamilies: [
    'editorial-cover',
    'spotlight-rail',
    'evidence-board',
    'briefing-sheet',
  ],
  allowedAntVTemplateCategories: [
    'list',
    'sequence',
    'compare',
    'chart',
    'hierarchy',
    'relation',
  ],
  allowedAntVThemes: [
    'glass-dark',
    'minimalist',
    'editorial',
    'ocean-depth',
  ],
  fewShotExamples: [],
}

// Simple module-level cache with 30s TTL
let cachedConfig: AIConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 seconds

/**
 * Fetch AI configuration from the Payload admin global.
 * Caches for 30 seconds to avoid DB hits on every generation.
 */
export async function getAIConfig(): Promise<AIConfig> {
  const now = Date.now()
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig
  }

  try {
    const payload = await getPayload({ config })
    // Cast to Record — payload-types.ts is auto-generated and may not include this global yet
    const global = await payload.findGlobal({ slug: 'ai-agent-config' }) as unknown as Record<string, unknown>

    const result: AIConfig = {
      model: (typeof global.model === 'string' && global.model) || DEFAULTS.model,
      temperature: typeof global.temperature === 'number' ? global.temperature : DEFAULTS.temperature,
      maxTokens: typeof global.maxTokens === 'number' ? global.maxTokens : DEFAULTS.maxTokens,
      maxToolRounds: typeof global.maxToolRounds === 'number' ? global.maxToolRounds : DEFAULTS.maxToolRounds,
      enableWebSearch: typeof global.enableWebSearch === 'boolean' ? global.enableWebSearch : DEFAULTS.enableWebSearch,
      enableKnowledgeBase: typeof global.enableKnowledgeBase === 'boolean' ? global.enableKnowledgeBase : DEFAULTS.enableKnowledgeBase,
      enableStoryPipelineV3: typeof global.enableStoryPipelineV3 === 'boolean' ? global.enableStoryPipelineV3 : DEFAULTS.enableStoryPipelineV3,
      enableLegacyReadAdapter: typeof global.enableLegacyReadAdapter === 'boolean' ? global.enableLegacyReadAdapter : DEFAULTS.enableLegacyReadAdapter,
      enableInsightMiner: typeof global.enableInsightMiner === 'boolean' ? global.enableInsightMiner : DEFAULTS.enableInsightMiner,
      enableCritic: typeof global.enableCritic === 'boolean' ? global.enableCritic : DEFAULTS.enableCritic,
      enableDiversityPlanner: typeof global.enableDiversityPlanner === 'boolean' ? global.enableDiversityPlanner : DEFAULTS.enableDiversityPlanner,
      enableGroundedMedia: typeof global.enableGroundedMedia === 'boolean' ? global.enableGroundedMedia : DEFAULTS.enableGroundedMedia,
      enableAntVGenerator: DEFAULTS.enableAntVGenerator,
      enableAntVPreview: DEFAULTS.enableAntVPreview,
      enableEngineRouter: DEFAULTS.enableEngineRouter,
      enableMultiPanelAntV: DEFAULTS.enableMultiPanelAntV,
      defaultNewPostEngine: DEFAULTS.defaultNewPostEngine,
      systemPrompt: (typeof global.systemPrompt === 'string' && global.systemPrompt) || DEFAULTS.systemPrompt,
      allowedChartTypes: Array.isArray(global.allowedChartTypes) && global.allowedChartTypes.length > 0
        ? (global.allowedChartTypes as string[])
        : DEFAULTS.allowedChartTypes,
      allowedThemes: Array.isArray(global.allowedThemes) && global.allowedThemes.length > 0
        ? (global.allowedThemes as string[])
        : DEFAULTS.allowedThemes,
      allowedLayoutFamilies: Array.isArray(global.allowedLayoutFamilies) && global.allowedLayoutFamilies.length > 0
        ? (global.allowedLayoutFamilies as LayoutFamilyValue[])
        : DEFAULTS.allowedLayoutFamilies,
      allowedAntVTemplateCategories: Array.isArray(global.allowedAntVTemplateCategories) && global.allowedAntVTemplateCategories.length > 0
        ? (global.allowedAntVTemplateCategories as AntVTemplateCategoryValue[])
        : DEFAULTS.allowedAntVTemplateCategories,
      allowedAntVThemes: Array.isArray(global.allowedAntVThemes) && global.allowedAntVThemes.length > 0
        ? (global.allowedAntVThemes as ThemeNameValue[])
        : DEFAULTS.allowedAntVThemes,
      fewShotExamples: Array.isArray(global.fewShotExamples)
        ? (global.fewShotExamples as AIConfig['fewShotExamples'])
        : [],
    }

    cachedConfig = result
    cacheTimestamp = now
    return result
  } catch {
    // Payload not available (e.g., during build) — use defaults
    return DEFAULTS
  }
}
