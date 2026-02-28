# Infographedia - Development History

> Chronological log of every build iteration, what was built, key decisions made, and lessons learned. Reference this file to understand how the codebase evolved and avoid re-solving problems that were already addressed.

---

## Iteration 1: Project Scaffolding & Foundation

**Date**: February 2026
**Status**: Complete

### What Was Built
- Next.js 15 project with App Router initialized via `create-payload-app`
- Payload CMS v3 running as a monolith inside Next.js
- PostgreSQL database connection (local dev via `mbkesara@localhost:5432/infographedia`)
- Three Payload collections: **Users**, **Posts**, **Media**
- Tailwind CSS v4 configured with the monochrome glassmorphism design system
- TypeScript strict mode, path aliases (`@/`)
- Basic app layout with route groups: `(app)`, `(auth)`, `(payload)`

### Key Files Created
- `payload.config.ts` - Payload CMS config with postgres adapter
- `src/collections/Users.ts` - username, avatar, bio
- `src/collections/Posts.ts` - author, title, description, dna (json), metrics, tags, parentPost
- `src/collections/Media.ts` - Standard upload collection
- `src/styles/globals.css` - Base Tailwind styles
- `src/app/layout.tsx` - Root layout
- `src/app/(app)/layout.tsx` - App shell layout

### Key Decisions
- Payload CMS v3 chosen over standalone backend for monolith simplicity
- PostgreSQL over MongoDB for relational integrity (iteration lineage, user relationships)
- Tailwind v4 with CSS custom properties (no runtime CSS-in-JS)
- `jsonb` column for DNA storage — queryable but flexible

---

## Iteration 2: Database Seeding & DNA Schema

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Zod DNA schema** (`src/lib/dna/schema.ts`) defining the full `InfographicDNA` type
- **8 seed infographics** with realistic data (`src/lib/dna/seed-data.ts`)
- **Seed script** (`scripts/seed.ts`) that creates 4 users and 8 posts
- DNA schema validates `content` (title, subtitle, data, sources, footnotes) and `presentation` (theme, chartType, layout, colors, components)

### Key Files Created
- `src/lib/dna/schema.ts` - Zod schema: `DNASchema`, `InfographicDNA` type
- `src/lib/dna/seed-data.ts` - 8 diverse seed infographics covering bar, pie, line, area, donut, grouped-bar, stat-card, timeline
- `scripts/seed.ts` - Idempotent seed script

### Seed Data
| # | Title | Chart Type | Author |
|---|-------|-----------|--------|
| 1 | Top 5 Most Populated Countries (2026) | bar | data.pioneer |
| 2 | Global Coffee Consumption by Region | pie | eco_metrics |
| 3 | Global Average Temperature Anomaly | line | neuro_mapper |
| 4 | The Cost of a Data Breach (2025) | stat-card | cyber.analyst |
| 5 | Earth's Water Distribution | donut | data.pioneer |
| 6 | Global Renewable Energy Capacity | area | eco_metrics |
| 7 | Major AI Milestones (2020-2025) | timeline | neuro_mapper |
| 8 | Population Growth: 2020 vs 2026 | grouped-bar | cyber.analyst |

### Seed User Credentials
- `pioneer@infographedia.dev` / `password123` (data.pioneer)
- `eco@infographedia.dev` / `password123` (eco_metrics)
- `neuro@infographedia.dev` / `password123` (neuro_mapper)
- `cyber@infographedia.dev` / `password123` (cyber.analyst)

---

## Iteration 3: DNA Renderer (8 Chart Types)

**Date**: February 2026
**Status**: Complete

### What Was Built
- **DNARenderer** component (`src/components/dna-renderer/index.tsx`) - the core engine that maps DNA JSON to React components
- **8 chart components** using Recharts:
  - `BarChart` - vertical bars with labels
  - `PieChart` - standard pie with labels
  - `LineChart` - time series with area fill
  - `AreaChart` - stacked area
  - `DonutChart` - pie with center hole
  - `GroupedBarChart` - multi-series bars
  - `StatCard` - single metric highlight
  - `Timeline` - sequential events
