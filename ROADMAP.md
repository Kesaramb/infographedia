# Infographedia — Version Roadmap (v1.0 → v2.0)

> From first working build to launchable product.

The 8 build iterations produce the **raw machinery**. This roadmap layers on the product refinement, user experience polish, growth mechanics, and launch readiness that turn working code into something people actually want to use.

---

## v1.0 — "It Works" (Build Iterations 1-8 Complete)

The output of the 8 build iterations. Everything functions end-to-end:

- ✅ DNA renderer with 8 chart types
- ✅ AI generation with web search grounding
- ✅ Infinite scroll feed
- ✅ Iterate engine (fork + mutate + publish)
- ✅ Auth, profiles, search
- ✅ Playwright screenshots
- ✅ Production build compiles

**Status**: Technically complete but NOT launchable. No real users have touched it. The AI prompts aren't tuned. The feed algorithm is chronological. There's no onboarding. No viral loop mechanics are active.

---

## v1.1 — "It Feels Right" (UX Polish)

**Focus**: Make every interaction feel premium. First impressions matter — if the app feels janky, users leave before discovering the iterate engine.

### Deliverables

- **Micro-animations everywhere**
  - Like heart: scale bounce + fill animation
  - Save bookmark: subtle drop animation
  - Iterate button: shimmer/glow on hover
  - Modal open/close: spring physics (Framer Motion)
  - Feed card entrance: staggered fade-up on scroll
  - Toast slide-in from bottom with spring

- **Loading states that delight**
  - AI generation: animated DNA helix or morphing chart skeleton (not a spinner)
  - Feed skeleton: glass shimmer cards that pulse
  - Image loading: blur-up from thumbnail to full renderedImage

- **Haptic feedback** (mobile)
  - Subtle vibration on like, save, publish

- **Sound design** (optional, off by default)
  - Soft click on iterate
  - Chime on successful publish

- **Empty states**
  - Empty feed: "The canvas is blank. Create your first infographic." with prominent Create CTA
  - Empty profile: "No posts yet" with Create CTA
  - Empty search: "No results" with trending suggestions

- **Error states**
  - AI generation failure: friendly message + retry button, not a stack trace
  - Network offline: persistent banner with retry
  - Rate limit hit: "You're creating too fast. Try again in X minutes."

### Acceptance Criteria
- Every interactive element has a visible transition/animation
- Loading states are present for every async operation
- Zero raw error messages visible to users
- App feels responsive on a mid-range Android phone

---

## v1.2 — "The AI Gets Smarter" (Generation Quality)

**Focus**: Tune the AI pipeline until it produces consistently beautiful, accurate infographics. This is the difference between a tech demo and a product.

### Deliverables

- **Prompt engineering refinement**
  - Test 50+ diverse prompts, categorize failure modes
  - Add few-shot examples to the system prompt (3-5 ideal DNA outputs)
  - Tune the web search query construction (the AI often writes bad search queries)

- **Theme presets with visual identity**
  - Each `ThemeName` gets a full preset: not just colors, but font weight, border radius, spacing, background patterns
  - `glass-dark`: frosted dark with glowing edges
  - `neon-cyberpunk`: high contrast, gradient borders, monospace font
  - `minimalist`: thin lines, lots of white space, serif font
  - `editorial`: newspaper-style layout, muted tones
  - `warm-earth`: organic colors, rounded shapes
  - `ocean-depth`: deep blues, wave-like gradients

- **Smart chart type selection**
  - If the user doesn't specify a chart type, the AI picks the best one based on data shape:
    - 2-5 categories → pie/donut
    - Time series → line/area
    - Comparison → bar/grouped bar
    - Single metric → stat card
    - Sequential events → timeline

- **Data formatting intelligence**
  - AI formats numbers with proper units (3.2M, not 3200000)
  - Percentages when data is proportional
  - Currency symbols when financial
  - Date formatting for time series

- **Iteration quality**
  - When iterating, the AI preserves the visual coherence of the parent
  - Style iterations don't break data layout
  - Data iterations maintain the same chart type unless explicitly asked to change

### Acceptance Criteria
- 90% of prompts produce a visually coherent infographic on first try
- Generated data matches real-world sources (spot-check 20 prompts manually)
- Theme presets are visually distinct and polished
- Iterations feel like natural evolutions, not random regenerations

---

## v1.3 — "People Can Find It" (SEO & Discoverability)

**Focus**: Make every infographic a search engine entry point. This is the organic growth engine.

### Deliverables

- **Dynamic SEO per post**
  - `generateMetadata` on every post page: title, description from DNA content
  - Open Graph image = renderedImage (automatic social previews)
  - Twitter Card with large image
  - JSON-LD structured data (Dataset schema, CreativeWork schema)

- **Sitemap generation**
  - Auto-generated sitemap.xml with all published posts
  - Ping search engines on new post creation

