import { type ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'nav' | 'aside' | 'section' | 'article'
}

export function GlassPanel({
  children,
  className = '',
  as: Component = 'div',
}: GlassPanelProps) {
  return (
    <Component
      className={`bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl ${className}`}
    >
      {children}
    </Component>
  )
}
