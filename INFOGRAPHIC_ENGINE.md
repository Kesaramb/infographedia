# Infographic Engine

> Single source of truth for the Infographedia creation pipeline. Covers data structures, AI generation, rendering engines, animation system, and export processes.

---

## 1. First Principles

Six design principles that shape every decision in the engine.

**1. Structured Data > Flat Images.** Infographics are stored as structured JSON ("DNA"), not flat images. This makes them searchable, themeable, animated, and exportable dynamically. The `renderedImage` (WebP) exists only as a feed performance cache.

**2. Content/Presentation Separation.** The data an infographic conveys (facts, numbers, sources) is strictly separated from how it looks (theme, chart type, colors). You can restyle without losing data. You can fork data without inheriting style.

**3. Trust via Grounding.** The AI pipeline uses web search to ground statistics in reality before generating the visual structure. Every DNA object must have at least one source. This is enforced at the schema level.

**4. Iterability as a Social Mechanic.** Because data is structured, users can fork and mutate existing infographics. This creates a social graph of iterative content linked via `parentPost` references.

**5. AI is a Tool, Not the Creator.** The AI generates candidate DNA. The user previews, edits the title, regenerates if needed, and explicitly publishes. The AI never publishes autonomously. The modal flow (preview + regenerate + publish) enforces human control.

**6. Color Belongs to Content.** The app shell is strictly monochrome dark (`bg-neutral-950`, `text-white`, `border-white/10`). All color comes from infographic DNA. This ensures every infographic visually pops against the feed.

---

## 2. The DNA Object

The DNA object is the core data structure of every infographic, validated by Zod at every boundary.

**Source:** `src/lib/dna/schema.ts`

### Enums

| Enum | Values |
|------|--------|
| `ChartType` | `bar-chart`, `pie-chart`, `line-chart`, `area-chart`, `timeline`, `stat-card`, `grouped-bar-chart`, `donut-chart` |
| `ThemeName` | `glass-dark`, `glass-light`, `neon-cyberpunk`, `minimalist`, `editorial`, `warm-earth`, `ocean-depth` |
| `LayoutType` | `centered`, `left-aligned`, `split`, `stacked` |

### Content Layer (What the data says)

| Field | Type | Constraints | Why |
|-------|------|-------------|-----|
| `title` | string | 1-120 chars, required | Every infographic needs a headline |
| `subtitle` | string | max 200 chars, optional | Supporting context below the title |
| `hook` | string | max 100 chars, optional | Scroll-stopping one-liner derived from the data |
| `data` | `DataPoint[]` | min 1 item, required | The actual data being visualized |
| `sources` | `Source[]` | min 1 item, required | Grounding principle: no unsourced data |
| `footnotes` | string | max 500 chars, optional | Caveats, methodology, fine print |

**DataPoint:** `{ label: string, value: number, unit?: string, metadata?: Record<string, string> }`
- `metadata.group` is used by `grouped-bar-chart` to define bar groupings (e.g., `{ group: "2020" }`)

**Source:** `{ name: string (min 1), url: string (valid URL), accessedAt: string (YYYY-MM-DD) }`

### Presentation Layer (How it looks)

| Field | Type | Constraints | Why |
|-------|------|-------------|-----|
| `theme` | `ThemeName` | required | Drives color palette guidance |
| `chartType` | `ChartType` | required | Determines which chart component renders |
| `layout` | `LayoutType` | required | Hint for text alignment |
| `colors` | `ColorsSchema` | required | Exact hex colors for rendering |
| `components` | `ComponentSlot[]` | min 1, required | Ordered render manifest |

**Colors:** `{ primary: #hex, secondary?: #hex, background: #hex, text: #hex, accent?: #hex }`
- All hex colors must match `/^#[0-9a-fA-F]{6}$/`
- `secondary` defaults to `primary` at render time if omitted
- `accent` defaults to `primary` at render time if omitted
- **Dual resolution:** CSS custom properties (`--dna-primary`, etc.) for text blocks; resolved `ResolvedColors` props for Recharts (Recharts cannot read CSS variables)

**ComponentSlot:** `{ type: string (min 1), dataKey?: string, labelKey?: string }`
- Array order = render order. First item renders at the top, last at the bottom.

