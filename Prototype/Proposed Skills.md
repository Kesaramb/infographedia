Infographedia: AI Agent Skills & Proficiency Profile

To successfully build, deploy, and maintain the Infographedia platform, the development agent must possess expert-level proficiencies across the following domains.

1. Frontend Architecture & UI/UX

React & Next.js (App Router): Expert in Server Components, client-side state management, and SSR/SSG optimization for infinite scroll feeds.

Tailwind CSS (Advanced): Mastery of utility classes, arbitrary values, complex responsive breakpoints, and implementing high-performance Glassmorphism (backdrop-blur, subtle borders, composite blending).

Emotion (CSS-in-JS): Deep understanding of dynamic styling, theme injection, and parsing JSON "DNA" into styled React components on the fly.

Data Visualization: Proficiency with Recharts, D3.js, or raw SVG manipulation to render pie charts, timelines, and graphs dynamically from JSON payloads.

Micro-interactions: Implementing fluid animations using Framer Motion or native CSS transitions for liking, saving, and modal transitions.

2. Backend & CMS (Payload CMS)

TypeScript: Strict typing, generic types, and interface definitions for all data models.

Payload CMS (v3+): Building code-first schemas, custom endpoints, hooks (beforeChange, afterRead), and managing complex relationships (e.g., the parentPost self-referential relation for iterations).

Database Management: PostgreSQL (preferred for relational graph trees) or MongoDB. Understanding of indexing for high-read feed queries.

Authentication & Security: Implementing JWT/session-based auth, role-based access control (RBAC), and securing raw JSON data from malicious injections.

3. AI & "DNA" Engine Engineering

Structured Output Generation: Forcing LLMs to return strict, deeply nested JSON objects matching a predefined schema.

Prompt Chaining & Mutation: Building the logic that takes "User A's DNA + User B's text prompt" and returns a perfectly mutated "User B's DNA" without breaking component logic.

Headless Browser Automation: Using tools like Puppeteer or Playwright running in edge functions to snap off-screen screenshots of rendered HTML/React components to generate the static renderedImage for the feed.

4. System Design & DevOps

REST/GraphQL API Design: Efficiently fetching paginated feed data and deeply nested iterative trees.

Asset Management: Handling user avatars and generated infographic snapshots efficiently (e.g., AWS S3, Vercel Blob).

Performance Optimization: Memoization, lazy loading infographic components, and optimizing the infinite scroll to prevent DOM bloat.