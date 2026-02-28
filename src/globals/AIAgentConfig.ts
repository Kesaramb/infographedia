import type { GlobalConfig } from 'payload'

/**
 * AI Agent Configuration — admin-editable settings for the DNA generation pipeline.
 *
 * This is a Payload Global (singleton). Stored in the payload-kv table.
 * Accessible at /admin/globals/ai-agent-config in the admin panel.
 */
export const AIAgentConfig: GlobalConfig = {
  slug: 'ai-agent-config',
  label: 'AI Agent Configuration',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true, // Config read by the AI pipeline (server-side)
    update: ({ req }) => {
      if (!req.user) return false
      return (req.user as { role?: string }).role === 'admin'
    },
  },
  fields: [
    // ── Model Configuration ──────────────────────────────────────────
    {
      name: 'model',
      type: 'select',
      required: true,
      defaultValue: 'claude-sonnet-4-20250514',
      admin: {
        description: 'Which Claude model to use for DNA generation.',
      },
      options: [
        { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
        { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
        { label: 'Claude Haiku 3.5', value: 'claude-haiku-4-20250414' },
      ],
    },
    {
      name: 'temperature',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 0,
      max: 2,
      admin: {
        step: 0.1,
        description: 'Higher = more creative, lower = more deterministic. Default: 1',
      },
    },
    {
      name: 'maxTokens',
      type: 'number',
      required: true,
      defaultValue: 4096,
      min: 1024,
      max: 16384,
      admin: {
        description: 'Maximum tokens per AI response. Default: 4096',
      },
    },
    {
      name: 'maxToolRounds',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      max: 15,
      admin: {
        description: 'Max web search rounds before stopping. Prevents infinite loops. Default: 5',
      },
    },

    // ── Web Search ───────────────────────────────────────────────────
    {
      name: 'enableWebSearch',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enable Web Search',
      admin: {
        description: 'When enabled, the AI searches the web for real data before generating. Disable to use AI knowledge only.',
      },
    },

    // ── System Prompt ────────────────────────────────────────────────
    {
      name: 'systemPrompt',
      type: 'textarea',
      required: true,
      defaultValue: '', // Populated by code with DEFAULT_SYSTEM_PROMPT at runtime
      admin: {
        description: 'The full system prompt sent to the AI. Edit with care — this controls all generation behavior.',
        rows: 20,
      },
    },

    // ── DNA Constraints ──────────────────────────────────────────────
    {
      name: 'allowedChartTypes',
      type: 'select',
      hasMany: true,
      defaultValue: [
        'bar-chart',
        'pie-chart',
        'line-chart',
        'area-chart',
        'timeline',
        'stat-card',
        'grouped-bar-chart',
        'donut-chart',
      ],
      admin: {
        description: 'Which chart types the AI is allowed to generate.',
      },
      options: [
        { label: 'Bar Chart', value: 'bar-chart' },
        { label: 'Pie Chart', value: 'pie-chart' },
        { label: 'Line Chart', value: 'line-chart' },
        { label: 'Area Chart', value: 'area-chart' },
        { label: 'Timeline', value: 'timeline' },
        { label: 'Stat Card', value: 'stat-card' },
        { label: 'Grouped Bar Chart', value: 'grouped-bar-chart' },
        { label: 'Donut Chart', value: 'donut-chart' },
      ],
    },
    {
      name: 'allowedThemes',
      type: 'select',
      hasMany: true,
      defaultValue: [
        'glass-dark',
        'glass-light',
        'neon-cyberpunk',
        'minimalist',
        'editorial',
        'warm-earth',
        'ocean-depth',
      ],
      admin: {
        description: 'Which visual themes the AI is allowed to use.',
      },
      options: [
        { label: 'Glass Dark', value: 'glass-dark' },
        { label: 'Glass Light', value: 'glass-light' },
        { label: 'Neon Cyberpunk', value: 'neon-cyberpunk' },
        { label: 'Minimalist', value: 'minimalist' },
        { label: 'Editorial', value: 'editorial' },
        { label: 'Warm Earth', value: 'warm-earth' },
        { label: 'Ocean Depth', value: 'ocean-depth' },
      ],
    },

    // ── Few-Shot Examples ────────────────────────────────────────────
    {
      name: 'fewShotExamples',
      type: 'array',
      label: 'Few-Shot Examples',
      admin: {
        description: 'Example DNA JSON objects appended to the system prompt. Teaches the AI what good output looks like.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'A label for this example (e.g., "High-engagement bar chart")',
          },
        },
        {
          name: 'dnaJson',
          type: 'json',
          required: true,
          admin: {
            description: 'A complete, valid DNA JSON object.',
          },
        },
      ],
    },
  ],
}
