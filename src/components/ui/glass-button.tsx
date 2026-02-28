import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
  variant?: 'default' | 'primary'
}

export function GlassButton({
  children,
  active = false,
  variant = 'default',
  className = '',
  ...props
}: GlassButtonProps) {
  if (variant === 'primary') {
    return (
      <button
        className={`bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      className={`hover:bg-white/10 active:bg-white/5 transition-all duration-200 rounded-xl flex items-center gap-3 p-3 text-neutral-300 hover:text-white ${
        active ? 'bg-white/10 text-white font-medium' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