- **Topic pages**
  - `/topics/[topic]` — aggregated feed filtered by tag
  - Pre-seed popular topics: technology, climate, health, economics, sports
  - Each topic page has its own SEO metadata

- **Text content indexability**
  - Because DNA content (title, subtitle, footnotes, source names) is rendered as real HTML text (not baked into images), Google indexes it natively
  - Verify with Google Search Console after deploying

- **Social sharing optimization**
  - Share button generates a link with OG tags
  - Downloaded images have watermark + URL
  - "Share to X/LinkedIn" deep links with pre-filled text

### Acceptance Criteria
- Post pages render full metadata when shared on X, LinkedIn, Slack
- Google Search Console shows indexed pages within 2 weeks of deployment
- Topic pages rank for relevant queries within 4-6 weeks
- Shared watermarked images include the post URL

---

## v1.4 — "The Viral Loop" (Growth Mechanics)

**Focus**: Build the mechanics that make the platform spread without paid marketing.

### Deliverables

- **Watermarked downloads**
  - Download button exports a high-quality image with subtle Infographedia watermark + QR code linking back to the post
  - Pro users can remove watermark (future monetization hook)

- **Embed widget**
  - `/embed/[postId]` — a lightweight, responsive iframe embed
  - Bloggers and journalists can embed live infographics in articles
  - Embed includes a small "Powered by Infographedia" footer with link

- **Trending algorithm**
  - Replace chronological feed with engagement-weighted ranking
  - Signals: likes, saves, iteration count, recency, source verification
  - "Trending" tab in search/explore
  - "Most Iterated" leaderboard

- **Notification system**
  - Someone iterates your post → notification
  - Someone likes your post → notification
  - Your post is trending → notification
  - In-app notification bell with unread count

- **Onboarding flow**
  - First-time user: guided tour highlighting Create and Iterate
  - Prompt suggestions: "Try creating: 'Top 10 most spoken languages in 2026'"
  - Pre-populated explore feed with high-quality seed content

- **Creator attribution**
  - Iteration chain always visible
  - Original creator gets "Source" credit on all downstream iterations
  - Profile shows "X posts iterated from your work" metric

### Acceptance Criteria
- Downloaded images contain watermark with scannable QR code
- Embed widget loads in < 2 seconds on external sites
- Trending feed surfaces high-engagement content over chronological
- New users complete onboarding and create their first post within 5 minutes
- Notifications appear in real-time for likes and iterations

---

## v1.5 — "Trust at Scale" (Content Quality)

**Focus**: As the platform grows, ensure content quality and prevent misuse without building heavy moderation infrastructure.

### Deliverables

- **Source verification badges**
  - If DNA sources link to known, authoritative domains (WHO, World Bank, Bloomberg, Reuters, etc.), the infographic gets a "Verified Source" badge
  - Maintain a curated allowlist of trusted domains
  - Badge is visually distinct (subtle checkmark on the source badge)

- **AI content guardrails**
  - System prompt includes explicit rules against generating misleading charts (e.g., truncated Y-axes, cherry-picked date ranges)
  - Banned topics list for harmful content
  - AI refuses to generate content that misrepresents data

- **Community reporting**
  - "Report" button on every post (in the three-dot menu)
  - Report reasons: inaccurate data, misleading visualization, inappropriate content
  - Reports queue in Payload admin for review

- **Automated quality signals**
  - Posts with sources from trusted domains rank higher
  - Posts that have been iterated many times (community-validated) rank higher
  - Posts with no sources or broken source links rank lower

- **Rate limiting tiers**
  - Free: 10 generations/day
  - Pro: 100 generations/day
  - Prevents spam and controls AI costs

### Acceptance Criteria
- Verified source badges appear on posts with authoritative sources
- AI refuses to generate content for banned topics
- Report flow works end-to-end (user reports → admin queue → action)
- Rate limiting enforced per user tier

---

## v1.6 — "Make Money" (Monetization)

**Focus**: Introduce the Pro subscription without compromising the open-data mission.

### Deliverables

- **Infographedia Pro subscription**
  - Stripe integration for recurring billing
  - Pro badge on user profile

- **Pro features**
  - Remove watermark from downloads
  - Export as SVG, PNG (high-res), or raw JSON
  - Advanced AI models (Claude Opus for higher quality generation)
  - Advanced chart types (radar, treemap, Sankey diagram)
  - Custom color palettes (save and reuse)
  - Priority generation queue (skip rate limit waits)

- **Free tier remains generous**
  - Unlimited browsing and scrolling
  - 10 AI generations/day
  - Basic chart types (bar, pie, line, area, stat, donut, timeline)
  - Watermarked downloads
  - Full iteration capability

- **Pricing page**
  - `/pricing` — glass panel pricing cards
  - Monthly and annual options
  - Feature comparison table

