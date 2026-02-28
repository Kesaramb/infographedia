# Infographedia

## What This Is

Infographedia is an Instagram-style infinite-scroll platform where every post is a **living, AI-generated infographic** stored as structured JSON ("DNA"), not a flat image. Users can view, interact with, and "iterate" on any infographic — forking the underlying data and restyling it with a single AI prompt. The AI automatically grounds itself via web search, attaching verified sources to every graphic.

**Core thesis**: Information should be inspectable, forkable, and verifiable by anyone. We break media gatekeeping by making data transparent and community-iterable.

**Current status**: v1.0 complete (Iterations 1-8). Deployed to production.

**Key documentation**:
- [CONCEPTS.md](./CONCEPTS.md) - First principles, system architecture, and design tradeoffs. Read this first.
- [HISTORY.md](./HISTORY.md) - Full development log of every iteration, key decisions, and bugs fixed.
- [ROADMAP.md](./ROADMAP.md) - Product roadmap from v1.1 to v2.0 launch.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, Server Components, SSR for SEO)
- **Backend/CMS**: Payload CMS v3 (runs inside Next.js as a monolith)
- **Database**: PostgreSQL (via Supabase or self-hosted)
- **Styling**: Tailwind CSS (app shell) + CSS custom properties (dynamic DNA theming)
- **Charts**: Recharts for declarative charts, D3.js for advanced visualizations
- **AI**: Claude API (Anthropic) with tool calling (web search for grounding)
- **Snapshot**: Playwright for headless screenshots of rendered DNA
- **Auth**: Payload built-in (JWT/session)
- **Icons**: Lucide React
- **Validation**: Zod (DNA schema validation)

## Architecture: The DNA Pattern

Every infographic is a JSON object with two layers:

```
DNA = {
  content: {          // WHAT the data says (facts, numbers, sources)
    title, subtitle, data[], sources[], footnotes
  },
  presentation: {     // HOW it looks (styling, layout, chart type)
    theme, chartType, layout, colors, components[]
  }
}
```

**Rules**:
- Content and presentation are ALWAYS separate. Never mix data with styling.
- The `sources[]` array is populated by the AI via web search tool calls. Every infographic must have at least one source.
- DNA is stored as `jsonb` in PostgreSQL, never as a flat image.
- A flat `renderedImage` (WebP) is generated via Playwright screenshot for feed performance.
- Iteration = creating a new Post with `parentPost` pointing to the original. The AI receives parent DNA + user prompt and mutates accordingly.

## Important Directories

```
/src
  /app                    # Next.js App Router pages and layouts
    /(app)                # Main app routes (feed, profile, create)
    /(auth)               # Login, register
    /api                  # API routes
  /components
    /ui                   # Reusable glass UI primitives
    /feed                 # Feed, post cards, infinite scroll
    /dna-renderer         # DNA → React component mapping engine
    /charts               # Chart components (bar, pie, line, timeline)
    /modals               # Iterate modal, create modal
  /collections            # Payload CMS collection schemas
  /lib
    /ai                   # AI pipeline (prompt builder, tool calling, DNA generation)
    /dna                  # DNA validation (Zod schemas), mutation helpers
    /snapshot             # Playwright screenshot service
  /styles                 # Global styles, Tailwind config, CSS variables
  /hooks                  # React hooks (useInfiniteScroll, useDNA, etc.)
  /types                  # Shared TypeScript types
/public                   # Static assets
/Prototype                # Original prototype docs (reference only)
```

## Key Commands

```bash
# Development
pnpm dev                                    # Start Next.js + Payload dev server (port 3000)
pnpm build                                  # Production build
pnpm lint                                   # ESLint
npx tsc --noEmit                            # TypeScript strict check (zero errors expected)

# Database
npx payload migrate:create                  # Generate migration from schema changes
npx payload migrate                         # Apply pending migrations
node --env-file=.env --import=tsx scripts/seed.ts  # Seed database with sample posts

# Production (on server)
pm2 restart infographedia                   # Restart production app
pm2 logs infographedia --lines 50           # View production logs
```

## Code Style & Conventions

- **TypeScript strict mode** everywhere. No `any` types.
- **Functional components only**. No class components.
- **Named exports** for components. Default export only for pages.
- **File naming**: `kebab-case` for files, `PascalCase` for components.
- **Tailwind first** for static styles. CSS custom properties for dynamic DNA theming. No Emotion, no styled-components, no runtime CSS-in-JS.
- **Server Components by default**. Only add `"use client"` when the component needs interactivity, browser APIs, or hooks.
- **Zod for all validation**: DNA schemas, API inputs, form data.
- **No placeholder logic**: No `alert()`, no `console.log` for user actions. Build the actual UI (toasts, modals, error states).
- **Imports**: Use `@/` path alias for all project imports.