### Full DNA Shape

```
InfographicDNA = {
  content: ContentSchema,
  presentation: PresentationSchema,
}
```

### Exported TypeScript Types

```
InfographicDNA, ContentData, PresentationData,
DataPoint, Source, Colors,
ChartTypeValue, ThemeNameValue, LayoutTypeValue
```

---

## 3. Creation Workflow

### Entry Points

| Trigger | Location | Mode | Data Passed |
|---------|----------|------|-------------|
| "Create" button | Sidebar, bottom nav, mobile header | `create` | None |
| "Iterate" button | Post card action toolbar, post detail | `iterate` | `{ id, title, dna, author }` of parent |

### Modal State Machine

```
idle  --(click Generate)-->  generating  --(AI success)-->  preview  --(click Publish)-->  publishing  --(API success)-->  done
 ^                                |                            |                              |
 |                                v                            v                              v
 +-------(reset)------------ error <-------(AI fail)------  error  <------(API fail)--------+
```

**Stages:**

| Stage | What the user sees | Key behavior |
|-------|-------------------|--------------|
| `idle` | Prompt textarea, parent preview (if iterating) | Auth gate: unauthenticated users see "Sign in to create" instead |
| `generating` | Loading spinner with elapsed time counter (updates every 100ms) | `POST /api/generate` is in flight |
| `preview` | Rendered infographic, search queries used, DNA badges (chart type, theme, data points), editable title | User can **Regenerate** (back to idle) or **Publish** |
| `publishing` | Spinner overlay, modal disabled | `POST /api/publish` is in flight |
| `done` | Success checkmark | Auto-closes after 1500ms, calls `router.refresh()` to update feed |
| `error` | Red error box with message | Returns to idle, user can retry |

**Key UI elements in preview:**
- Search transparency: list of web search queries the AI performed
- DNA badges: chart type pill, theme pill, data point count
- Editable title input: user can modify before publishing
- Description auto-filled from `dna.content.subtitle`

**Files:** `src/components/modals/iterate-modal.tsx`, `src/components/modals/modal-provider.tsx`

---

## 4. AI Generation Pipeline

**Source:** `src/lib/ai/generate.ts`

### Request Flow

```
POST /api/generate { prompt, parentDNA? }
  |
  v
Input validation (prompt non-empty, max 1000 chars, parentDNA valid if present)
  |
  v
generateDNA(prompt, parentDNA?)
  |
  +-- getAIConfig()           -- Fetch admin config (30s cache)
  +-- getAnthropicClient()    -- Singleton Anthropic client
  +-- buildSystemPrompt()     -- Assemble system prompt + constraints + few-shots
  +-- buildNewPrompt() OR buildIterationPrompt()
  |
  v
Claude API call (model, maxTokens, temperature, system, tools, messages)
  |
  v
Tool calling loop (while stop_reason === 'tool_use', max N rounds):
  |
  +-- Extract tool_use blocks
  +-- Execute web_search(query) for each
  |     Priority: Brave Search API --> SerpAPI --> AI Knowledge Base fallback
  |     Returns: 5 results formatted as title/URL/snippet
  +-- Append tool results to conversation
  +-- Call Claude API again with results
  |
  v
Extract text blocks from final response
  |
  v
parseAIResponse(responseText)
  |
  +-- Extract JSON (3 formats: code fence, raw JSON, embedded in prose)
  +-- JSON.parse()
  +-- DNASchema.safeParse()
  |
  +-- IF VALID: return { success: true, dna, searchQueries }
  |
  +-- IF INVALID: One retry attempt
       +-- Build correction prompt with Zod error details
       +-- Call Claude API again (no tools)
       +-- Re-parse
       +-- IF VALID: return success
       +-- IF STILL INVALID: return { success: false, error, stage: 'validation' }
```

### Error Stages

| Stage | Meaning |
|-------|---------|
| `api` | Claude API call failed (network, auth, rate limit) |
| `parse` | Response couldn't be parsed as JSON |
| `validation` | JSON parsed but failed Zod schema validation |
| `tool_limit` | Exceeded `maxToolRounds` without producing output |

### Config Caching