- **Block components**: TitleBlock, SubtitleBlock, FootnoteBlock, SourceBadge
- **ComponentMap** registry for chart type lookup
- **CSS custom property theming** - DNA `presentation.colors` injected as CSS variables

### Key Files Created
- `src/components/dna-renderer/index.tsx` - Main renderer
- `src/components/dna-renderer/component-map.ts` - Chart type registry
- `src/components/dna-renderer/types.ts` - Shared types
- `src/components/dna-renderer/blocks/` - Title, subtitle, footnote, source badge
- `src/components/charts/` - All 8 chart components

### Architecture Pattern
```
DNARenderer receives DNA JSON
  -> Extracts presentation.colors -> sets CSS variables
  -> Renders TitleBlock, SubtitleBlock
  -> Looks up chartType in ComponentMap
  -> Renders matching chart with content.data
  -> Renders FootnoteBlock, SourceBadge
```

### Key Decision
- SourceBadge renders `<a>` tags (external links to sources). This means any parent element wrapping DNARenderer must NOT be a `<Link>` or `<a>` to avoid hydration errors from nested `<a>` tags. Use `div + onClick + router.push()` instead.

---

## Iteration 4: AI Generation Pipeline

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Anthropic SDK integration** (`src/lib/ai/client.ts`) using `claude-sonnet-4-20250514`
- **Web search grounding** (`src/lib/ai/search.ts`) - AI calls web_search tool before generating data
- **Prompt builder** (`src/lib/ai/prompts.ts`) - System prompt with DNA schema instructions + few-shot examples
- **Tool definitions** (`src/lib/ai/tools.ts`) - web_search tool schema
- **JSON parser** (`src/lib/ai/parse.ts`) - Extracts DNA JSON from AI response, handles markdown fences
- **Generate orchestrator** (`src/lib/ai/generate.ts`) - Full pipeline: prompt -> tool calls -> DNA -> Zod validation
- **API route** (`src/app/api/generate/route.ts`) - `POST /api/generate` endpoint
- **useGenerate hook** (`src/hooks/use-generate.ts`) - Client-side SSE streaming hook

### Key Files Created
- `src/lib/ai/client.ts` - Anthropic client singleton
- `src/lib/ai/generate.ts` - Main orchestrator
- `src/lib/ai/prompts.ts` - System prompt with DNA format instructions
- `src/lib/ai/search.ts` - Web search tool handler
- `src/lib/ai/tools.ts` - Tool definitions
- `src/lib/ai/parse.ts` - JSON extraction from AI text
- `src/app/api/generate/route.ts` - API route
- `src/hooks/use-generate.ts` - React hook

### AI Pipeline Flow
```
User prompt
  -> (if iteration) Include parent DNA as context
  -> System prompt + tools sent to Claude
  -> Claude calls web_search tool (for data prompts)
  -> Search results returned to Claude
  -> Claude generates DNA JSON
  -> JSON extracted and parsed
  -> Zod validation (DNASchema.safeParse)
  -> Valid DNA returned to client
```

### Key Decisions
- Model: `claude-sonnet-4-20250514` (good balance of quality and speed)
- Style-only iterations skip web search (reuse parent content)
- Sources are mandatory - AI must include at least one source
- Zod validates all AI output before it reaches the database

---

