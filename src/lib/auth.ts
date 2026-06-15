// Auth utilities — Supabase Auth as primary, mock/local auth as fallback
import { getSupabaseClient, isSupabaseConfigured } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

// Simple hash for mock auth (not cryptographically secure, demo only)
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str + 'matchoudo_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Session Management ──────────────────────────────────
function setSession(user: AuthUser) {
  localStorage.setItem('matchoudo_session', JSON.stringify(user))
  // Also set a cookie for API routes
  document.cookie = `matchoudo_user_email=${encodeURIComponent(user.email)}; path=/; max-age=${60 * 60 * 24 * 30}`
  document.cookie = `matchoudo_user_id=${encodeURIComponent(user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`
}

function clearSession() {
  localStorage.removeItem('matchoudo_session')
  document.cookie = 'matchoudo_user_email=; path=/; max-age=0'
  document.cookie = 'matchoudo_user_id=; path=/; max-age=0'
}

// ─── Mock Auth (localStorage fallback) ───────────────────
function getMockUsers(): Record<string, { email: string; name: string; passwordHash: string; id: string }> {
  try {
    const stored = localStorage.getItem('matchoudo_mock_users')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setMockUsers(users: Record<string, { email: string; name: string; passwordHash: string; id: string }>) {
  localStorage.setItem('matchoudo_mock_users', JSON.stringify(users))
}

// ─── Public API ──────────────────────────────────────────

export async function signUp(email: string, name: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()!
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      if (error) return { user: null, error: translateSupabaseError(error.message) }
      if (data.user) {
        // Check if email confirmation is required
        if (!data.session && data.user.identities?.length === 0) {
          return { user: null, error: 'Cet email est déjà utilisé' }
        }
        const authUser: AuthUser = {
          id: data.user.id,
          email,
          name: name || data.user.user_metadata?.name || email.split('@')[0],
        }
        setSession(authUser)
        // Also create user in local Prisma DB via API
        try {
          await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, password: 'supabase_managed', supabaseId: data.user.id }),
          })
        } catch { /* local DB creation is optional */ }
        return { user: authUser, error: null }
      }
      return { user: null, error: 'Erreur inconnue lors de l\'inscription' }
    } catch (e: unknown) {
      return { user: null, error: (e as Error).message }
    }
  }

  // Mock auth fallback
  const users = getMockUsers()
  if (users[email]) {
    return { user: null, error: 'Cet email est déjà utilisé' }
  }
  const passwordHash = await simpleHash(password)
  const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  users[email] = { email, name, passwordHash, id }
  setMockUsers(users)

  const authUser: AuthUser = { id, email, name }
  setSession(authUser)
  return { user: authUser, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()!
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { user: null, error: translateSupabaseError(error.message) }
      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email,
          name: data.user.user_metadata?.name || email.split('@')[0],
        }
        setSession(authUser)
        return { user: authUser, error: null }
      }
      return { user: null, error: 'Erreur inconnue lors de la connexion' }
    } catch (e: unknown) {
      return { user: null, error: (e as Error).message }
    }
  }

  // Mock auth fallback
  const users = getMockUsers()
  const user = users[email]
  if (!user) return { user: null, error: 'Email non trouvé' }
  const hash = await simpleHash(password)
  if (hash !== user.passwordHash) return { user: null, error: 'Mot de passe incorrect' }

  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name }
  setSession(authUser)
  return { user: authUser, error: null }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) await supabase.auth.signOut()
    } catch { /* ignore */ }
  }
  clearSession()
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('matchoudo_session')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return null
}

export async function restoreSupabaseSession(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const supabase = getSupabaseClient()!
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const user = data.session.user
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      }
      setSession(authUser)
      return authUser
    }
  } catch { /* ignore */ }
  return null
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
            }
            setSession(authUser)
            callback(authUser)
          } else {
            clearSession()
            callback(null)
          }
        })
        return () => data.subscription.unsubscribe()
      }
    } catch { /* fallback to polling */ }
  }

  // Mock auth: poll localStorage
  const interval = setInterval(() => {
    const user = getCurrentUser()
    callback(user)
  }, 1000)
  callback(getCurrentUser())
  return () => clearInterval(interval)
}

// Helper to get auth headers for API calls
export function getAuthHeaders(): Record<string, string> {
  const user = getCurrentUser()
  if (user) {
    return {
      'x-user-email': encodeURIComponent(user.email),
      'x-user-id': user.id,
    }
  }
  return {}
}

// Translate common Supabase error messages to French
function translateSupabaseError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect'
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter'
  if (msg.includes('User already registered')) return 'Cet email est déjà utilisé'
  if (msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 6 caractères'
  if (msg.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques instants'
  if (msg.includes('Network')) return 'Erreur de connexion au serveur'
  return msg
}