`getAIConfig()` uses a module-level singleton with 30-second TTL. Admin changes to the AI Agent Config take effect within 30 seconds without restart.

**Files:** `src/lib/ai/generate.ts`, `parse.ts`, `search.ts`, `config.ts`, `client.ts`, `tools.ts`

---

## 5. Prompt Engineering

The system prompt is the brain of the engine. It is admin-editable via the Payload admin panel, with a 3,700-word default covering all generation rules.

**Source:** `src/lib/ai/prompts.ts` (full prompt text)

### Prompt Assembly

`buildSystemPrompt(aiConfig)` composes the final prompt:

1. **Base prompt**: Admin-configured text OR `DEFAULT_SYSTEM_PROMPT`
2. **Chart type constraints**: Appended only if admin restricts below all 8 types
3. **Theme constraints**: Appended only if admin restricts below all 7 themes
4. **Few-shot examples**: Appended with labels if configured

Constraints are **appended**, not replaced. The base prompt always runs.

### Core Rules (Summarized)

**Title Optimization:**
- Must contain a specific number ("7 Countries", "$4.88M"), a power word (Shocking, Hidden, Devastating), or a contrarian framing
- Specificity over vagueness: "Top 5 Countries by GDP in 2026" beats "Countries by GDP"

**Hook Generation:**
- Generated when data contains a surprising or counterintuitive finding
- Max 100 chars, factual, grounded in the data
- Examples: "India just overtook China." / "83% of devs use AI tools daily."

**Chart Type Selection Matrix:**

| Data Shape | Recommended Chart |
|-----------|-------------------|
| Comparisons (A vs B vs C) | `bar-chart` or `grouped-bar-chart` |
| Parts of a whole (percentages) | `pie-chart` or `donut-chart` |
| Trends over time | `line-chart` or `area-chart` |
| Single dramatic number | `stat-card` |
| Chronological events | `timeline` |
| Default / unsure | `bar-chart` (highest engagement) or `stat-card` (most shareable) |

**Data Formatting:**
- Limit to 5-8 data points (too many = visual clutter)
- Sort by value descending (largest first) unless chronological
- Round numbers when precision doesn't matter (41.7% -> 42%)
- Always include units for context

**Special Chart Notes:**
- `stat-card`: Exactly 1 data point, value is the main stat, unit for display
- `timeline`: `label` = event name, `value` = year, rendered chronologically
- `grouped-bar-chart`: Each point needs `metadata.group`, labels include group name

