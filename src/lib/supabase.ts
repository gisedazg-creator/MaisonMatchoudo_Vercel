// Supabase client — creates from env vars or localStorage config
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  // Priority 1: localStorage config (user entered in settings)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('matchoudo_supabase_config')
      if (stored) {
        const cfg = JSON.parse(stored)
        if (cfg.url && cfg.anonKey) return cfg
      }
    } catch { /* ignore */ }
  }
  // Priority 2: Environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey }
  return null
}

export function setSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem('matchoudo_supabase_config', JSON.stringify({ url, anonKey }))
  supabaseInstance = null // reset so it re-creates
}

export function clearSupabaseConfig() {
  localStorage.removeItem('matchoudo_supabase_config')
  supabaseInstance = null
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig()
  if (!cfg) return null
  if (!supabaseInstance) {
    supabaseInstance = createClient(cfg.url, cfg.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null
}
