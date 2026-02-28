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

## Iteration 9: Like / Save / Share System

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Likes collection** (`src/collections/Likes.ts`) - User + Post relationship with unique constraint
- **Saves collection** (`src/collections/Saves.ts`) - User + Post bookmark relationship
- **Like API** (`src/app/api/posts/[id]/like/route.ts`) - Toggle like with optimistic count update
- **Save API** (`src/app/api/posts/[id]/save/route.ts`) - Toggle save with optimistic count update
- **Share API** (`src/app/api/posts/[id]/share/route.ts`) - Fire-and-forget counter increment (no auth required)
- **Batch interactions API** (`src/app/api/user/interactions/route.ts`) - `GET ?postIds=1,2,3` returns `{ liked: [], saved: [] }` to avoid N+1 queries
- **Optimistic toggle hook** (`src/hooks/use-optimistic-action.ts`) - Instant UI update with server rollback on failure
- ActionToolbar wired to real API calls with optimistic UI

### Key Files Created
| File | Purpose |
|------|---------|
| `src/collections/Likes.ts` | Like relationship collection |
| `src/collections/Saves.ts` | Save/bookmark collection |
| `src/app/api/posts/[id]/like/route.ts` | Toggle like endpoint |
| `src/app/api/posts/[id]/save/route.ts` | Toggle save endpoint |
| `src/app/api/posts/[id]/share/route.ts` | Share counter endpoint |
| `src/app/api/user/interactions/route.ts` | Batch interaction check |
| `src/hooks/use-optimistic-action.ts` | Optimistic UI toggle hook |

### Key Decisions
- Like/save use authenticated toggle (create/delete pattern)
- Share is unauthenticated fire-and-forget (no login required to share)
- Batch interaction endpoint avoids N+1 when loading feed with multiple posts
- Metrics stored directly on Posts collection for fast feed rendering

---

## Iteration 10: Comments System

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Comments collection** (`src/collections/Comments.ts`) - author, post, body (max 500 chars)
- **Comments API** (`src/app/api/posts/[id]/comments/route.ts`) - Full CRUD:
  - `GET` - Paginated comments sorted newest-first, author populated
  - `POST` - Auth-required, auto-increments `metrics.comments`
  - `DELETE` - Ownership check (only author can delete), decrements counter
- **CommentSection** (`src/components/comments/comment-section.tsx`) - Full comment UI with auth-gated input, pagination ("Load more"), error handling with retry
- **CommentItem** (`src/components/comments/comment-item.tsx`) - Avatar, username link, body, time-ago formatting, delete button (own comments only)
- Posts collection updated with `metrics.comments` field
- PostDetail page updated to include CommentSection

### Key Files Created
| File | Purpose |
|------|---------|
| `src/collections/Comments.ts` | Comment collection schema |
| `src/app/api/posts/[id]/comments/route.ts` | Comment CRUD endpoint |
| `src/components/comments/comment-section.tsx` | Comment list + input UI |
| `src/components/comments/comment-item.tsx` | Individual comment display |

---

## Iteration 11: PNG Export & Share

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Download hook** (`src/hooks/use-download-infographic.ts`) - Full PNG export pipeline:
  - Uses `html-to-image` library (`toPng`) for DOM capture
  - 2x pixel ratio for retina-quality screenshots
  - Branded footer strip rendered via Canvas API with Infographedia logo + post URL
  - Safe filename generation (alphanumeric + dash, max 50 chars)
  - Toast notification on success/failure
- **Share functionality** in ActionToolbar:
  - Native Web Share API (with clipboard copy fallback)
  - Share counter increment via `/api/posts/[id]/share`

### Key Files Created/Modified
| File | Action |
|------|--------|
| `src/hooks/use-download-infographic.ts` | NEW - PNG export hook |
| `src/components/feed/action-toolbar.tsx` | MODIFIED - share + download wired |
| `src/components/feed/post-card.tsx` | MODIFIED - `ref` for DOM capture |
| `src/app/(app)/post/[id]/post-detail.tsx` | MODIFIED - download button wired |

### Dependencies Added
- `html-to-image` ^1.11.13

