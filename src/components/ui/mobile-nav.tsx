'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { useModal } from '@/components/modals/modal-provider'
import { useAuth } from '@/hooks/use-auth'

export function MobileNav() {
  const pathname = usePathname()
  const { openCreate } = useModal()
  const { user } = useAuth()

  const profileHref = user ? `/profile/${user.username}` : '/login'

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="md:hidden fixed bottom-0 w-full z-40 px-4 pb-6 pt-2">
      <GlassPanel as="nav" className="flex items-center justify-around p-3 rounded-2xl">
        <Link
          href="/"
          className={`p-2 rounded-xl transition-all ${
            isActive('/') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <Home className="w-6 h-6" />
        </Link>

        <Link
          href="/search"
          className={`p-2 rounded-xl transition-all ${
            isActive('/search') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <Search className="w-6 h-6" />
        </Link>

        <button
          onClick={openCreate}
          className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-transform shadow-lg"
        >
          <PlusSquare className="w-6 h-6" />
        </button>

        <Link
          href="/activity"
          className={`p-2 rounded-xl transition-all ${
            isActive('/activity') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <Heart className="w-6 h-6" />
        </Link>

        <Link
          href={profileHref}
          className={`p-2 rounded-xl transition-all ${
            isActive('/profile') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <User className="w-6 h-6" />
        </Link>
      </GlassPanel>
    </div>
  )
}
