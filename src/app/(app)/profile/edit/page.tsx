'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useAuth } from '@/hooks/use-auth'

function EditProfileForm() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setBio(user.bio ?? '')
    }
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !username.trim()) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          bio: bio.trim() || null,
        }),
      })

      if (res.ok) {
        await refreshUser()
        setSuccess(true)
        setTimeout(() => {
          router.push(`/profile/${username.trim()}`)
        }, 1000)
      } else {
        const data = await res.json()
        setError(data.errors?.[0]?.message ?? 'Failed to save')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
        </button>
        <h1 className="text-sm font-semibold text-white">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 resize-none"
          />
          <p className="text-[10px] text-neutral-600 text-right">{bio.length}/300</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-emerald-300">Profile updated!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving || !username.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Save changes'
          )}
        </button>
      </form>
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <EditProfileForm />
    </AuthGuard>
  )
}