## Iteration 5: Feed UI & Infinite Scroll

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Feed component** (`src/components/feed/feed.tsx`) - Main feed with infinite scroll
- **PostCard** (`src/components/feed/post-card.tsx`) - Full post card: header, DNA render, toolbar, caption
- **PostHeader** (`src/components/feed/post-header.tsx`) - Avatar, username, iteration attribution, timestamp
- **ActionToolbar** (`src/components/feed/action-toolbar.tsx`) - Like, save, share, iterate buttons with counts
- **WatermarkBadge** (`src/components/feed/watermark-badge.tsx`) - "INFOGRAPHEDIA" watermark overlay
- **PostCardSkeleton** (`src/components/feed/post-card-skeleton.tsx`) - Loading skeleton
- **useInfiniteScroll hook** (`src/hooks/use-infinite-scroll.ts`) - Intersection observer based pagination
- **Post detail page** (`src/app/(app)/post/[id]/`)
- **Glass UI primitives**: GlassPanel, GlassButton
- **Sidebar** and **MobileNav** (initially with local state, later wired to real navigation in Iteration 7)

### Key Files Created
- `src/components/feed/` - All feed components
- `src/components/ui/glass-panel.tsx` - Glass panel primitive
- `src/components/ui/glass-button.tsx` - Glass button primitive
- `src/components/ui/sidebar.tsx` - Desktop sidebar
- `src/components/ui/mobile-nav.tsx` - Mobile bottom nav
- `src/hooks/use-infinite-scroll.ts` - Pagination hook
- `src/app/(app)/post/[id]/page.tsx` - Post detail (server component)
- `src/app/(app)/post/[id]/post-detail.tsx` - Post detail (client component)

---

## Iteration 6: Iteration Engine (Create & Iterate Modal)

**Date**: February 2026
**Status**: Complete

### What Was Built
- **IterateModal** (`src/components/modals/iterate-modal.tsx`) - Multi-state modal for both Create and Iterate flows
- **ModalProvider** (`src/components/modals/modal-provider.tsx`) - React context for modal state
- **Publish API** (`src/app/api/publish/route.ts`) - `POST /api/publish` creates posts with validated DNA
- Modal states: `idle` -> `generating` -> `preview` -> `publishing` -> `done`
- Create flow: user types prompt -> AI generates DNA -> preview -> publish
- Iterate flow: shows parent infographic -> user types mutation prompt -> AI mutates DNA -> preview -> publish
- Parent post's `iterationCount` incremented on iteration publish

### Key Files Created
- `src/components/modals/iterate-modal.tsx` - Main modal (500+ lines)
- `src/components/modals/modal-provider.tsx` - Context + hooks
- `src/app/api/publish/route.ts` - Publish endpoint

### Modal Flow
```
Create: idle (prompt input) -> generating (AI working) -> preview (DNA render) -> publish -> done
Iterate: idle (parent preview + prompt) -> generating -> preview -> publish -> done
```

---

## Iteration 7: Auth, Profiles, Navigation & Social Polish

**Date**: February 2026
**Status**: Complete

### What Was Built

#### Authentication System
- **AuthProvider + useAuth hook** (`src/hooks/use-auth.tsx`) - Full auth context
  - `user`, `isLoading`, `login()`, `register()`, `logout()`, `refreshUser()`
  - Checks session on mount via `GET /api/users/me`
  - Login: `POST /api/users/login` (Payload built-in)
  - Register: `POST /api/users` then auto-login
  - Logout: `POST /api/users/logout`
- **Login page** (`src/app/(auth)/login/page.tsx`) - Glass-panel form
- **Register page** (`src/app/(auth)/register/page.tsx`) - 4-field form with password confirmation
- **Auth layout** (`src/app/(auth)/layout.tsx`) - Centered, no sidebar
- **AuthGuard** (`src/components/ui/auth-guard.tsx`) - Redirects to `/login` if not authenticated

#### Navigation (Real Routing)
- **Sidebar rewrite** - `usePathname()` + `<Link>` components, active state from URL
- **MobileNav rewrite** - Same routing pattern
- Route map: Home `/`, Search `/search`, Activity `/activity`, Profile `/profile/${username}`
- Create button opens modal (not a route)
- Profile link: `/profile/${user.username}` when logged in, `/login` when guest