- **Subscription management**
  - Stripe Customer Portal for billing management
  - Upgrade/downgrade/cancel flow

### Acceptance Criteria
- Stripe checkout works end-to-end
- Pro users see no watermarks on downloads
- SVG/PNG/JSON export works for Pro users
- Free users are gated from Pro features with upgrade prompts
- Billing management accessible from profile settings

---

## v1.7 — "Launch Prep" (Pre-Launch Polish)

**Focus**: Everything needed to confidently launch to real users.

### Deliverables

- **Landing page**
  - `/` for non-authenticated users: hero section showcasing the iterate flow
  - Animated demo of DNA → infographic rendering
  - Social proof section (placeholder for early user testimonials)
  - CTA: "Start Creating" → register

- **Legal pages**
  - `/terms` — Terms of Service
  - `/privacy` — Privacy Policy
  - `/about` — About Infographedia, the mission

- **Analytics integration**
  - Posthog or Plausible (privacy-first analytics)
  - Track: page views, generations, iterations, sign-ups, conversions
  - Funnel: visit → register → first generation → first iteration → return visit

- **Performance audit**
  - Lighthouse score > 90 on mobile
  - Core Web Vitals pass (LCP < 2.5s, FID < 100ms, CLS < 0.1)
  - Feed renders 20+ posts without jank
  - AI generation responds in < 10 seconds

- **Seed content**
  - 50-100 high-quality infographics across popular topics
  - Created by the team using the AI pipeline
  - Covers: tech, climate, health, finance, sports, education
  - Some with iteration chains (3-5 deep) to demonstrate the feature

- **Beta testing**
  - Invite 20-50 beta users
  - Collect feedback on: generation quality, UI intuitiveness, iterate flow
  - Fix critical bugs and UX friction points

### Acceptance Criteria
- Landing page converts visitors (measure with analytics)
- Legal pages exist and are linked in footer
- Analytics tracking all key events
- Lighthouse mobile > 90
- 50+ seed posts in production database
- Beta feedback incorporated

---

## v2.0 — "Launch" 🚀

**Focus**: Public launch. The product is stable, polished, seeded with content, and ready for growth.

### Launch Checklist

- [ ] Production infrastructure stable (Vercel + Supabase or equivalent)
- [ ] Database backed up and migration strategy documented
- [ ] SSL, security headers, CSP configured
- [ ] Rate limiting active and tested under load
- [ ] Error monitoring (Sentry or similar) active
- [ ] 50+ seed infographics live
- [ ] Landing page live
- [ ] Legal pages live
- [ ] Analytics tracking verified
- [ ] Stripe billing tested with real transactions
- [ ] Mobile experience verified on iOS Safari + Android Chrome
- [ ] Social sharing produces correct OG previews
- [ ] Watermarked downloads include working QR codes

### Launch Channels

1. **Product Hunt** — Primary launch platform
2. **Hacker News** — "Show HN" post
3. **X/Twitter** — Thread showing the iterate flow in action
4. **LinkedIn** — Data visualization community
5. **Reddit** — r/dataisbeautiful, r/webdev, r/nextjs
6. **Dev.to / Hashnode** — Technical blog post about the DNA architecture

### Success Metrics (First 30 Days)

| Metric | Target |
|---|---|
| Sign-ups | 1,000+ |
| Infographics created | 5,000+ |
| Iterations (forks) | 1,000+ |
| DAU (daily active users) | 200+ |
| Avg. session duration | > 3 minutes |
| Pro conversions | 2-5% of sign-ups |

---

## Version Summary

| Version | Name | Focus | Key Outcome |
|---|---|---|---|
| v1.0 | It Works | Build iterations 1-8 | Functional app |
| v1.1 | It Feels Right | UX polish, animations | Premium feel |
| v1.2 | AI Gets Smarter | Generation quality | Reliable, beautiful output |
| v1.3 | People Can Find It | SEO, discoverability | Organic traffic |
| v1.4 | The Viral Loop | Growth mechanics | Self-sustaining growth |
| v1.5 | Trust at Scale | Content quality | User trust |
| v1.6 | Make Money | Monetization | Revenue |
| v1.7 | Launch Prep | Polish, beta, legal | Launch readiness |
| **v2.0** | **Launch** | **Public release** | **Real users, real growth** |

---

## Timeline Estimate

| Phase | Versions | Est. Duration |
|---|---|---|
| Build | v1.0 (8 iterations) | 5-7 weeks |
| Polish | v1.1 - v1.3 | 3-4 weeks |
| Growth | v1.4 - v1.5 | 3-4 weeks |
| Monetize | v1.6 | 1-2 weeks |
| Launch | v1.7 - v2.0 | 2-3 weeks |
| **Total** | | **14-20 weeks** |