### Key Decisions
- Chose `html-to-image` over Playwright for client-side screenshots (no server round-trip)
- Branded footer rendered via Canvas composition (not DOM manipulation)
- Hidden static DNARenderer preserved for screenshot capture (Remotion Player can't be captured by html-to-image)

---

## Iteration 12: UX Polish & Micro-interactions

**Date**: February 2026
**Status**: Complete

### What Was Built
- **Toast notification system** (`src/components/ui/toast.tsx`) - Provider + `useToast` hook:
  - Three variants: success (green), error (red), info (neutral)
  - Auto-dismiss after 3 seconds
  - Spring animations via Framer Motion with AnimatePresence
  - Positioned above mobile nav (bottom-20) or desktop bottom bar (bottom-6)
- **Feed card animations** in `feed.tsx`:
  - Cards fade in and slide up on scroll (`whileInView={{ opacity: 1, y: 0 }}`)
  - Stagger delay: `Math.min(index * 0.08, 0.4)` (max 400ms cap)
  - `viewport={{ once: true, margin: '-50px' }}` for efficient triggering
- **Action toolbar micro-interactions** in `action-toolbar.tsx`:
  - Like heart: scale bounce `[1, 1.3, 0.9, 1.1, 1]` on toggle
  - Save bookmark: bounce down `y: [0, 3, -1, 0]` on toggle
  - Animations only trigger on state transitions (not on mount)
- **Activity page animations** - Cards animate in with stagger

### Dependencies Added
- `framer-motion` ^12.34.3

### Key Decisions
- Used `whileInView` instead of `animate` for feed cards (handles headless/hidden contexts better and is more appropriate for infinite scroll)
- Toast system uses Framer Motion's spring physics for natural feel
- Animation stagger capped at 400ms to prevent late cards from feeling sluggish

### Bug Fixed
- Feed animations stuck at `opacity: 0` in headless preview browsers because `document.visibilityState` was `"hidden"`. Fixed by switching from `animate` to `whileInView` pattern.

---

## Iteration 13: Sticky Generation Engine

**Date**: February 2026
**Status**: Complete

### What Was Built

This iteration had three phases: Admin AI Configuration, Sticky Prompt Engineering, and Remotion Player Integration.

#### Phase 1: Admin AI Configuration

- **AIAgentConfig Global** (`src/globals/AIAgentConfig.ts`) - Payload CMS Global accessible at `/admin/globals/ai-agent-config`:
  - Model selector (Claude Opus 4, Sonnet 4, Haiku 3.5)
  - Temperature (0-2, step 0.1)
  - Max tokens (1024-16384)
  - Max tool rounds (1-15)
  - Web search toggle (checkbox)
  - System prompt (full textarea editor, 20 rows)
  - Allowed chart types (multi-select, all 8 types)
  - Allowed themes (multi-select, all 7 themes)
  - Few-shot examples (array of `{ label, dnaJson }`)
- **Config fetcher** (`src/lib/ai/config.ts`) - Runtime config loader:
  - Module-level cache with 30s TTL
  - Falls back to hardcoded DEFAULTS when Payload unavailable (e.g., during build)
  - All fields validated with typeof guards
- **generate.ts rewrite** - Replaced all hardcoded constants (MODEL, MAX_TOKENS, MAX_TOOL_ROUNDS) with `getAIConfig()` calls. Tools conditionally empty when `enableWebSearch` is false.
- **payload.config.ts** - Added `globals: [AIAgentConfig]`

#### Phase 2: Sticky Prompt Engineering

- **System prompt overhaul** (`src/lib/ai/prompts.ts`):
  - Renamed `SYSTEM_PROMPT` to `DEFAULT_SYSTEM_PROMPT` (exported)
  - Added comprehensive **ENGAGEMENT RULES** section:
    - Title optimization (number-first, tension, specificity)
    - Hook generation (scroll-stopping one-liner from the data)
    - Chart type selection (prefer visual variety over defaults)
    - Data presentation (round numbers, show context, use comparisons)
  - `buildSystemPrompt(aiConfig)` assembles: base prompt + allowed types/themes constraints + few-shot examples
  - Enhanced `buildNewPrompt()` with step-by-step engagement instructions
- **Hook field in DNA schema** (`src/lib/dna/schema.ts`):
  - Added `hook: z.string().max(100).optional()` to ContentSchema
  - Purpose: AI-generated scroll-stopping one-liner derived from the data
- **HookBlock renderer** (`src/components/dna-renderer/blocks/hook-block.tsx`):
  - Renders hook text in bold italic, accent/primary color
  - Returns null if no hook present (backward compatible)
- **Component map updated** (`src/components/dna-renderer/component-map.ts`) - Added `'hook': HookBlock`

#### Phase 3: Remotion Player Integration

- **Remotion packages installed**: `remotion` 4.0.429, `@remotion/player` 4.0.429
- **Constants** (`src/components/remotion/constants.ts`) - FPS: 30, Duration: 90 frames (3s), Canvas: 600x800
- **8 animated SVG chart compositions** (`src/components/remotion/compositions/`):

| Component | File | Animation |
|-----------|------|-----------|
| AnimatedBarChart | `animated-bar-chart.tsx` | Bars spring-grow from bottom with stagger |
| AnimatedPieChart | `animated-pie-chart.tsx` | Arc paths sweep in sequentially |
| AnimatedDonutChart | `animated-donut-chart.tsx` | Arc paths with SVG mask for inner ring |
| AnimatedLineChart | `animated-line-chart.tsx` | Line draws via strokeDasharray/offset |
| AnimatedAreaChart | `animated-area-chart.tsx` | ClipPath rect reveals left-to-right |
| AnimatedStatCard | `animated-stat-card.tsx` | Number counts from 0 with scale-in |
| AnimatedTimeline | `animated-timeline.tsx` | Dots + labels spring in sequentially |
| AnimatedGroupedBar | `animated-grouped-bar.tsx` | Multi-series bars spring-grow with legend |

- **5 animated text blocks** (`src/components/remotion/blocks/`):

| Block | Timing | Effect |
|-------|--------|--------|
| AnimatedTitle | Frames 0-15 | Fade in + slide up |
| AnimatedSubtitle | Frames 10-25 | Fade in (70% max opacity) |
| AnimatedHook | Frames 15-35 | Fade in + scale (accent color) |
| AnimatedFootnote | Frames 75-85 | Fade in (50% max opacity) |
| AnimatedSourceBadge | Frames 80-90 | Source names fade in as badges |

- **Chart component map** (`src/components/remotion/component-map.ts`) - Maps DNA chartType to animated compositions
- **Root composition** (`src/components/remotion/infographic-composition.tsx`) - Orchestrates: title > subtitle > hook > chart > footnote > sources
- **AnimatedDNARenderer** (`src/components/remotion/animated-dna-renderer.tsx`) - Remotion `<Player>` wrapper:
  - Auto-plays, loops, no controls (clean feed experience)
  - Responsive width with `aspectRatio: 600/800`
  - `acknowledgeRemotionLicense` prop set
  - Lazy-loaded via `next/dynamic` with `{ ssr: false }`

- **Feed integration** (`post-card.tsx`, `post-detail.tsx`):
  - AnimatedDNARenderer replaces DNARenderer as the visible infographic
  - Static DNARenderer kept hidden (`className="hidden"`) for PNG export compatibility

### Key Files Created
| File | Purpose |
|------|---------|
| `src/globals/AIAgentConfig.ts` | Admin-editable AI settings |
| `src/lib/ai/config.ts` | Config fetcher with 30s TTL cache |
| `src/components/dna-renderer/blocks/hook-block.tsx` | Hook text renderer |
| `src/components/remotion/constants.ts` | Video config constants |
| `src/components/remotion/animated-dna-renderer.tsx` | Remotion Player wrapper |
| `src/components/remotion/infographic-composition.tsx` | Root composition |
| `src/components/remotion/component-map.ts` | Animated chart registry |
| `src/components/remotion/blocks/animated-title.tsx` | Animated title block |
| `src/components/remotion/blocks/animated-subtitle.tsx` | Animated subtitle block |
| `src/components/remotion/blocks/animated-hook.tsx` | Animated hook block |
| `src/components/remotion/blocks/animated-footnote.tsx` | Animated footnote block |
| `src/components/remotion/blocks/animated-source-badge.tsx` | Animated source badges |
| `src/components/remotion/compositions/animated-bar-chart.tsx` | Animated bar chart |
| `src/components/remotion/compositions/animated-pie-chart.tsx` | Animated pie chart |
| `src/components/remotion/compositions/animated-donut-chart.tsx` | Animated donut chart |
| `src/components/remotion/compositions/animated-line-chart.tsx` | Animated line chart |
| `src/components/remotion/compositions/animated-area-chart.tsx` | Animated area chart |
| `src/components/remotion/compositions/animated-stat-card.tsx` | Animated stat card |
| `src/components/remotion/compositions/animated-timeline.tsx` | Animated timeline |
| `src/components/remotion/compositions/animated-grouped-bar.tsx` | Animated grouped bars |

### Key Files Modified
| File | Change |
|------|--------|
| `payload.config.ts` | Added AIAgentConfig global |
| `src/lib/ai/generate.ts` | Replaced hardcoded constants with getAIConfig() |
| `src/lib/ai/prompts.ts` | Added engagement rules, hook schema, buildSystemPrompt() |
| `src/lib/dna/schema.ts` | Added `hook` field to ContentSchema |
| `src/components/dna-renderer/component-map.ts` | Added HookBlock mapping |
| `src/components/feed/post-card.tsx` | AnimatedDNARenderer + hidden static renderer |
| `src/app/(app)/post/[id]/post-detail.tsx` | AnimatedDNARenderer + hidden static renderer |

### Dependencies Added
- `remotion` 4.0.429
- `@remotion/player` 4.0.429

### Key Decisions
- **Raw SVG over Recharts for Remotion**: Recharts components can't be controlled frame-by-frame. Each animated chart uses raw SVG paths, rects, and circles driven by `useCurrentFrame()` + `interpolate()` / `spring()`.
- **@remotion/player over @remotion/renderer**: Player is lightweight (inline React component, no FFmpeg). We only need animated playback in the feed, not video file export.
- **Static renderer preserved hidden**: `html-to-image` can't capture Remotion's canvas-based Player, so the original DNARenderer is kept in a hidden div as the export target.
- **Payload Globals for AI config**: Singletons stored in `payload-kv` table (no migration needed). 30s TTL cache avoids DB hits on every generation while staying responsive to admin changes.
- **Engagement rules in system prompt**: Rather than building a separate "engagement scoring" service, we encode virality knowledge directly into the AI's system prompt as generation-time constraints.

### Production Database Note
The AIAgentConfig Global uses Payload's `payload-kv` table (key-value store for globals). No SQL migration is needed — Payload auto-creates the kv entry on first access.

---

## Production Fixes (Post-Deployment)

**Date**: February 28, 2026

### Fix 1: Missing `metrics_comments` Column (500 Error)
- **Symptom**: `column posts.metrics_comments does not exist` after deploying Iteration 10
- **Root Cause**: Migration file tried to CREATE ALL tables from scratch (failed because they existed)
- **Fix**: Manual SQL — `ALTER TABLE posts ADD COLUMN IF NOT EXISTS metrics_comments numeric DEFAULT 0` + `CREATE TABLE IF NOT EXISTS` for likes, saves, comments with all indexes and foreign keys. Inserted migration record into `payload_migrations`.

### Fix 2: Registration "Not Allowed" Error
- **Symptom**: New users got "You are not allowed to perform this action" when registering
- **Root Cause**: Users collection missing `create: () => true` in access control. Payload defaults to requiring auth for creation.
- **Fix**: Added `create: () => true` to Users collection access rules.

---

## GitHub Repository

**Date**: February 28, 2026

- **Repository**: https://github.com/Kesaramb/infographedia (public)
- **Initial commit**: `v1.0: Infographedia complete (Sprints 1-12)`
- `.gitignore` updated to exclude `.playwright-mcp/`, `.claude/settings.local.json`, `.claude/plan.md`

---

## Current State (Post-Iteration 13)

### What's Working
- Full feed with infinite scroll and 9 seed infographics
- **Animated infographics** in feed and detail view (Remotion Player, 30fps, 3s loop)
- All 8 chart types rendering as both static (Recharts) and animated (raw SVG + Remotion)
- AI generation pipeline (Claude + web search grounding) with **admin-configurable settings**
- **Sticky generation engine** with engagement rules, hook field, and optimized prompts
- Create and iterate modal flows
- Like, save, share with optimistic UI
- Comments system with pagination
- PNG export with branded footer
- Toast notifications with Framer Motion animations
- Session-based authentication (login, register, logout)
- All navigation routes (Home, Search, Activity, Profile, Edit Profile)
- Payload CMS admin panel at `/admin` with AI Agent Config global
- Production deployment on HestiaCP with PM2
- GitHub repository at https://github.com/Kesaramb/infographedia

### Tech Versions (as of Iteration 13)
| Package | Version |
|---------|---------|
| Next.js | 15.4.11 |
| Payload CMS | 3.77.0 |
| React | 19.2.4 |
| Tailwind CSS | 4.x |
| Recharts | 3.7.0 |
| Remotion | 4.0.429 |
| @remotion/player | 4.0.429 |
| Framer Motion | 12.34.3 |
| html-to-image | 1.11.13 |
| Zod | 4.x (`import { z } from 'zod/v4'`) |
| Anthropic SDK | 0.78.0 |
| TypeScript | 5.9.3 |
| Node.js (server) | 22.x |
| pnpm | 10.x |
| PM2 | 6.x |