#### Pages
- **Search** (`/search`) - Debounced search (300ms), queries `where[title][like]`, PostCard results
- **Profile** (`/profile/[username]`) - Avatar, username, bio, post count, 3-column grid, "Edit Profile" (own only)
- **Edit Profile** (`/profile/edit`) - Auth-gated, username + bio form, PATCH to Payload
- **Activity** (`/activity`) - Auth-gated, user's own posts as PostCard list

#### Clickable Usernames
- PostHeader: username + avatar wrapped in `<Link>` to profile
- PostCard caption: username is a `<Link>`
- Parent author attribution `@parentAuthor` is a link

#### Auth-Gated Publishing
- `POST /api/publish` uses `payload.auth({ headers })` for session-based auth
- Returns 401 if not authenticated
- Iterate modal shows "Sign in to create" prompt when not logged in

#### Shared Utilities
- `src/lib/transform-post.ts` - Extracted post transform logic (resolves avatar, parent author)

### Key Files Created/Modified
| File | Action |
|---|---|
| `src/hooks/use-auth.tsx` | NEW |
| `src/app/(auth)/layout.tsx` | NEW |
| `src/app/(auth)/login/page.tsx` | NEW |
| `src/app/(auth)/register/page.tsx` | NEW |
| `src/app/(app)/search/page.tsx` | NEW |
| `src/app/(app)/profile/[username]/page.tsx` | NEW |
| `src/app/(app)/profile/edit/page.tsx` | NEW |
| `src/app/(app)/activity/page.tsx` | NEW |
| `src/components/ui/auth-guard.tsx` | NEW |
| `src/lib/transform-post.ts` | NEW |
| `src/components/ui/sidebar.tsx` | REWRITE |
| `src/components/ui/mobile-nav.tsx` | REWRITE |
| `src/components/feed/post-header.tsx` | MODIFY |
| `src/components/feed/post-card.tsx` | MODIFY |
| `src/components/feed/feed.tsx` | MODIFY |
| `src/app/(app)/layout.tsx` | MODIFY |
| `src/app/api/publish/route.ts` | MODIFY |
| `src/components/modals/iterate-modal.tsx` | MODIFY |

### Bugs Fixed During Iteration 7
1. **JSX in `.ts` file**: `use-auth.ts` had JSX but `.ts` extension. Fix: renamed to `.tsx`
2. **GlassButton `as` prop**: Sidebar tried `<GlassButton as="div">` inside `<Link>`. GlassButton only renders `<button>`. Fix: replaced with `<Link>` elements with inline Tailwind classes
3. **`<a>` inside `<a>` hydration error**: Profile grid used `<Link>` wrapping DNARenderer (which has `<a>` tags in SourceBadge). Fix: changed to `div + onClick + router.push()` pattern
4. **Stale cached errors**: After fixing nested `<a>`, old errors persisted from cache. Fix: full server restart

---

## Deployment (Iteration 8)

**Date**: February 28, 2026
**Status**: Complete

### What Was Deployed
Infographedia deployed to a Contabo VPS managed by HestiaCP.

### Deployment Details
| Detail | Value |
|--------|-------|
| **Live URL** | `http://infographedia.167.86.81.161.sslip.io` |
| **Admin Panel** | `http://infographedia.167.86.81.161.sslip.io/admin` |
| **Server** | `167.86.81.161` (Contabo VPS, Ubuntu 24.04) |
| **Port** | `3005` |
| **PM2 Process** | `infographedia` |
| **Database** | `admin_infographedia` (PostgreSQL via HestiaCP) |
| **HestiaCP Domain** | `infographedia.167.86.81.161.nip.io` |
| **DNS Alias** | `infographedia.167.86.81.161.sslip.io` (sslip.io for reliable resolution) |

