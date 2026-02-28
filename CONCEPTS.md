# Infographedia - First Principles & System Architecture

> The conceptual foundation of Infographedia. Read this before touching any code. Every architectural decision in the codebase traces back to one of these principles.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [First Principles](#first-principles)
3. [The DNA Pattern](#the-dna-pattern-core-innovation)
4. [System Architecture](#system-architecture)
5. [The AI Pipeline](#the-ai-pipeline)
6. [The Rendering Engine](#the-rendering-engine)
7. [The Iteration Engine](#the-iteration-engine)
8. [Data Model](#data-model)
9. [Authentication & Authorization](#authentication--authorization)
10. [UI Architecture](#ui-architecture)
11. [Design Tradeoffs](#design-tradeoffs)

---

## The Problem

Traditional infographics are **dead artifacts**. A designer creates a flat PNG/SVG, publishes it, and its data is permanently frozen. The viewer cannot:

- **Inspect** the underlying data to verify claims
- **Update** the data when it becomes stale
- **Restyle** the visualization to suit a different audience
- **Fork** the work to explore a different angle
- **Trace** where the data originally came from

Meanwhile, AI can now generate visual data presentations — but without grounding in real sources, AI-generated infographics are just **beautiful hallucinations**.

**Infographedia solves both problems simultaneously.**

---

## First Principles

These are non-negotiable. Every feature, every architectural choice, every line of code should be traceable to one or more of these principles.

### 1. Data is Never Flat

An infographic is not an image. It is a **structured data object** with two distinct layers: what the data *says* (content) and how it *looks* (presentation). These layers are always stored separately and can be independently modified.

**Implication**: We store DNA as `jsonb` in PostgreSQL, never as a flat image. The `renderedImage` field is a performance cache, not the source of truth. If the rendered image is deleted, the infographic can always be re-rendered from its DNA.

### 2. Trust is Built at Creation Time

We do not rely on community voting, fact-checking teams, or post-hoc moderation to verify data. Instead, we solve trust at the moment of creation:

- The AI **must search the web** before generating data-driven content
- Every infographic **must cite at least one source** with a name, URL, and access date
- Sources are rendered as clickable badges directly on the infographic
- The viewer can click through to the original source and verify for themselves

**Implication**: The `content.sources[]` array is required (minimum 1 entry). The AI pipeline enforces web search before generation. The SourceBadge component renders `<a>` tags linking to original sources.

### 3. Everything is Forkable

Any infographic can be "iterated on" by anyone. Iteration means taking the parent's DNA, mutating it based on a new prompt, and publishing the result as a new post. The original creator gets attribution, and the lineage is tracked.

**Implication**: The `parentPost` field creates a linked list of iterations. The AI receives the full parent DNA as context and *mutates* rather than *recreates*. The iterate modal shows the parent alongside the new version.

### 4. Color Belongs to Content, Not the Shell

The application shell is strictly monochrome dark. All visual richness comes from the infographic content itself. This creates a "gallery effect" where the data visualizations are the focal point, not the UI chrome.

**Implication**: The app uses a fixed glassmorphism palette (`bg-neutral-950`, `border-white/10`, `backdrop-blur-2xl`). CSS custom properties (`--dna-primary`, `--dna-bg`, etc.) are set per infographic. Charts and text inside the DNA renderer use these dynamic colors.

### 5. The AI is a Tool, Not a Creator

The AI generates the structured DNA, but it doesn't own the output. Users can modify, fork, and restyle any AI-generated infographic. The AI is a means to an end — the end is structured, inspectable, forkable data.

**Implication**: The AI outputs JSON conforming to a strict Zod schema, not free-form text or images. The output is validated before storage. If validation fails, the system retries with a correction prompt. The AI is never allowed to hallucinate data — it must search first.

### 6. Simplicity Over Sophistication

We deliberately avoid complexity that doesn't serve the core experience:

- No Git-style diff tracking — a simple `parentPost` reference is sufficient
- No complex moderation infrastructure — trust is solved at creation time
- No real-time collaboration — iteration is asynchronous (fork, mutate, publish)
- No custom rendering engines — Recharts handles charts, CSS handles theming

**Implication**: The data model is intentionally simple (3 collections: Users, Posts, Media). The iteration model is a linked list, not a tree or DAG. The rendering pipeline is a pure function from DNA to React components.

---

## The DNA Pattern (Core Innovation)

The DNA pattern is the architectural heart of Infographedia. Every infographic is a single JSON object with two layers:

```
                        InfographicDNA
                    ┌──────────┴──────────┐
                 content              presentation
              (WHAT it says)        (HOW it looks)
                    │                     │
         ┌────────┼─────────┐    ┌──────┼───────┐
       title    data[]   sources  theme  colors  components[]
      subtitle  (facts)  (proof) chartType layout (render order)
      footnotes
```

### Content Layer

The content layer holds **factual data** that is independent of visual styling:

| Field | Purpose | Constraint |
|-------|---------|------------|
| `title` | Main headline | 1-120 chars, required |
| `subtitle` | Supporting context | Max 200 chars, optional |
| `data[]` | Array of data points | Min 1 item, each has `label` + `value` |
| `sources[]` | Where the data came from | Min 1 source, each has `name` + `url` + `accessedAt` |
| `footnotes` | Caveats or additional context | Max 500 chars, optional |

Each data point is a `{ label: string, value: number }` pair with optional `unit` and `metadata`. This universal structure works across all chart types:

- **Bar chart**: label = category name, value = bar height
- **Pie/donut**: label = slice name, value = slice size
- **Line/area**: label = x-axis point (often a year), value = y-axis value
- **Timeline**: label = event name, value = year
- **Stat card**: single data point, value = the statistic, unit = display unit
- **Grouped bar**: label includes group info, metadata.group defines the series

### Presentation Layer

The presentation layer controls **how the data looks**, completely independent of content:

| Field | Purpose | Options |
|-------|---------|---------|
| `theme` | Visual identity preset | `glass-dark`, `glass-light`, `neon-cyberpunk`, `minimalist`, `editorial`, `warm-earth`, `ocean-depth` |
| `chartType` | Which visualization | `bar-chart`, `pie-chart`, `line-chart`, `area-chart`, `donut-chart`, `grouped-bar-chart`, `stat-card`, `timeline` |
| `layout` | Spatial arrangement | `centered`, `left-aligned`, `split`, `stacked` |
| `colors` | Color palette | `primary`, `secondary`, `background`, `text`, `accent` (all hex6) |
| `components[]` | Rendering order | Array of `{ type: string }` defining which blocks to render and in what order |

### Why Two Layers?

Separating content from presentation enables:

1. **Style-only iterations**: Change colors/theme without re-fetching data
2. **Data-only iterations**: Update numbers without changing the visual design
3. **Cross-style rendering**: Same data rendered as a bar chart, then as a pie chart
4. **Schema validation**: Content and presentation can be validated independently
5. **AI efficiency**: Style-only prompts skip web search entirely

### The Components Array

The `components[]` array in the presentation layer is a **render manifest**. It defines *which* blocks to render and *in what order*:

```json
"components": [
  { "type": "title" },
  { "type": "subtitle" },
  { "type": "bar-chart" },
  { "type": "footnote" },
  { "type": "source-badge" }
]
```

The DNARenderer iterates over this array and looks up each `type` in the `COMPONENT_MAP` registry. Unknown types are silently skipped (forward compatibility). This means the AI can control the visual structure simply by reordering or adding/removing component entries.

---

## System Architecture

Infographedia is a **monolith** — not microservices, not a separate frontend/backend. Everything runs inside a single Next.js process.

```
                    ┌──────────────────────────────────┐
                    │         Next.js 15 (App Router)    │
                    │                                    │
  Browser ────────► │  /(app)  - Feed, Profile, Search   │
                    │  /(auth) - Login, Register          │
                    │  /api    - Generate, Publish         │
                    │  /(payload) - Admin Panel            │
                    │                                    │
                    │  ┌─────────────────────────────┐   │
                    │  │     Payload CMS v3           │   │
                    │  │  (Auth, Collections, REST API)│   │
                    │  └──────────┬──────────────────┘   │
                    │             │                       │
                    │  ┌──────────▼──────────────────┐   │
                    │  │      PostgreSQL (jsonb)      │   │
                    │  │  Users, Posts (DNA), Media   │   │
                    │  └─────────────────────────────┘   │
                    └──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │      Claude API (Anthropic)      │
                    │  Tool Calling + Web Search        │
                    └──────────────────────────────────┘
```

### Why a Monolith?

- **Payload CMS v3 runs inside Next.js** — no separate backend to deploy
- **Single deployment** — one PM2 process, one port, one NGINX proxy
- **Shared types** — TypeScript types flow from Payload schemas to React components
- **Simplified auth** — Payload's built-in JWT/session auth works with Next.js middleware

### Request Flow

**Viewing an infographic (read path)**:
```
Browser → GET /api/posts → Payload REST API → PostgreSQL → JSON response
                                                               │
Browser renders PostCard → DNARenderer reads DNA JSON → Recharts renders chart
```

**Creating an infographic (write path)**:
```
Browser → POST /api/generate → Claude API → web_search tool → Claude generates DNA
                                                                        │
Browser shows preview ← DNA JSON ← Zod validation ← JSON parse ────────┘
                │
User clicks Publish → POST /api/publish → Payload creates post → PostgreSQL
```

**Iterating on an infographic (fork path)**:
```
Browser → Open iterate modal (parent DNA displayed)
  │
  └── User enters mutation prompt
        │
        └── POST /api/generate (with parentDNA in body)
              │
              └── Claude receives parent DNA + user prompt
                    │
                    └── Claude mutates DNA (not rebuilds)
                          │
                          └── POST /api/publish (with parentPostId)
                                │
                                └── New post created, parent.iterationCount++
```

---

## The AI Pipeline

The AI pipeline is the system that converts a user's natural language prompt into a valid DNA JSON object. It has three responsibilities:

1. **Ground** — Find real data via web search
2. **Generate** — Produce structured DNA JSON
3. **Validate** — Ensure the output conforms to the Zod schema

### Pipeline Architecture

```
User Prompt
     │
     ▼
┌─────────────┐     Is it an        ┌─────────────────┐
│ Build Prompt │────iteration?──Yes──►│ Include Parent   │
│              │                     │ DNA as Context    │
└──────┬──────┘                     └────────┬─────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────────────────────────────────────┐
│              Claude API Call                       │
│  Model: claude-sonnet-4-20250514                 │
│  System: SYSTEM_PROMPT (schema + rules)           │
│  Tools: [web_search]                              │
│  Max tokens: 4096                                 │
└──────────────────┬───────────────────────────────┘
                   │
          stop_reason = "tool_use"?
           │                │
          Yes              No (stop_reason = "end_turn")
           │                │
           ▼                ▼
  ┌────────────────┐  ┌─────────────────┐
  │ Execute Search  │  │ Extract Text    │
  │ (Brave/SerpAPI) │  │ from Response   │
  └───────┬────────┘  └────────┬────────┘
          │                     │
          ▼                     ▼
  Return results to       ┌─────────────┐
  Claude, loop back       │ Parse JSON   │
  (max 5 rounds)          │ from Text    │
                          └──────┬──────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │ Zod Validate │
                          │ DNASchema    │
                          └──────┬──────┘
                            │         │
                          Pass      Fail
                            │         │
                            ▼         ▼
                       Return DNA   Retry once with
                                   correction prompt
```

### Key Design Decisions

**Why tool calling instead of embedding search results in the prompt?**
Tool calling lets Claude decide *what* to search for and *how many times* to search. A prompt about "renewable energy vs fossil fuels" might need two searches. A style-only prompt needs zero. The AI decides.

**Why retry on validation failure?**
Claude occasionally outputs valid-looking JSON that fails Zod validation (e.g., a missing required field, a 3-digit hex color). Rather than failing immediately, we send the validation error back to Claude with the original response and ask it to fix the specific issue. This succeeds ~90% of the time.

**Why max 5 tool rounds?**
Prevents infinite loops where the AI keeps searching without generating output. In practice, 1-2 search rounds cover 95% of prompts.

**Why format search results as text, not structured data?**
Claude is better at extracting relevant data from natural language snippets than from structured JSON search results. The text format also includes source URLs that Claude can cite directly in `content.sources[]`.

---

## The Rendering Engine

The rendering engine is a **pure function**: DNA in, React components out. No side effects, no API calls, no state management.

```
         InfographicDNA
              │
              ▼
    ┌─────────────────────┐
    │    DNARenderer       │
    │                      │
    │  1. Extract colors   │ ──► CSS custom properties
    │  2. Set background   │     (--dna-primary, --dna-bg, etc.)
    │  3. Map components[] │
    │     to React nodes   │
    └──────────┬──────────┘
               │
        For each component in
        presentation.components[]:
               │
               ▼
    ┌─────────────────────┐
    │    COMPONENT_MAP     │
    │                      │
    │  "title"     → TitleBlock
    │  "subtitle"  → SubtitleBlock
    │  "bar-chart" → BarChartBlock
    │  "pie-chart" → PieChartBlock
    │  "line-chart"→ LineChartBlock
    │  "area-chart"→ AreaChartBlock
    │  "donut-chart"→ DonutChartBlock
    │  "grouped-bar-chart" → GroupedBarChartBlock
    │  "stat-card" → StatCardBlock
    │  "timeline"  → TimelineBlock
    │  "footnote"  → FootnoteBlock
    │  "source-badge" → SourceBadge
    │  (unknown)   → null (skipped)
    └─────────────────────┘
```

### Color Resolution

Colors flow through two channels because Recharts and CSS work differently:

1. **CSS Custom Properties** — For text blocks, badges, borders, backgrounds. Set as `style` properties on the container div. Child elements reference them via `var(--dna-primary)`.

2. **Props** — For Recharts components, which can't read CSS variables. Colors are passed as a `ResolvedColors` object directly to chart components as props.

### Component Interface

Every renderable component implements the same interface:

```typescript
interface DNAComponentProps {
  dna: InfographicDNA    // Full DNA (access any content or presentation field)
  slot: ComponentSlot    // The specific slot from components[] (has type, optional dataKey/labelKey)
  colors: ResolvedColors // Pre-resolved color values for Recharts
}
```

This uniform interface means adding a new chart type requires:
1. Create the component implementing `DNAComponentProps`
2. Add it to `COMPONENT_MAP`
3. No other changes needed — the renderer automatically picks it up

---

## The Iteration Engine

Iteration is Infographedia's social mechanic — equivalent to "retweet with comment" but for data visualizations.

### Mental Model

```
Original Post (by @data.pioneer)
  "Top 5 Most Populated Countries"
  [bar chart, glass-dark theme]
          │
          ├── Iteration 1 (by @eco_metrics)
          │   "Same data but as a pie chart"
          │   [pie chart, glass-dark theme]
          │   (content identical, presentation changed)
          │
          ├── Iteration 2 (by @neuro_mapper)
          │   "Population growth: 2020 vs 2026"
          │   [grouped bar, ocean-depth theme]
          │   (content new from search, presentation new)
          │
          └── Iteration 3 (by @cyber.analyst)
              "Add Indonesia and Pakistan"
              [bar chart, neon-cyberpunk theme]
              (content expanded, presentation changed)
```

### How It Works

1. User clicks the "iterate" button on any post
2. The iterate modal opens showing the **parent infographic** as a live DNA render
3. User types a mutation prompt (e.g., "change to pie chart" or "add 2024 data")
4. The prompt is sent to the AI along with the **full parent DNA**
5. The AI mutates the DNA according to the prompt:
   - Style-only: reuses `content`, changes `presentation`
   - Data change: searches web for new data, updates `content`
   - Mixed: searches and updates both layers
6. The new DNA is previewed alongside the parent
7. User publishes — a new post is created with `parentPost` pointing to the original
8. The parent's `metrics.iterationCount` is incremented

### Iteration vs. Recreation

The AI is explicitly instructed to **mutate, not recreate**. When iterating:

```
AI receives: parentDNA + "change to pie chart"

WRONG approach: Generate a brand new infographic about the same topic
RIGHT approach: Copy parentDNA, change presentation.chartType to "pie-chart",
                update components[] to use "pie-chart" instead of "bar-chart",
                keep all content identical
```

This preserves data continuity across the iteration chain. The viewer can follow the lineage and see exactly what changed at each step.

---

## Data Model

Three collections, intentionally simple.

### Entity Relationship

```
┌─────────────┐         ┌──────────────────┐        ┌────────────┐
│    Users     │ 1───N ► │      Posts        │ N───1 ►│   Media    │
│              │         │                  │        │            │
│ id           │         │ id               │        │ id         │
│ username     │         │ author → Users   │        │ url        │
│ email        │         │ title            │        │ filename   │
│ password     │         │ description      │        │ mimeType   │
│ avatar→Media │         │ dna (jsonb)      │        └────────────┘
│ bio          │         │ renderedImage→Media│
└─────────────┘         │ parentPost→Posts  │ ◄──┐ Self-referential
                        │ tags[]           │    │ (iteration lineage)
                        │ metrics {        │    │
                        │   likes          │ ───┘
                        │   saves          │
                        │   shares         │
                        │   iterationCount │
                        │ }                │
                        └──────────────────┘
```

### Why jsonb for DNA?

The DNA column uses PostgreSQL's `jsonb` type, which means:

- **Queryable**: `WHERE dna->'content'->>'title' LIKE '%climate%'`
- **Indexable**: GIN indexes on frequently queried JSON paths
- **Flexible**: Schema changes don't require database migrations (Zod validates at the application layer)
- **Compact**: PostgreSQL's binary JSON format is space-efficient

We deliberately chose *not* to normalize DNA into relational tables (one table for data points, one for sources, etc.) because:

1. DNA is always read and written as a complete unit
2. Partial updates to DNA are rare (iteration creates a new post)
3. The Zod schema provides application-layer validation
4. JSON operations in PostgreSQL are fast enough for our read patterns

### The parentPost Linked List

Iteration creates a simple linked list, not a tree:

```
Post A ← Post B ← Post C
         (parentPost = A)  (parentPost = B)
```

Multiple posts can point to the same parent (creating a fan-out), but each post has at most one parent. We explicitly avoid tree/DAG visualization because:

- Simple to query: `WHERE parentPost = <id>`
- Simple to display: "iterated from @username"
- No complex merge/diff logic needed
- The iteration chain is informational, not functional

---

## Authentication & Authorization

Authentication uses Payload CMS's built-in session system — no custom auth infrastructure.

### Flow

```
Register: POST /api/users → Payload creates user → auto-login
Login:    POST /api/users/login → Payload sets HTTP-only session cookie
Logout:   POST /api/users/logout → Payload clears cookie
Check:    GET /api/users/me → Returns current user or 401
```

### Client-Side Auth

The `AuthProvider` context wraps the app layout and provides:

```
useAuth() → {
  user: AuthUser | null,      // Current logged-in user
  isLoading: boolean,          // True during initial session check
  login(email, password),      // POST /api/users/login
  register(email, pass, name), // POST /api/users then auto-login
  logout(),                    // POST /api/users/logout
  refreshUser()                // Re-fetch /api/users/me
}
```

### Server-Side Auth

API routes (like `/api/publish`) verify the session using Payload's auth method:

```typescript
const { user } = await payload.auth({ headers: headersList })
if (!user) return 401
```

### Access Rules

| Resource | Read | Write |
|----------|------|-------|
| Posts | Public (anyone can browse) | Authenticated only |
| Users | Public (profiles are viewable) | Self only (edit own profile) |
| Media | Public (images are served) | Authenticated only |
| Generate (AI) | N/A | Authenticated only (via publish) |

---

## UI Architecture

### Layout Structure

```
┌──────────────────────────────────────────────────┐
│                   Root Layout                      │
│  ┌──────────────────────────────────────────────┐ │
│  │              AuthProvider                      │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │           ModalProvider                    │ │ │
│  │  │  ┌───────────┬──────────────────────────┐ │ │ │
│  │  │  │  Sidebar   │     <main>               │ │ │ │
│  │  │  │ (desktop)  │   Route content           │ │ │ │
│  │  │  │            │   (max-w-xl mx-auto)      │ │ │ │
│  │  │  │ hidden     │                           │ │ │ │
│  │  │  │ md:flex    │                           │ │ │ │
│  │  │  └───────────┴──────────────────────────┘ │ │ │
│  │  │  ┌──────────────────────────────────────┐ │ │ │
│  │  │  │         MobileNav (md:hidden)        │ │ │ │
│  │  │  │  Fixed bottom, glass blur backdrop    │ │ │ │
│  │  │  └──────────────────────────────────────┘ │ │ │
│  │  │  ┌──────────────────────────────────────┐ │ │ │
│  │  │  │         IterateModal (overlay)        │ │ │ │
│  │  │  └──────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Glassmorphism Design System

The visual language is intentionally constrained:

```
┌────────────────────────────────────────┐
│                                        │  bg-neutral-950 (app background)
│   ┌────────────────────────────────┐   │
│   │  Glass Panel                   │   │  bg-neutral-900/40
│   │  backdrop-blur-2xl             │   │  border border-white/10
│   │  border border-white/10        │   │  shadow-2xl
│   │  shadow-2xl                    │   │
│   │                                │   │
│   │  ┌──────────────────────────┐  │   │
│   │  │   Infographic (DNA)     │  │   │  DNA colors (--dna-primary, etc.)
│   │  │   [ALL COLOR IS HERE]   │  │   │  This is the only place color exists
│   │  │   Charts, text, badges  │  │   │
│   │  └──────────────────────────┘  │   │
│   │                                │   │
│   │  text-white / text-neutral-400 │   │  Monochrome text only
│   └────────────────────────────────┘   │
│                                        │
│   border-white/5                       │  Subtle dividers
│   hover:bg-white/10                    │  Interactive feedback
│                                        │
└────────────────────────────────────────┘
```

### Responsive Strategy

Mobile-first with a single breakpoint:

| Viewport | Navigation | Content Width | Layout |
|----------|-----------|---------------|--------|
| `< md` (mobile) | Bottom floating nav | Full width | Single column |
| `>= md` (desktop) | Left sidebar (w-64) | max-w-xl centered | Sidebar + content |

### The `<a>` inside `<a>` Rule

**Critical pattern**: The DNARenderer contains `SourceBadge` components that render `<a>` tags (external links to data sources). This means:

> **NEVER wrap a DNARenderer in a `<Link>` or `<a>` element.**

This causes React hydration errors (`<a>` nested inside `<a>`). Instead, use:

```tsx
// WRONG
<Link href={`/post/${id}`}>
  <DNARenderer dna={dna} />
</Link>

// RIGHT
<div onClick={() => router.push(`/post/${id}`)} className="cursor-pointer">
  <DNARenderer dna={dna} />
</div>
```

This pattern is used in `PostCard` (feed) and the profile grid.

---

## Design Tradeoffs

Decisions that were deliberately made and should not be revisited without strong justification.

### Monolith over Microservices

**Chose**: Next.js + Payload CMS as a single process
**Over**: Separate API, separate CMS, separate frontend
**Why**: Payload v3 runs inside Next.js natively. One deployment, shared types, simpler auth. The app doesn't need independent scaling of components at this stage.

### jsonb over Normalized Tables

**Chose**: Single `dna` jsonb column on the Posts collection
**Over**: Separate tables for data points, sources, colors, etc.
**Why**: DNA is always read/written as a unit. Normalization would add join complexity without query benefit. Zod provides application-layer validation.

### Recharts over D3.js

**Chose**: Recharts (React-declarative) for all current chart types
**Over**: D3.js (imperative DOM manipulation)
**Why**: Recharts components compose naturally with React. DNA-to-component mapping is straightforward with props. D3 is reserved for future advanced visualizations (Sankey, treemap) that Recharts can't handle.

### Client Components for Feed over Server Components

**Chose**: `'use client'` for the feed, post cards, and modals
**Over**: Server Components with client islands
**Why**: The feed requires infinite scroll (IntersectionObserver), interactive toolbar buttons, modal state management, and auth context — all of which require client-side JavaScript. Server Components are used for static pages (post detail wrapper, auth layout).

### Linked List over Tree for Iteration Lineage

**Chose**: Simple `parentPost` field (single parent reference)
**Over**: Full tree structure with branches, merges, diff tracking
**Why**: Users think in "I changed X about Y" terms, not graph terms. A linked list is sufficient to show "iterated from @user" attribution and to preserve the parent's DNA as context for the AI. Complex diff UIs were explicitly ruled out as a constraint.

### Session Cookies over JWT Tokens

**Chose**: Payload's HTTP-only session cookies
**Over**: JWT in localStorage or Authorization headers
**Why**: HTTP-only cookies are secure by default (no XSS exposure), automatically sent with every request, and Payload handles rotation/expiry. The `credentials: 'include'` fetch option ensures cookies are sent to API routes.

### CSS Custom Properties over Styled Components

**Chose**: CSS custom properties (`--dna-primary`, etc.) for dynamic theming
**Over**: Emotion, styled-components, or inline styles
**Why**: CSS variables work natively with Tailwind, have zero runtime cost, and cascade naturally to child elements. The only exception is Recharts, which requires color props directly (it can't read CSS variables from the DOM).

### Zod over TypeScript-only Validation

**Chose**: Zod schemas that generate TypeScript types
**Over**: TypeScript interfaces with manual runtime checks
**Why**: Zod validates at runtime (critical for AI output), generates TypeScript types automatically, provides detailed error messages for correction prompts, and works identically on client and server.