## UI Design System: Monochrome Glassmorphism

The app shell is STRICTLY monochrome dark. All color comes from the infographic content.

```
Glass Panel:    bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl
Glass Button:   hover:bg-white/10 active:bg-white/5 rounded-xl transition-all duration-200
Background:     bg-neutral-950
Text Primary:   text-white
Text Secondary: text-neutral-400
Text Muted:     text-neutral-500
Border:         border-white/5 or border-white/10
```

- Mobile-first responsive. Bottom nav for mobile (`md:hidden`), left sidebar for desktop (`hidden md:flex`).
- Ambient background: Faint radial gradient blurs (`bg-white/5 rounded-full blur-[150px]`) for depth.
- Infographic cards fill the viewport width on mobile, capped at `max-w-xl` on desktop.

## Payload CMS Collections

### Users
- `username` (text, unique, indexed)
- `avatar` (upload)
- `bio` (text)

### Posts (Infographics)
- `author` (relationship → Users)
- `title` (text, required)
- `description` (text)
- `dna` (json, required — the structured DNA object)
- `renderedImage` (upload — flat WebP for the feed)
- `parentPost` (relationship → Posts, self-referential — iteration lineage)
- `metrics` (group: likes, saves, shares, iterationCount)
- `tags` (array of text)

### Media
- Standard Payload upload collection for images

## AI Pipeline Rules

1. **Always ground with web search**: When the user prompt involves data (numbers, statistics, facts), the AI MUST call its web search tool BEFORE generating DNA. No hallucinated data.
2. **Style-only changes skip search**: If the prompt only changes presentation (colors, theme, chart type), the AI reuses the parent's `content` and only mutates `presentation`.
3. **Sources are mandatory**: Every generated DNA must have at least one entry in `content.sources[]` with `name`, `url`, and `accessedAt`.
4. **Schema validation**: All AI output passes through Zod validation before reaching the database. Invalid DNA is rejected with a user-friendly error.
5. **Iteration = mutation, not recreation**: When iterating, the AI receives the full parent DNA as context. It mutates fields, not rebuilds from scratch.

## Critical Constraints

- **No complex community consensus systems**: We solve trust at creation time via AI grounding, not post-hoc community voting.
- **No Git-style diff tracking**: Simple `parentPost` lineage is sufficient. No complex diff viewers.
- **No Emotion / runtime CSS-in-JS**: Use CSS custom properties for dynamic theming.
- **No sponsored content infrastructure**: Not in scope.
- **No private DNA / paywalled data**: All DNA is open and iterable. Premium features are around export formats and advanced styling.
- **Never store infographics as flat images in the data model**: The DNA is the source of truth. The `renderedImage` is a cache for feed performance only.

## Production Deployment

| Detail | Value |
|--------|-------|
| **Live URL** | `http://infographedia.167.86.81.161.sslip.io` |
| **Admin Panel** | `http://infographedia.167.86.81.161.sslip.io/admin` |
| **Server** | `167.86.81.161` (Contabo VPS, Ubuntu 24.04, HestiaCP) |
| **Port** | `3005` (NGINX reverse proxy via `nodeapp3005` template) |
| **Database** | `admin_infographedia` (PostgreSQL, HestiaCP-managed) |
| **PM2 Process** | `infographedia` |
| **App Path** | `/home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp/` |

### Redeployment
```bash
# Upload changes
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.env' \
  -e "ssh -o StrictHostKeyChecking=no" \
  /Users/mbkesara/Projects/infographedia/ \
  root@167.86.81.161:/home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp/

# SSH in, rebuild, restart
ssh root@167.86.81.161
cd /home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp
pnpm install --frozen-lockfile && pnpm build && pm2 restart infographedia
```

### Migrations (Production)
```bash
cd /home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp
npx payload migrate:create   # Generate migration from schema changes
npx payload migrate           # Apply pending migrations
pm2 restart infographedia
```

## Documentation Index

| File | Purpose | When to Read |
|------|---------|--------------|
| **[CONCEPTS.md](./CONCEPTS.md)** | First principles, system architecture, design tradeoffs | Before making architectural decisions or adding new patterns |
| **[HISTORY.md](./HISTORY.md)** | Build iteration log, bugs fixed, deployment details | Before starting new work or debugging existing issues |
| **[ROADMAP.md](./ROADMAP.md)** | Product roadmap v1.1 to v2.0 | When planning what to build next |
