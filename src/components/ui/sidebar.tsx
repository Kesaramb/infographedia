'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Search,
  PlusSquare,
  Heart,
  User,
  Sparkles,
  LogOut,
  BookOpen,
} from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { GlassButton } from './glass-button'
import { useAuth } from '@/hooks/use-auth'
import { useModal } from '@/components/modals/modal-provider'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const { openCreate } = useModal()

  const profileHref = user ? `/profile/${user.username}` : '/login'

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, href: '/' },
    { key: 'search', label: 'Search', icon: Search, href: '/search' },
    { key: 'create', label: 'Create', icon: PlusSquare, href: null },
    { key: 'activity', label: 'Activity', icon: Heart, href: '/activity' },
    { key: 'profile', label: 'Profile', icon: User, href: profileHref },
  ]

  function isActive(href: string | null): boolean {
    if (!href) return false
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 py-8 px-6 border-r border-white/5">
      {/* Logo */}
      <Link href="/" className="mb-10 px-2 flex items-center gap-3">
        <GlassPanel className="w-10 h-10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </GlassPanel>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Infographedia
        </h1>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-grow">
        {user?.role === 'admin' && (
          <Link
            href="/guide"
            className={`hover:bg-white/10 active:bg-white/5 transition-all duration-200 rounded-xl flex items-center gap-3 p-3 text-neutral-300 hover:text-white ${
              pathname.startsWith('/guide') ? 'bg-white/10 text-white font-medium' : ''
            }`}
          >
            <BookOpen className="w-6 h-6" />
            <span className="hidden lg:block text-lg">Guide</span>
          </Link>
        )}
        {navItems.map((item) =>
          item.href === null ? (
            <GlassButton
              key={item.key}
              active={false}
              onClick={openCreate}
            >
              <item.icon className="w-6 h-6" />
              <span className="hidden lg:block text-lg">{item.label}</span>
            </GlassButton>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              className={`hover:bg-white/10 active:bg-white/5 transition-all duration-200 rounded-xl flex items-center gap-3 p-3 text-neutral-300 hover:text-white ${
                isActive(item.href) ? 'bg-white/10 text-white font-medium' : ''
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="hidden lg:block text-lg">{item.label}</span>
            </Link>
          )
        )}
      </nav>

      {/* User Mini Profile */}
      {!isLoading && user ? (
        <GlassPanel className="mt-auto p-4 rounded-2xl flex items-center gap-3">
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-3 flex-grow min-w-0"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user.avatar?.url ? (
                <img src={user.avatar.url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-neutral-400" />
              )}
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-neutral-500" />
          </button>
        </GlassPanel>
      ) : (
        <Link href="/login">
          <GlassPanel className="mt-auto p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="hidden lg:block flex-grow">
              <p className="text-sm font-semibold text-white">Guest</p>
              <p className="text-xs text-neutral-400">Sign in</p>
            </div>
          </GlassPanel>
        </Link>
      )}
    </aside>
  )
}