**Theme Color Guidelines:**
- Each theme has a specific background range, text color, and primary color family
- `glass-dark`: dark bg, light text, vibrant primary
- `neon-cyberpunk`: very dark bg, neon primary (#00ff88, #ff00ff, #00ffff)
- `minimalist`: white bg, near-black text, muted primary
- `editorial`: warm bg, dark text, deep primary (#8b2500)

### User Prompts

**New creation** (`buildNewPrompt`): Instructs AI to search first, pick best chart, write engaging title, add hook if surprising, output DNA JSON.

**Iteration** (`buildIterationPrompt`): Passes full parent DNA + user request. Instructs AI to mutate only what's requested, keep everything else. Style-only changes skip web search.

### Iteration Mutation Rules

- Change only what the user asked for
- Keep all parent data for style-only requests
- Search for new data only when the topic changes
- Never rebuild from scratch unless the topic changes entirely

---

## 6. Validation Pipeline

Validation runs at three boundaries:

| Boundary | What's Validated | How |
|----------|-----------------|-----|
| API input (`/api/generate`) | Prompt length (1-1000 chars), parentDNA shape | Manual checks + `DNASchema.safeParse()` |
| AI output (generate.ts) | Generated DNA | `DNASchema.safeParse()` with one retry on failure |
| Publish input (`/api/publish`) | DNA payload from client | `DNASchema.safeParse()` (re-validation prevents client tampering) |

### Correction Retry

When the AI's output fails Zod validation:
1. Build a correction prompt containing the exact Zod error issues (field paths + messages)
2. Append the AI's raw output + correction prompt to the conversation
3. Call Claude API again (without tools — just fix the JSON)
4. Re-parse the corrected output
5. If still invalid: return structured error to the user

**Response format:** `{ success: boolean, error?: string, stage?: string }`

**Files:** `src/lib/ai/parse.ts`, `src/app/api/generate/route.ts`, `src/app/api/publish/route.ts`

---

## 7. Rendering Engine

Two rendering paths from the same DNA object.

### 7a. Static Path (DNARenderer)

**Source:** `src/components/dna-renderer/index.tsx`

```
DNA --> DNARenderer --> COMPONENT_MAP lookup --> React component tree
```

**Process:**
1. Resolve colors: `secondary` defaults to `primary`, `accent` defaults to `primary`
2. Set CSS custom properties on container: `--dna-primary`, `--dna-secondary`, `--dna-bg`, `--dna-text`, `--dna-accent`
3. Set `backgroundColor` inline from `colors.background`
4. Iterate over `presentation.components[]`, look up each `type` in `COMPONENT_MAP`
5. Mount matching component with `{ dna, slot, colors }` props
6. Unknown types: silently return `null` (graceful degradation)

**Why dual color system:** Text blocks read colors via CSS custom properties (`var(--dna-primary)`). Recharts charts receive colors as resolved props (Recharts renders SVG and cannot read CSS variables).

**Used for:** PNG export, iterate modal preview, SSR fallback, post-animation static display.

### 7b. Animated Path (AnimatedDNARenderer + Remotion)

**Source:** `src/components/remotion/animated-dna-renderer.tsx`

```
DNA --> AnimatedDNARenderer --> IntersectionObserver --> Remotion Player --> InfographicComposition
                                                                                    |
                                                                          ANIMATED_CHART_MAP lookup
                                                                                    |
                                                                         Animated SVG components
```

**Constants** (`src/components/remotion/constants.ts`):

| Constant | Value | Purpose |
|----------|-------|---------|
| `FPS` | 30 | Frames per second |
| `DURATION_FRAMES` | 240 | Total frames (8 seconds) |
| `WIDTH` | 600 | Composition width in pixels |
| `HEIGHT` | 800 | Composition height in pixels |

**Lifecycle:**

1. **Before viewport entry:** Static `DNARenderer` shown (no Remotion overhead)
2. **30% visible:** `IntersectionObserver` fires, Remotion `<Player>` mounts with `autoPlay`
3. **Frames 0-240:** Animation plays (8 seconds at 30fps)
4. **After 8.5s:** Timer fires, `<Player>` unmounts, static `DNARenderer` takes over
5. **Replay:** User clicks replay button -> `seekTo(0)`, `play()`, timer restarts

**Spring physics config:** `damping: 14, stiffness: 60` (smooth bounce, used by bars, timeline dots)

### Animation Timeline

| Component | Frame Range | Animation | Stagger |
|-----------|------------|-----------|---------|
| Title | 0-30 | Fade in + slide down (y: 20px -> 0) | - |
| Subtitle | 20-50 | Fade in at 70% opacity | - |
| Hook | 40-70 | Fade in + scale (0.9 -> 1.0) | - |
| Bar chart bars | 60+ | Spring growth from bottom | +8 frames per bar |
| Pie/donut slices | 60+ | Arc sweep from 0 to final angle | +12 frames per slice |
| Line chart path | 60-140 | SVG stroke-dashoffset draw | - |
| Area chart reveal | 60-140 | Left-to-right clip-path reveal | - |
| Stat card number | 60-140 | Count up from 0 to final value | - |
| Timeline items | 60+ | Spring dot scale + text fade | +12 frames per item |
| Grouped bar bars | 60+ | Spring growth from bottom | +8 frames per bar |
| Bar value labels | 90+ | Fade in after bars settle | staggered |
| Footnote | 160-190 | Fade in at 50% opacity | - |
| Source badges | 180-210 | Fade in at 40% opacity | - |

**Files:** `src/components/remotion/` (all), `src/components/remotion/compositions/` (8 chart files), `src/components/remotion/blocks/` (5 text blocks)

---

## 8. Component Registry

### Static Components (COMPONENT_MAP)

**Source:** `src/components/dna-renderer/component-map.ts`

| Type String | Component | Category | Reads From | Renders | Optional |
|-------------|-----------|----------|------------|---------|----------|
| `title` | TitleBlock | Text | `content.title` | Heading (2-3xl, bold, tracking-tight) | No |
| `subtitle` | SubtitleBlock | Text | `content.subtitle` | Subtitle (sm-base, 70% opacity) | Yes |
| `hook` | HookBlock | Text | `content.hook` | Bold italic call-out (lg-xl, accent color) | Yes |
| `footnote` | FootnoteBlock | Text | `content.footnotes` | Fine print (xs, 50% opacity, italic) | Yes |
| `source-badge` | SourceBadge | Text | `content.sources[]` | Clickable link pills (60% opacity) | Yes |
| `bar-chart` | BarChartBlock | Chart | `data[]` (label, value) | Recharts BarChart, h=280px, rounded tops | No* |
| `pie-chart` | PieChartBlock | Chart | `data[]` (label, value) | Recharts PieChart, h=300px, % labels | No* |
| `donut-chart` | DonutChartBlock | Chart | `data[]` (label, value) | PieChart inner=55 outer=100, padding=2deg | No* |
| `line-chart` | LineChartBlock | Chart | `data[]` ordered | Recharts LineChart, h=280px, monotone | No* |
| `area-chart` | AreaChartBlock | Chart | `data[]` ordered | Recharts AreaChart, h=280px, gradient fill | No* |
| `stat-card` | StatCardBlock | Chart | `data[0]` only | Big number (6-7xl), unit, label | No* |
| `timeline` | TimelineBlock | Chart | `data[]` (label=event, value=year) | Vertical line with dots + event text | No* |
| `grouped-bar-chart` | GroupedBarChartBlock | Chart | `data[]` with `metadata.group` | Grouped Recharts BarChart, h=300px | No* |

*\*Charts are required when their `chartType` is selected — exactly one chart type appears per infographic.*

### Animated Components (ANIMATED_CHART_MAP)

**Source:** `src/components/remotion/component-map.ts`

Each chart type has an animated counterpart using raw SVG + Remotion's `useCurrentFrame()` + `interpolate()`:

| Type String | Animated Component | Animation Style |
|-------------|-------------------|-----------------|
| `bar-chart` | AnimatedBarChart | Spring growth from bottom, staggered |
| `pie-chart` | AnimatedPieChart | Arc sweep, staggered slices |
| `donut-chart` | AnimatedDonutChart | Arc sweep with inner radius |
| `line-chart` | AnimatedLineChart | SVG stroke-dashoffset path draw |
| `area-chart` | AnimatedAreaChart | Left-to-right clip-path reveal |
| `stat-card` | AnimatedStatCard | Count up 0 -> value, fade + scale |
| `timeline` | AnimatedTimeline | Spring dot + text, staggered items |
| `grouped-bar-chart` | AnimatedGroupedBar | Spring growth, staggered bars |

Plus 5 animated text blocks: AnimatedTitle, AnimatedSubtitle, AnimatedHook, AnimatedFootnote, AnimatedSourceBadge.

**Total: 13 static + 13 animated = 26 components.**

---

## 9. Publishing and Iteration

### Publishing

**Source:** `src/app/api/publish/route.ts`

1. **Auth check:** Session cookie required. Returns 401 if unauthenticated.
2. **Re-validation:** `DNASchema.safeParse()` on the incoming payload (prevents client-side tampering).
3. **Post creation:** `payload.create({ collection: 'posts', data: { ... } })`
   - `author`: Set to authenticated `user.id` (cannot be spoofed)
   - `dna`: The validated DNA object
   - `description`: Auto-filled from `dna.content.subtitle`
   - `parentPost`: Set if iterating (self-referential relationship)
   - `metrics`: Initialized to `{ likes: 0, saves: 0, shares: 0, comments: 0, iterationCount: 0 }`
4. **Parent update** (if iterating): Increment `iterationCount` on parent post. Non-fatal — wrapped in `try/catch` so a failure here doesn't block the new post.
5. **Response:** `{ success: true, post }` — modal auto-closes after 1500ms, feed refreshes.

### Iteration Engine

**Architecture:** Linked list lineage via `parentPost`. NOT a tree — no tree navigation, no diff viewers, no branch merging. One-to-many relationship (multiple posts can iterate from the same parent), but the UI treats it as simple attribution.

**Mutation rules:**
- Style-only changes (colors, theme, chart type): Reuse parent `content.data`, skip web search
- Data changes (new topic, different stats): AI searches for new data, keeps parent structure as starting point
- The AI receives the full parent DNA as context, mutates fields, does not rebuild from scratch

---

## 10. Export Pipeline (PNG Download)

**Source:** `src/hooks/use-download-infographic.ts`

### Flow

1. **Viewport repositioning:** The offscreen static renderer (`absolute -left-[9999px]`) is temporarily moved to `position: fixed; left: 0; top: 0` so Recharts' `ResponsiveContainer` can measure dimensions properly.
2. **Wait:** Two animation frames + 200ms buffer for Recharts re-render.
3. **Double capture:** `toPng()` called twice — first call warms the html-to-image resource cache (known blank-image fix), second call produces the actual capture.
4. **Restore:** Original CSS classes and inline styles restored on the element.
5. **Canvas compositing:** Captured image loaded onto a canvas. A 40px (80px at 2x retina) branded footer strip is drawn below with:
   - Brand dot (4px radius, 60% white)
   - Text: `INFOGRAPHEDIA  ·  infographedia.com/post/{id}`
6. **Download:** Canvas exported as PNG, filename sanitized from title.

**Capture options:** `pixelRatio: 2` (retina), `cacheBust: true`, `skipFonts: false`.

**Error handling:** On capture failure, offscreen positioning is restored and a toast error is shown.

---

## 11. Admin Configuration

**Source:** `src/globals/AIAgentConfig.ts`

The AI Agent is configured globally via the Payload CMS admin panel at `/admin/globals/ai-agent-config`.

### Fields

| Field | Type | Default | Range | Purpose |
|-------|------|---------|-------|---------|
| `model` | select | `claude-sonnet-4-20250514` | Opus 4 / Sonnet 4 / Haiku 3.5 | Claude model for generation |
| `temperature` | number | 1 | 0-2 (step 0.1) | Creativity vs determinism |
| `maxTokens` | number | 4096 | 1024-16384 | Max output tokens per API call |
| `maxToolRounds` | number | 5 | 1-15 | Max web search loops before aborting |
| `enableWebSearch` | checkbox | true | - | If false, `tools: []` passed to Claude |
| `systemPrompt` | textarea | `DEFAULT_SYSTEM_PROMPT` | - | Full system prompt (admin-editable) |
| `allowedChartTypes` | multi-select | All 8 | 8 chart types | Restrict which charts AI can use |
| `allowedThemes` | multi-select | All 7 | 7 themes | Restrict which themes AI can use |
| `fewShotExamples` | array | `[]` | `{ label, dnaJson }` | Example DNA objects appended to prompt |

### Access Control

- **Read:** All (server-side access for generation pipeline)
- **Update:** Admin role only

### Runtime Caching

`getAIConfig()` in `src/lib/ai/config.ts`:
- Module-level singleton: `cachedConfig` + `cacheTimestamp`
- 30-second TTL (`CACHE_TTL = 30_000`)
- Falls back to `DEFAULTS` if Payload is unavailable (e.g., during build)
- Admin changes take effect within 30 seconds without restart

---

## 12. Feature Registry

Step-by-step checklists for extending the engine.

### Adding a New Chart Type

1. Add the string to `ChartType` enum in `src/lib/dna/schema.ts`
2. Add it to `allowedChartTypes` options in `src/globals/AIAgentConfig.ts`
3. Create the static React component in `src/components/charts/` (implement `DNAComponentProps`)
4. Register in `COMPONENT_MAP` in `src/components/dna-renderer/component-map.ts`
5. Create the animated Remotion composition in `src/components/remotion/compositions/`
6. Register in `ANIMATED_CHART_MAP` in `src/components/remotion/component-map.ts`
7. Add chart-specific notes to the system prompt in `src/lib/ai/prompts.ts`
8. Add to the chart selection matrix in the prompt's ENGAGEMENT RULES

### Adding a New Theme

1. Add the string to `ThemeName` enum in `src/lib/dna/schema.ts`
2. Add it to `allowedThemes` options in `src/globals/AIAgentConfig.ts`
3. Add color guidelines to `THEME COLOR GUIDELINES` in `src/lib/ai/prompts.ts`

### Adding a New Text Block

1. Create the static component in `src/components/dna-renderer/blocks/`
2. Register in `COMPONENT_MAP` in `src/components/dna-renderer/component-map.ts`
3. Create the animated block in `src/components/remotion/blocks/`
4. Add to `InfographicComposition` render order in `src/components/remotion/infographic-composition.tsx`
5. (Optional) Add a corresponding field to `ContentSchema` in `src/lib/dna/schema.ts`

### Adding a New Data Field to DNA

1. Add the field to the appropriate schema in `src/lib/dna/schema.ts`
2. Generate a Payload migration: `npx payload migrate:create`
3. Update the system prompt schema documentation in `src/lib/ai/prompts.ts`
4. Update any components that should read the new field

### Adding a New Export Format

1. Modify or create a new hook alongside `src/hooks/use-download-infographic.ts`
2. Adjust the canvas compositing logic for the new format (SVG, PDF, etc.)
3. Add a UI trigger (button, dropdown option) in the action toolbar

### Modifying AI Behavior

**Without code changes:** Use the Payload admin panel at `/admin/globals/ai-agent-config`. Change model, temperature, allowed types/themes, system prompt, or add few-shot examples. Changes take effect within 30 seconds.

**With code changes:** Edit `src/lib/ai/prompts.ts` to modify `DEFAULT_SYSTEM_PROMPT`, `buildNewPrompt()`, or `buildIterationPrompt()`.

---

## 13. File Reference Map

```
src/lib/ai/
  generate.ts        Core generation loop (tool calling, retry)
  prompts.ts         System prompt + prompt builders (3,700 word default)
  config.ts          AIAgentConfig fetcher with 30s cache + defaults
  client.ts          Anthropic client singleton
  tools.ts           Web search tool definition (JSON schema)
  search.ts          Brave Search / SerpAPI execution + formatting
  parse.ts           JSON extraction (3 formats) + Zod validation

src/lib/dna/
  schema.ts          Zod schema + TypeScript types (single source of truth)
  seed-data.ts       8 sample infographics covering all chart types

src/components/dna-renderer/
  index.tsx           Static renderer (DNA -> React component tree)
  component-map.ts    COMPONENT_MAP: type string -> React component (13 entries)
  types.ts            DNAComponentProps, ResolvedColors interfaces
  blocks/             5 text block components (title, subtitle, hook, footnote, source-badge)

src/components/charts/
  bar-chart.tsx       Recharts BarChart (280px)
  pie-chart.tsx       Recharts PieChart (300px)
  donut-chart.tsx     Recharts PieChart with inner radius (300px)
  line-chart.tsx      Recharts LineChart (280px)
  area-chart.tsx      Recharts AreaChart (280px)
  stat-card.tsx       Big number display (6-7xl)
  timeline.tsx        Custom SVG vertical timeline
  grouped-bar-chart.tsx  Grouped Recharts BarChart (300px)

src/components/remotion/
  animated-dna-renderer.tsx    Client wrapper: IntersectionObserver + Player + swap
  infographic-composition.tsx  Root Remotion composition (orchestrates all blocks)
  component-map.ts             ANIMATED_CHART_MAP: type string -> Remotion component (8 entries)
  constants.ts                 FPS=30, DURATION_FRAMES=240, WIDTH=600, HEIGHT=800
  blocks/                      5 animated text blocks
  compositions/                8 animated chart compositions (raw SVG)

src/app/api/
  generate/route.ts   POST /api/generate (input validation -> generateDNA)
  publish/route.ts    POST /api/publish (auth -> re-validate -> create post -> update parent)

src/components/modals/
  iterate-modal.tsx    Create/iterate modal (6-stage state machine)
  modal-provider.tsx   React context for modal state management

src/hooks/
  use-generate.ts              Generation state hook (stage, dna, error, searchQueries)
  use-download-infographic.ts  PNG export hook (reposition, capture, composite, download)

src/globals/
  AIAgentConfig.ts    Payload Global definition (9 admin-editable fields)

src/collections/
  Posts.ts            Payload CMS collection (author, title, dna, parentPost, metrics, tags)
```
