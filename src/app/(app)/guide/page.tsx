import {
  BookOpen,
  ChevronRight,
  Compass,
  Download,
  GitBranch,
  Heart,
  Lightbulb,
  MessageCircle,
  Play,
  Search,
  Share2,
  Sparkles,
  Bookmark,
} from 'lucide-react'

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
    <div className="rounded-2xl bg-neutral-900/40 border border-white/10 p-5">
      {children}
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-neutral-300 leading-relaxed">
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-1" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Pill({ icon: Icon, label }: { icon: typeof Heart; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <Icon className="w-3.5 h-3.5 text-neutral-400" />
      <span className="text-xs text-neutral-300">{label}</span>
    </div>
  )
}

export default function GuidePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-white" />
          <h1 className="text-sm font-semibold text-white">Infographedia User Guide</h1>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-neutral-400">
            Simple guide
          </span>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-8 max-w-2xl mx-auto w-full pb-24">
        <section>
          <SectionHeader icon={Compass} title="What Infographedia Is" />
          <Card>
            <p className="text-sm text-neutral-300 leading-relaxed mb-4">
              Infographedia is a place where posts are more than pictures. Each post is a living
              infographic you can watch, explore, and remake in your own style.
            </p>
            <BulletList
              items={[
                'You can scroll through visual posts just like a social feed.',
                'You can open any post to see it more clearly and read the source links.',
                'You can create your own infographic from a simple prompt.',
                'You can remix someone else’s post instead of starting from zero.',
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionHeader icon={Play} title="How To Explore Posts" />
          <Card>
            <div className="flex flex-col gap-3">
              <Step n={1} text="Open the home feed and scroll until something catches your eye." />
              <Step n={2} text="Watch the short animation, then tap the post if you want the full view." />
              <Step n={3} text="Read the title, subtitle, and key numbers before sharing it." />
              <Step n={4} text="Check the source links at the bottom if you want to know where the information came from." />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader icon={Sparkles} title="How To Make Your Own Post" />
          <Card>
            <div className="flex flex-col gap-3 mb-4">
              <Step n={1} text="Tap Create." />
              <Step n={2} text="Type what you want to see, like: “Top 5 football clubs by revenue” or “Explain plastic waste with a simple chart.”" />
              <Step n={3} text="Wait while Infographedia builds the post for you." />
              <Step n={4} text="Review the result, the design, and the source links before you publish it." />
            </div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Good prompts feel like this</p>
            <BulletList
              items={[
                '“Compare iPhone and Android market share with a pie chart.”',
                '“Show the top 10 countries by coffee exports.”',
                '“Explain climate change in a timeline.”',
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionHeader icon={GitBranch} title="How To Remix A Post" />
          <Card>
            <div className="flex flex-col gap-3">
              <Step n={1} text="Open any post you like." />
              <Step n={2} text="Tap Iterate." />
              <Step n={3} text="Say what you want to change, like the chart style, color mood, or angle." />
              <Step n={4} text="Infographedia keeps the idea and builds a new version from it." />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader icon={Search} title="How To Check If A Post Feels Trustworthy" />
          <Card>
            <BulletList
              items={[
                'Read the claim slowly. If it sounds huge, double-check it.',
                'Look at the source links and make sure they match the topic.',
                'Open the post detail page if you want a better look at the numbers.',
                'If something feels confusing, do not share it until you understand it.',
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionHeader icon={Heart} title="What The Buttons Do" />
          <Card>
            <div className="flex flex-wrap gap-2 mb-4">
              <Pill icon={Heart} label="Like" />
              <Pill icon={MessageCircle} label="Comment" />
              <Pill icon={Share2} label="Share" />
              <Pill icon={Bookmark} label="Save" />
              <Pill icon={GitBranch} label="Iterate" />
              <Pill icon={Download} label="Download" />
            </div>
            <BulletList
              items={[
                'Like means you enjoyed the post.',
                'Comment lets you react or ask a question.',
                'Share sends the post to someone else.',
                'Save helps you come back to it later.',
                'Iterate lets you make your own version.',
                'Download gives you a copy to keep or post elsewhere.',
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionHeader icon={Lightbulb} title="Tips For Better Results" />
          <Card>
            <BulletList
              items={[
                'Be specific. “Top 5 cities by population” works better than “cities.”',
                'Ask for one clear idea at a time.',
                'If you want a mood, say it simply: “clean,” “warm,” “bold,” or “minimal.”',
                'If you are remixing a post, say exactly what should change and what should stay.',
              ]}
            />
          </Card>
        </section>

        <section>
          <SectionHeader icon={BookOpen} title="Quick Answers" />
          <Card>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-white mb-1">Do I need design skills?</p>
                <p className="text-sm text-neutral-300">No. You just need a clear idea and a simple prompt.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Can I remake someone else’s post?</p>
                <p className="text-sm text-neutral-300">Yes. That is one of the main ideas behind Infographedia.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Can I share or download what I make?</p>
                <p className="text-sm text-neutral-300">Yes. You can share posts and download them when you want a copy.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">What should I do before sharing a post?</p>
                <p className="text-sm text-neutral-300">Read it once, check the sources, and make sure the message is clear.</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
