'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create account
      const createRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim(),
        }),
      })
      const createData = await createRes.json()

      if (!createRes.ok) {
        setError(createData.errors?.[0]?.message ?? 'Registration failed')
        setIsSubmitting(false)
        return
      }

      // Auto-login
      const loginRes = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const loginData = await loginRes.json()

      if (loginRes.ok && loginData.user) {
        router.push('/')
      } else {
        // Account created but login failed — redirect to login
        router.push('/login')
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
        Create your account
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          autoFocus
          minLength={3}
          maxLength={30}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
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
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
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
          disabled={isSubmitting || !username.trim() || !email.trim() || !password || !confirmPassword}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="text-xs text-neutral-500 text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