### Deployment Steps Performed
1. **HestiaCP web domain** created via `v-add-web-domain`
2. **NGINX proxy template** `nodeapp3005` created (copied from `nodeapp`, port changed to 3005)
3. **PostgreSQL database** created via `v-add-database admin infographedia infographedia_user <password> pgsql`
4. **Codebase uploaded** via rsync (excluded node_modules, .next, .env)
5. **Production .env** created with DATABASE_URL, PAYLOAD_SECRET, ANTHROPIC_API_KEY, PORT=3005
6. **Dependencies installed** via `pnpm install --frozen-lockfile`
7. **Production build** completed via `pnpm build` (all 15 routes)
8. **Payload migrations** generated via `npx payload migrate:create` and applied via `npx payload migrate`
9. **Database seeded** via `node --env-file=.env --import=tsx scripts/seed.ts`
10. **PM2 started** with `npx next start -p 3005`

### Deployment Gotchas
- **nip.io DNS unreliable from some networks** - Added sslip.io alias as fallback. sslip.io resolves more reliably.
- **Next.js ignores PORT env var with `pnpm start`** - Must use `next start -p 3005` explicitly
- **Payload seed script doesn't auto-load .env** - Must use `node --env-file=.env --import=tsx` instead of `npx tsx`
- **nodeapp template defaults to port 3001** - Created custom `nodeapp3005` template at `/usr/local/hestia/data/templates/web/nginx/`
- **Payload migrations required for production** - Dev mode uses auto-push, production requires explicit `migrate:create` + `migrate`

### Server File Paths
```
/home/admin/web/infographedia.167.86.81.161.nip.io/
  nodeapp/                  # Application root
    .env                    # Production environment
    .next/                  # Build output
    src/migrations/         # Payload migration files
/home/admin/conf/web/infographedia.167.86.81.161.nip.io/
    nginx.conf              # Generated NGINX config
/usr/local/hestia/data/templates/web/nginx/
    nodeapp3005.tpl         # Custom NGINX proxy template (HTTP)
    nodeapp3005.stpl        # Custom NGINX proxy template (HTTPS)
```

### Redeployment Commands
```bash
# SSH into server
sshpass -p '<password>' ssh root@167.86.81.161

# Update code
cd /home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp
# rsync from local, or git pull if repo is set up

# Rebuild and restart
pnpm install --frozen-lockfile
pnpm build
pm2 restart infographedia

# Check logs
pm2 logs infographedia --lines 50
```

---

## Current State (Post-Iteration 8)

### What's Working
- Full feed with infinite scroll and 8 seed infographics
- All 8 chart types rendering correctly from DNA
- AI generation pipeline (Claude + web search grounding)
- Create and iterate modal flows
- Session-based authentication (login, register, logout)
- All navigation routes (Home, Search, Activity, Profile, Edit Profile)
- Clickable usernames linking to profiles
- Auth-gated publishing and activity page
- Payload CMS admin panel at `/admin`
- Production deployment on HestiaCP with PM2

### What's NOT Built Yet (see ROADMAP.md)
- Playwright screenshot service (renderedImage generation)
- Micro-animations and loading polish (v1.1)
- AI prompt tuning and theme presets (v1.2)
- SEO metadata and Open Graph images (v1.3)
- Trending algorithm and notifications (v1.4)
- Source verification badges (v1.5)
- Pro subscription with Stripe (v1.6)
- Landing page and analytics (v1.7)

### Tech Versions (as of deployment)
| Package | Version |
|---------|---------|
| Next.js | 15.4.11 |
| Payload CMS | 3.77.0 |
| React | 19.2.4 |
| Tailwind CSS | 4.x |
| Recharts | 3.7.0 |
| Zod | 4.x (`import { z } from 'zod/v4'`) |
| Anthropic SDK | 0.78.0 |
| TypeScript | 5.9.3 |
| Node.js (server) | 22.x |
| pnpm | 10.x |
| PM2 | 6.x |
