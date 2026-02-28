'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

interface AuthUser {
  id: number
  email: string
  username: string
  avatar?: { url: string } | null
  bio?: string | null
  role?: 'admin' | 'user'
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const parseUser = (data: Record<string, unknown>): AuthUser => ({
    id: data.id as number,
    email: data.email as string,
    username: data.username as string,
    avatar: typeof data.avatar === 'object' && data.avatar !== null && 'url' in data.avatar
      ? { url: (data.avatar as { url: string }).url }
      : null,
    bio: (data.bio as string) ?? null,
    role: (data.role as 'admin' | 'user') ?? 'user',
  })

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(parseUser(data.user))
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  // Check session on mount
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(parseUser(data.user))
        return { success: true }
      }
      return {
        success: false,
        error: data.errors?.[0]?.message ?? 'Invalid credentials',
      }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  const register = useCallback(async (email: string, password: string, username: string) => {
    try {
      // Create account
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.errors?.[0]?.message ?? 'Registration failed'
        return { success: false, error: msg }
      }
      // Auto-login after registration
      return login(email, password)
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [login])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
