'use client'

import { Sparkles, PlusSquare } from 'lucide-react'
import { Feed } from '@/components/feed/feed'
import { useModal } from '@/components/modals/modal-provider'

export default function HomePage() {
  const { openCreate } = useModal()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold tracking-tight">Infographedia</h1>
        </div>
        <button onClick={openCreate} className="p-2 text-neutral-300 hover:text-white transition-colors">
          <PlusSquare className="w-6 h-6" />
        </button>
      </header>

      {/* Feed */}
      <div className="pt-16 md:pt-4 px-0">
        <Feed />
      </div>
    </div>
  )
}
