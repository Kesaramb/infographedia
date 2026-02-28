'use client'

import {
  BookOpen,
  Terminal,
  Users,
  Play,
  Settings,
  Cpu,
  Server,
  ChevronRight,
  Heart,
  Bookmark,
  Share2,
  Download,
  MessageCircle,
  GitBranch,
} from 'lucide-react'
import { AdminGuard } from '@/components/ui/admin-guard'

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-900/40 border border-white/10 p-5 mb-4">
      {children}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre">
      {children}
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-neutral-400 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-neutral-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-white">{n}</span>
      </div>
      <p className="text-sm text-neutral-300 leading-relaxed">{text}</p>
    </div>
  )
}

function Pill({ icon: Icon, label }: { icon: typeof Heart; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <Icon className="w-3.5 h-3.5 text-neutral-400" />
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  )
}

// ─── page content ─────────────────────────────────────────────────────────────

function GuideContent() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-white" />
          <h1 className="text-sm font-semibold text-white">Getting Started Guide</h1>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-neutral-400">
            Admin only
          </span>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-8 max-w-2xl mx-auto w-full pb-24">

        {/* Quick Start */}
        <section>
          <SectionHeader icon={Terminal} title="Quick Start" />
          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Prerequisites</p>
            <ul className="flex flex-col gap-1 mb-4">
              {['Node.js 18+', 'pnpm  (npm install -g pnpm)', 'PostgreSQL database'].map((req) => (
                <li key={req} className="flex items-center gap-2 text-sm text-neutral-300">
                  <ChevronRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>

            <p className="text-xs font-medium text-neutral-400 mb-2">Local setup</p>
            <CodeBlock>{`git clone https://github.com/Kesaramb/infographedia.git
cd infographedia
pnpm install
cp .env.example .env   # fill in DB URL and API keys
pnpm dev               # open http://localhost:3000`}</CodeBlock>
          </Card>

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Environment variables</p>
            <Table
              headers={['Variable', 'Description']}
              rows={[
                ['DATABASE_URI', 'PostgreSQL connection string'],
                ['PAYLOAD_SECRET', 'Random secret for Payload CMS auth'],
                ['ANTHROPIC_API_KEY', 'Claude API key for AI generation'],
              ]}
            />
          </Card>

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-2">Seed the database</p>
            <CodeBlock>{`node --env-file=.env --import=tsx scripts/seed.ts`}</CodeBlock>
            <p className="text-xs text-neutral-500 mt-2">Creates 4 sample users and 9 infographic posts with different chart types.</p>
          </Card>
        </section>

        {/* User Roles */}
        <section>
          <SectionHeader icon={Users} title="User Roles" />
          <Card>
            <Table
              headers={['Role', 'Capabilities']}
              rows={[
                ['User', 'View feed, like/save/share posts, create infographics, iterate, comment'],
                ['Admin', 'Everything users can do + admin panel, delete any post, manage users, update AI config'],
              ]}
            />
            <p className="text-xs font-medium text-neutral-400 mt-4 mb-2">Promote a user to admin</p>
            <CodeBlock>{`UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`}</CodeBlock>
          </Card>
        </section>

        {/* Using the App */}
        <section>
          <SectionHeader icon={Play} title="Using the App" />

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Browsing infographics</p>
            <div className="flex flex-col gap-2">
              <Step n={1} text="Scroll the infinite feed on the home page." />
              <Step n={2} text="Each infographic plays an 8-second animation, then shows the static version." />
              <Step n={3} text="Click the replay button (top-right of card) to watch the animation again." />
              <Step n={4} text="Tap any post to open the full detail view." />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Creating an infographic</p>
            <div className="flex flex-col gap-2">
              <Step n={1} text="Click the + button (centre of bottom nav)." />
              <Step n={2} text={`Enter a topic prompt — e.g. "Top programming languages by popularity in 2026".`} />
              <Step n={3} text="The AI searches the web for real data, then generates a structured infographic." />
              <Step n={4} text="Every infographic includes verified sources." />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Iterating on an infographic</p>
            <div className="flex flex-col gap-2">
              <Step n={1} text="Open any post's detail view." />
              <Step n={2} text="Click the Iterate button." />
              <Step n={3} text={`Enter a modification prompt — e.g. "Change to a pie chart with warmer colors".`} />
              <Step n={4} text="The AI preserves the parent's data and applies your changes." />
              <Step n={5} text="Iterations link back to the parent post." />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-3">Interactions</p>
            <div className="flex flex-wrap gap-2">
              <Pill icon={Heart} label="Like" />
              <Pill icon={MessageCircle} label="Comment" />
              <Pill icon={Share2} label="Share" />
              <Pill icon={Bookmark} label="Bookmark" />
              <Pill icon={GitBranch} label="Iterate" />
              <Pill icon={Download} label="Download PNG" />
            </div>
          </Card>
        </section>

        {/* Admin Panel */}
        <section>
          <SectionHeader icon={Settings} title="Admin Panel" />
          <Card>
            <p className="text-sm text-neutral-300 mb-4">
              Access at <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">/admin</code> (admin role required).
            </p>

            <p className="text-xs font-medium text-neutral-400 mb-2">Collections</p>
            <Table
              headers={['Collection', 'Purpose']}
              rows={[
                ['Users', 'Manage accounts, change roles'],
                ['Posts', 'View / edit / delete all infographics, inspect DNA'],
                ['Media', 'Uploaded images and rendered screenshots'],
              ]}
            />

            <p className="text-xs font-medium text-neutral-400 mt-4 mb-2">AI Agent Config global</p>
            <Table
              headers={['Field', 'Description']}
              rows={[
                ['System Prompt', 'Core instructions for the AI'],
                ['Engagement Prompt', 'Persona and style guide for generated content'],
                ['Temperature', 'Controls creativity (0.0 = deterministic, 1.0 = creative)'],
                ['Max Tokens', 'Maximum response length'],
              ]}
            />
          </Card>
        </section>

        {/* Architecture */}
        <section>
          <SectionHeader icon={Cpu} title="Architecture" />
          <Card>
            <p className="text-xs font-medium text-neutral-400 mb-2">The DNA pattern</p>
            <CodeBlock>{`DNA = {
  content: {          // WHAT (facts, data, sources)
    title, subtitle, hook, data[], sources[], footnotes
  },
  presentation: {     // HOW (styling, chart type, colors)
    theme, chartType, layout, colors
  }
}`}</CodeBlock>
            <ul className="flex flex-col gap-1.5 mt-4">
              {[
                'Content and presentation are always separate.',
                'Sources are populated by AI via web search (mandatory).',
                'DNA is stored as jsonb in PostgreSQL.',
                'A rendered image (WebP) is cached for feed performance.',
                'Iteration = new post with parentPost pointing to original.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-neutral-400">
                  <ChevronRight className="w-3 h-3 text-neutral-600 flex-shrink-0 mt-0.5" />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Production */}
        <section>
          <SectionHeader icon={Server} title="Production" />
          <Card>
            <Table
              headers={['Detail', 'Value']}
              rows={[
                ['Live URL', 'http://infographedia.167.86.81.161.sslip.io'],
                ['Admin Panel', 'http://infographedia.167.86.81.161.sslip.io/admin'],
                ['PM2 Process', 'infographedia'],
              ]}
            />

            <p className="text-xs font-medium text-neutral-400 mt-4 mb-2">Deploy updates</p>
            <CodeBlock>{`# From local machine
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.env' \\
  -e "ssh -o StrictHostKeyChecking=no" \\
  /Users/mbkesara/Projects/infographedia/ \\
  root@167.86.81.161:/home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp/

# On server
pnpm install --frozen-lockfile && pnpm build && pm2 restart infographedia`}</CodeBlock>

            <p className="text-xs font-medium text-neutral-400 mt-4 mb-2">Useful commands</p>
            <CodeBlock>{`pm2 logs infographedia --lines 50  # View logs
pm2 restart infographedia          # Restart
npx payload migrate                # Apply DB migrations`}</CodeBlock>
          </Card>
        </section>

      </div>
    </div>
  )
}

export default function GuidePage() {
  return (
    <AdminGuard>
      <GuideContent />
    </AdminGuard>
  )
}
