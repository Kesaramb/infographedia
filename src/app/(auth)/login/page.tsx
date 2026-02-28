'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (res.ok && data.user) {
        router.push('/')
      } else {
        setError(data.errors?.[0]?.message ?? 'Invalid email or password')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-8">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Infographedia
        </h1>
      </div>

      <h2 className="text-sm text-neutral-400 text-center mb-6">
        Sign in to your account
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
        />

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email.trim() || !password}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="text-xs text-neutral-500 text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-white hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}
