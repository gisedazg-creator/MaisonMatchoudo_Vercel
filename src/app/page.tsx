'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import {
  Home, List, PlusCircle, FileText, Settings, ChevronLeft, ChevronRight,
  Search, TrendingUp, TrendingDown, Droplets, Zap, ArrowUp, ArrowDown,
  Trash2, Edit3, Check, X, Eye, EyeOff, Moon, Sun, Download, Upload,
  Users, Palette, History, LogOut, Info, RefreshCw, ChevronDown,
  Clock, AlertTriangle, CircleCheck, CircleX, AlertCircle,
  Droplet, Bolt, Home as HomeIcon, CloudUpload,
  Menu, Plus, UserPlus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { getCurrentUser, signUp, signIn, signOut, getAuthHeaders, restoreSupabaseSession, type AuthUser } from '@/lib/auth'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const CATS: Record<string, string[]> = {
  'Entrée': ['Salaire','Commerce','Agriculture','Transfert','Autre revenu'],
  'Dépense': ['Alimentation','Logement','Transport','Santé','Éducation','Habillement','Loisirs','Services','Épargne','Autre dépense'],
  'Eau': ['Facture eau'],
  'Électricité': ['Facture électricité'],
}

const STATUS_CFG: Record<string, { cls: string; lbl: string; icon: React.ReactNode }> = {
  payer: { cls: 'sp-payer', lbl: 'À payer', icon: <Clock className="w-3 h-3" /> },
  echeance: { cls: 'sp-echeance', lbl: 'Proche échéance', icon: <AlertCircle className="w-3 h-3" /> },
  retard: { cls: 'sp-retard', lbl: 'En retard', icon: <AlertTriangle className="w-3 h-3" /> },
  payee: { cls: 'sp-payee', lbl: 'Payée', icon: <CircleCheck className="w-3 h-3" /> },
  annulee: { cls: 'sp-annulee', lbl: 'Annulée', icon: <CircleX className="w-3 h-3" /> },
}

const PIE_COLORS = ['#0F6E56','#D85A30','#1A3A5C','#BA7517','#185FA5','#993556','#534AB7','#3B6D11','#A32D2D','#854F0B','#639922','#378ADD']

const DEFAULT_MEMBERS: Member[] = [
  { id: '', name: 'Ayouba Matchoudo', role: 'Membre', color: '#1A3A5C', isAdmin: false },
  { id: '', name: 'Elkana Matchoudo', role: 'Membre', color: '#0F6E56', isAdmin: false },
  { id: '', name: 'Maman Hikma', role: 'Mère', color: '#993556', isAdmin: true },
  { id: '', name: 'Papa Hikma', role: 'Père', color: '#BA7517', isAdmin: true },
]

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface Member {
  id: string
  name: string
  role: string
  color: string
  isAdmin: boolean
  claimedBy?: string | null
}

interface Transaction {
  id: string
  date: string
  label: string
  category: string
  type: string
  amount: number
  note: string
  memberId: string | null
  recurrence: string
  deleted: boolean
  member?: Member | null
}

interface Facture {
  id: string
  type: string
  title: string
  description: string
  mois: string
  echeance: string
  amount: number
  indexVal: number
  reference: string
  statut: string
  memberId: string | null
  member?: Member | null
}

interface AuditLog {
  id: string
  action: string
  label: string
  memberName: string
  createdAt: string
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function fmt(amount: number, currency: string = 'F CFA'): string {
  return amount.toLocaleString('fr-FR') + ' ' + currency
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'Entrée': return <ArrowUp className="w-5 h-5" />
    case 'Dépense': return <ArrowDown className="w-5 h-5" />
    case 'Eau': return <Droplets className="w-5 h-5" />
    case 'Électricité': return <Zap className="w-5 h-5" />
    default: return <ArrowDown className="w-5 h-5" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'Entrée': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-m-teal' }
    case 'Dépense': return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-m-orange' }
    case 'Eau': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-m-blue' }
    case 'Électricité': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-m-gold' }
    default: return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600' }
  }
}

function getFactureIcon(type: string) {
  switch (type) {
    case 'Eau': return <Droplets className="w-5 h-5" />
    case 'Électricité': return <Zap className="w-5 h-5" />
    default: return <FileText className="w-5 h-5" />
  }
}

function getFactureColor(type: string) {
  switch (type) {
    case 'Eau': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-m-blue' }
    case 'Électricité': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-m-gold' }
    default: return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-m-purple' }
  }
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function MaisonMatchoudo() {
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authName, setAuthName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [screen, setScreen] = useState<'accueil' | 'historique' | 'ajouter' | 'factures' | 'parametres'>('accueil')
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [currency, setCurrency] = useState('F CFA')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  // Add form
  const [addType, setAddType] = useState<string>('Entrée')
  const [txForm, setTxForm] = useState({ label: '', category: '', date: new Date().toISOString().slice(0,10), amount: '', note: '', memberId: '', recurrence: 'none' })
  const [facForm, setFacForm] = useState({ title: '', description: '', mois: '', echeance: '', amount: '', indexVal: '', reference: '', statut: 'payer', memberId: '', type: 'Eau' })

  // History filters
  const [histPeriod, setHistPeriod] = useState('all')
  const [histType, setHistType] = useState('all')
  const [histSearch, setHistSearch] = useState('')
  const [histDateFrom, setHistDateFrom] = useState('')
  const [histDateTo, setHistDateTo] = useState('')
  const [showTrash, setShowTrash] = useState(false)

  // Facture filters
  const [facFilter, setFacFilter] = useState('all')

  // Edit dialogs
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingFac, setEditingFac] = useState<Facture | null>(null)
  const [editTxForm, setEditTxForm] = useState({ label: '', amount: '', date: '', category: '', note: '' })
  const [editFacForm, setEditFacForm] = useState({ title: '', amount: '', echeance: '', statut: '', description: '' })

  // Member dialog
  // Member selection
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showMemberSelect, setShowMemberSelect] = useState(false)

  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', role: 'Membre', color: '#1A3A5C', isAdmin: false })

  // Supabase config
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', color: '#0F6E56' })
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((message: string, color = '#0F6E56') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ show: true, message, color })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2500)
  }, [])

  // ─── Auth ─────────────────────────────────────
  const [initialUser] = useState(() => getCurrentUser())
  useEffect(() => {
    const init = async () => {
      // Try to restore Supabase session first
      const supabaseUser = await restoreSupabaseSession()
      if (supabaseUser) {
        setUser(supabaseUser)
      } else if (initialUser) {
        setUser(initialUser)
      }
      // Pre-fill Supabase config from env
      try {
        const { getSupabaseConfig } = await import('@/lib/supabase')
        const cfg = getSupabaseConfig()
        if (cfg) {
          setSupabaseUrl(cfg.url)
          setSupabaseKey(cfg.anonKey)
          setSupabaseConnected(true)
        }
      } catch { /* ignore */ }
      setAuthLoading(false)
    }
    init()
  }, [initialUser])

  const handleSignUp = async () => {
    setAuthError('')
    if (!authEmail || !authPassword) { setAuthError('Email et mot de passe requis'); return }
    if (authMode === 'signup' && authPassword.length < 4) { setAuthError('Mot de passe trop court (min 4)'); return }

    try {
      // Also create in DB via API
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, name: authName || authEmail.split('@')[0], password: authPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setAuthError(data.error || 'Erreur'); return }

      // Also do client-side mock auth
      const result = await signUp(authEmail, authName || authEmail.split('@')[0], authPassword)
      if (result.error) { setAuthError(result.error); return }
      setUser(result.user)

      // Seed demo data
      await fetch('/api/seed', { method: 'POST', headers: { ...getAuthHeaders() } })

      showToast('Compte créé avec succès !')
    } catch (e: unknown) {
      setAuthError((e as Error).message)
    }
  }

  const handleLogin = async () => {
    setAuthError('')
    if (!authEmail || !authPassword) { setAuthError('Email et mot de passe requis'); return }

    try {
      // Try API login first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        // Also set client-side session (Supabase or fallback)
        const signInResult = await signIn(authEmail, authPassword)
        const authUser: AuthUser = { id: data.id, email: data.email, name: data.name }
        // Ensure session is persisted even if Supabase signIn failed
        if (!getCurrentUser()) {
          localStorage.setItem('matchoudo_session', JSON.stringify(authUser))
          document.cookie = `matchoudo_user_email=${encodeURIComponent(authUser.email)}; path=/; max-age=${60 * 60 * 24 * 30}`
          document.cookie = `matchoudo_user_id=${encodeURIComponent(authUser.id)}; path=/; max-age=${60 * 60 * 24 * 30}`
        }
        setUser(authUser)
        showToast('Connexion réussie !')
      } else {
        // Try client-side mock auth
        const result = await signIn(authEmail, authPassword)
        if (result.error) { setAuthError(result.error); return }
        setUser(result.user)

        // Check if user exists in DB, if not create
        const checkRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, name: result.user?.name || authEmail.split('@')[0], password: authPassword }),
        })
        if (checkRes.ok) {
          await fetch('/api/seed', { method: 'POST', headers: { ...getAuthHeaders() } })
        }
        showToast('Connexion réussie !')
      }
    } catch (e: unknown) {
      setAuthError((e as Error).message)
    }
  }

  const handleLogout = () => {
    signOut()
    localStorage.removeItem('matchoudo_user_member')
    setUser(null)
    setTransactions([])
    setFactures([])
    setMembers([])
    setSelectedMemberId(null)
    setShowMemberSelect(false)
  }

  // ─── Data fetching ────────────────────────────
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const loadData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    try {
      const headers = { ...getAuthHeaders() }
      const [txRes, facRes, memRes] = await Promise.all([
        fetch('/api/transactions', { headers }),
        fetch('/api/factures', { headers }),
        fetch('/api/members', { headers }),
      ])
      if (txRes.ok) setTransactions(await txRes.json())
      if (facRes.ok) setFactures(await facRes.json())
      if (memRes.ok) setMembers(await memRes.json())
      setLastSync(new Date())
    } catch { /* ignore */ }
    setDataLoading(false)
  }, [user])

  useEffect(() => {
    if (user) {
      loadData().then(() => {
        // After data loads, check if user has already selected a member
        const savedMemberId = localStorage.getItem('matchoudo_user_member')
        if (savedMemberId) {
          setSelectedMemberId(savedMemberId)
        } else {
          setShowMemberSelect(true)
        }
      })
    }
  }, [user?.id, loadData])

  // ─── Auto-refresh: polling + window focus ─────
  useEffect(() => {
    if (!user || showMemberSelect) return

    // Poll every 15 seconds (only when tab is visible)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        loadData()
      }
    }, 15000)

    // Refresh on window focus (user comes back to tab)
    const handleFocus = () => loadData()
    const handleVisibility = () => {
      if (!document.hidden) loadData()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, showMemberSelect, loadData])

  const handleMemberSelect = async (member: Member) => {
    // Check if member is already claimed by another account
    if (member.claimedBy && member.claimedBy !== user?.email) {
      showToast('Ce profil est déjà pris par un autre compte', '#A32D2D')
      return
    }

    try {
      // Claim the member via API
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ claimMemberId: member.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || 'Erreur lors de la sélection', '#A32D2D')
        return
      }
    } catch {
      // If API fails, still allow selection (offline mode)
    }

    localStorage.setItem('matchoudo_user_member', member.id || member.name)
    setSelectedMemberId(member.id || member.name)
    setShowMemberSelect(false)
    // Update user name to match the selected member
    if (user) {
      setUser({ ...user, name: member.name })
    }
    showToast(`Bienvenue, ${member.name.split(' ')[0]} !`)
  }

  // Load audit logs when on settings screen
  useEffect(() => {
    if (screen === 'parametres' && user) {
      fetch('/api/audit', { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : [])
        .then(d => setAuditLogs(d))
        .catch(() => {})
    }
  }, [screen, user])

  // ─── Computed values ──────────────────────────
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthTransactions = transactions.filter(t => !t.deleted && t.date.startsWith(monthStr))
  const monthIncomes = monthTransactions.filter(t => t.type === 'Entrée').reduce((s, t) => s + t.amount, 0)
  const monthExpenses = monthTransactions.filter(t => t.type === 'Dépense').reduce((s, t) => s + t.amount, 0)
  const monthBalance = monthIncomes - monthExpenses
  const unpaidFactures = factures.filter(f => f.statut === 'payer' || f.statut === 'echeance' || f.statut === 'retard')
  const overdueFactures = factures.filter(f => f.statut === 'retard')
  const monthEpargne = monthTransactions.filter(t => t.category === 'Épargne').reduce((s, t) => s + t.amount, 0)
  const paidUtility = factures.filter(f => f.statut === 'payee' && (f.type === 'Eau' || f.type === 'Électricité')).reduce((s, f) => s + f.amount, 0)

  // ─── Chart data ───────────────────────────────
  const barChartData = Array.from({ length: 6 }, (_, i) => {
    const m = (viewMonth - 5 + i + 12) % 12
    const y = viewMonth - 5 + i < 0 ? viewYear - 1 : viewYear
    const ms = `${y}-${String(m + 1).padStart(2, '0')}`
    const mTx = transactions.filter(t => !t.deleted && t.date.startsWith(ms))
    return {
      name: MONTHS_SHORT[m],
      Revenus: mTx.filter(t => t.type === 'Entrée').reduce((s, t) => s + t.amount, 0),
      Dépenses: mTx.filter(t => t.type === 'Dépense').reduce((s, t) => s + t.amount, 0),
    }
  })

  const expenseByCategory = monthTransactions
    .filter(t => t.type === 'Dépense' && t.category !== 'Épargne')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  // ─── History filtered ─────────────────────────
  const filteredTransactions = transactions.filter(t => {
    if (!t.deleted && histType !== 'trash') {
      // Apply filters
      if (histType !== 'all' && t.type !== histType) return false
      if (histSearch) {
        const s = histSearch.toLowerCase()
        if (!t.label.toLowerCase().includes(s) && !t.category.toLowerCase().includes(s) && !String(t.amount).includes(s)) return false
      }
      if (histPeriod === 'today') {
        const today = new Date().toISOString().slice(0, 10)
        if (t.date !== today) return false
      } else if (histPeriod === 'week') {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        if (t.date < weekAgo || t.date > now.toISOString().slice(0, 10)) return false
      } else if (histPeriod === 'month') {
        if (!t.date.startsWith(monthStr)) return false
      } else if (histPeriod === 'year') {
        if (!t.date.startsWith(String(viewYear))) return false
      } else if (histPeriod === 'custom' && histDateFrom && histDateTo) {
        if (t.date < histDateFrom || t.date > histDateTo) return false
      }
      return true
    }
    return false
  })

  const trashedTransactions = transactions.filter(t => t.deleted)

  // ─── Facture filtered ─────────────────────────
  const filteredFactures = factures.filter(f => {
    if (facFilter === 'all') return true
    if (['Eau', 'Électricité'].includes(facFilter)) return f.type === facFilter
    return f.statut === facFilter
  })

  // ─── Formatters ───────────────────────────────
  const navLabels = [
    { key: 'accueil' as const, icon: Home, label: 'Accueil' },
    { key: 'historique' as const, icon: List, label: 'Historique' },
    { key: 'ajouter' as const, icon: PlusCircle, label: 'Ajouter' },
    { key: 'factures' as const, icon: FileText, label: 'Factures' },
    { key: 'parametres' as const, icon: Settings, label: 'Paramètres' },
  ]

  // ═══════════════════════════════════════════════
  // AUTH SCREEN
  // ═══════════════════════════════════════════════

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-3 border-m-navy border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-gradient p-4 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/[0.03]" />

        <div className="w-full max-w-md animate-slide-up">
          {/* Logo area */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-m-gold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-900/20 animate-bounce-in">
              <span className="text-3xl font-extrabold text-m-navy">M</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Maison Matchoudo</h1>
            <p className="text-sm text-white/60 mt-1">Budget familial intelligent</p>
          </div>

          {/* Form card */}
          <div className="auth-glass rounded-2xl p-6 shadow-2xl">
            <div className="space-y-4">
              <div>
                <Label className="text-foreground/80">Email</Label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="rounded-xl bg-background/50 border-border/50"
                />
              </div>
              {authMode === 'signup' && (
                <div className="animate-slide-up">
                  <Label className="text-foreground/80">Nom</Label>
                  <Input
                    placeholder="Votre nom"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="rounded-xl bg-background/50 border-border/50"
                  />
                </div>
              )}
              <div>
                <Label className="text-foreground/80">Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignUp())}
                    className="rounded-xl bg-background/50 border-border/50 pr-10"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <p className="text-sm text-destructive animate-slide-up">{authError}</p>
              )}

              <Button
                className="w-full rounded-xl bg-gradient-to-r from-m-teal to-m-navy hover:from-m-teal/90 hover:to-m-navy/90 text-white shadow-lg shadow-m-navy/20 h-11 font-semibold"
                onClick={authMode === 'login' ? handleLogin : handleSignUp}
              >
                {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
              </Button>

              <div className="text-center">
                <button
                  className="text-sm text-m-navy dark:text-m-teal font-semibold hover:underline transition-colors"
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }}
                >
                  {authMode === 'login' ? 'Créer un compte' : 'Déjà un compte ? Se connecter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // MEMBER SELECTION SCREEN
  // ═══════════════════════════════════════════════

  if (showMemberSelect && user) {
    const memberList = members.length > 0 ? members : DEFAULT_MEMBERS
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient p-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5" />

        <div className="w-full max-w-sm animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🏠</div>
            <h1 className="text-2xl font-extrabold text-white">Maison Matchoudo</h1>
            <h2 className="text-xl font-bold text-white/90 mt-3">Qui êtes-vous ?</h2>
            <p className="text-sm text-white/60 mt-1">Sélectionnez votre profil familial</p>
          </div>

          {/* Member grid */}
          <div className="grid grid-cols-2 gap-3">
            {memberList.map((member, idx) => {
              const initials = member.name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2)
              const isClaimedByOther = member.claimedBy && member.claimedBy !== user?.email
              return (
                <button
                  key={member.id || idx}
                  className={`member-card rounded-2xl backdrop-blur-md border p-5 flex flex-col items-center text-center group ${
                    isClaimedByOther
                      ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                      : 'bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/20'
                  }`}
                  onClick={() => !isClaimedByOther && handleMemberSelect(member)}
                  disabled={!!isClaimedByOther}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Avatar */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-extrabold text-white mb-3 shadow-lg ${isClaimedByOther ? '' : 'group-hover:scale-110'} transition-transform`}
                    style={{ background: isClaimedByOther ? '#666' : member.color }}
                  >
                    {isClaimedByOther ? '🔒' : initials}
                  </div>
                  {/* Name */}
                  <div className="text-sm font-bold text-white leading-tight">{member.name}</div>
                  {/* Role tag or "Already taken" */}
                  {isClaimedByOther ? (
                    <span className="mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/40">
                      Déjà pris
                    </span>
                  ) : (
                    <span
                      className="mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/90"
                      style={{ background: `${member.color}66` }}
                    >
                      {member.role}
                    </span>
                  )}
                  {!isClaimedByOther && member.isAdmin && (
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-m-gold/20 text-m-gold">
                      Admin
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-white/40 mt-6">
            Ce choix peut être modifié dans les paramètres
          </p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // MAIN APP
  // ═══════════════════════════════════════════════

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  const submitTransaction = async () => {
    if (!txForm.label || !txForm.amount || !txForm.date) {
      showToast('Veuillez remplir les champs requis', '#A32D2D')
      return
    }
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...txForm,
          type: addType,
          amount: txForm.amount,
          memberId: txForm.memberId || null,
        }),
      })
      if (res.ok) {
        showToast('Transaction enregistrée !')
        setTxForm({ label: '', category: '', date: new Date().toISOString().slice(0,10), amount: '', note: '', memberId: '', recurrence: 'none' })
        loadData()
      } else {
        const d = await res.json()
        showToast(d.error || 'Erreur', '#A32D2D')
      }
    } catch {
      showToast('Erreur réseau', '#A32D2D')
    }
  }

  const submitFacture = async () => {
    if (!facForm.title || !facForm.amount) {
      showToast('Veuillez remplir les champs requis', '#A32D2D')
      return
    }
    try {
      const res = await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...facForm,
          amount: facForm.amount,
          indexVal: facForm.indexVal || 0,
          memberId: facForm.memberId || null,
        }),
      })
      if (res.ok) {
        showToast('Facture enregistrée !')
        setFacForm({ title: '', description: '', mois: '', echeance: '', amount: '', indexVal: '', reference: '', statut: 'payer', memberId: '', type: 'Eau' })
        loadData()
      } else {
        const d = await res.json()
        showToast(d.error || 'Erreur', '#A32D2D')
      }
    } catch {
      showToast('Erreur réseau', '#A32D2D')
    }
  }

  const deleteTransaction = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    showToast('Transaction supprimée')
    loadData()
  }

  const restoreTransaction = async (id: string) => {
    await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ deleted: false }),
    })
    showToast('Transaction restaurée')
    loadData()
  }

  const updateTransaction = async () => {
    if (!editingTx) return
    await fetch(`/api/transactions/${editingTx.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(editTxForm),
    })
    setEditingTx(null)
    showToast('Transaction modifiée')
    loadData()
  }

  const updateFacture = async () => {
    if (!editingFac) return
    await fetch(`/api/factures/${editingFac.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(editFacForm),
    })
    setEditingFac(null)
    showToast('Facture modifiée')
    loadData()
  }

  const deleteFacture = async (id: string) => {
    await fetch(`/api/factures/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    showToast('Facture supprimée')
    loadData()
  }

  const addMember = async () => {
    if (!newMember.name) return
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newMember),
    })
    setShowAddMember(false)
    setNewMember({ name: '', role: 'Membre', color: '#1A3A5C', isAdmin: false })
    showToast('Membre ajouté')
    loadData()
  }

  const exportCSV = (type: 'transactions' | 'factures') => {
    const data = type === 'transactions' ? transactions.filter(t => !t.deleted) : factures
    if (data.length === 0) { showToast('Aucune donnée à exporter', '#BA7517'); return }

    let csv = ''
    if (type === 'transactions') {
      csv = 'Date,Désignation,Catégorie,Type,Montant,Note\n'
      data.forEach((t: Transaction) => {
        csv += `${t.date},"${t.label}",${t.category},${t.type},${t.amount},"${t.note}"\n`
      })
    } else {
      csv = 'Type,Titre,Mois,Échéance,Montant,Statut\n'
      data.forEach((f: Facture) => {
        csv += `${f.type},"${f.title}",${f.mois},${f.echeance},${f.amount},${f.statut}\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `matchoudo_${type}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Export CSV téléchargé')
  }

  const exportJSON = () => {
    const data = { transactions, factures, members, exportDate: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `matchoudo_backup_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Sauvegarde JSON téléchargée')
  }

  const importJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        // Restore members first, then transactions and factures
        showToast('Restauration en cours...')
        // Simple: just re-import transactions
        if (data.transactions) {
          for (const tx of data.transactions) {
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({ date: tx.date, label: tx.label, category: tx.category, type: tx.type, amount: tx.amount, note: tx.note || '', memberId: tx.memberId || null, recurrence: tx.recurrence === 'none' ? '' : (tx.recurrence || '') }),
            })
          }
        }
        if (data.factures) {
          for (const fac of data.factures) {
            await fetch('/api/factures', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({ type: fac.type, title: fac.title, description: fac.description || '', mois: fac.mois || '', echeance: fac.echeance || '', amount: fac.amount, indexVal: fac.indexVal || 0, reference: fac.reference || '', statut: fac.statut || 'payer', memberId: fac.memberId || null }),
            })
          }
        }
        loadData()
        showToast('Restauration terminée !')
      } catch {
        showToast('Fichier JSON invalide', '#A32D2D')
      }
    }
    input.click()
  }

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx)
    setEditTxForm({ label: tx.label, amount: String(tx.amount), date: tx.date, category: tx.category, note: tx.note })
  }

  const openEditFac = (fac: Facture) => {
    setEditingFac(fac)
    setEditFacForm({ title: fac.title, amount: String(fac.amount), echeance: fac.echeance, statut: fac.statut, description: fac.description })
  }

  // ═══════════════════════════════════════════════
  // RENDER SCREENS
  // ═══════════════════════════════════════════════

  // ─── ACCUEIL ──────────────────────────────────
  const renderAccueil = () => (
    <div className="space-y-3 screen-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="kpi-teal kpi-accent-teal rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Revenus du mois</div>
          </div>
          <div className="text-2xl font-extrabold">{fmt(monthIncomes, currency)}</div>
          <div className="text-[10px] mt-1 opacity-65">{monthTransactions.filter(t => t.type === 'Entrée').length} transactions</div>
        </div>
        <div className="kpi-orange kpi-accent-orange rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Dépenses du mois</div>
          </div>
          <div className="text-2xl font-extrabold">{fmt(monthExpenses, currency)}</div>
          <div className="text-[10px] mt-1 opacity-65">{monthTransactions.filter(t => t.type === 'Dépense').length} transactions</div>
        </div>
        <div className="kpi-navy kpi-accent-navy rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUp className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Solde total</div>
          </div>
          <div className="text-2xl font-extrabold">{fmt(monthBalance, currency)}</div>
          <div className="text-[10px] mt-1 opacity-65">Cumulé</div>
        </div>
        <div className="kpi-red kpi-accent-red rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Factures à payer</div>
          </div>
          <div className="text-2xl font-extrabold">{unpaidFactures.length}</div>
          <div className="text-[10px] mt-1 opacity-65">dont {overdueFactures.length} en retard</div>
        </div>
        <div className="kpi-purple kpi-accent-purple rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Épargne</div>
          </div>
          <div className="text-2xl font-extrabold">{fmt(monthEpargne, currency)}</div>
          <div className="text-[10px] mt-1 opacity-65">Ce mois</div>
        </div>
        <div className="kpi-blue kpi-accent-blue rounded-2xl p-4 border card-lift shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 opacity-60" />
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Eau + Électricité</div>
          </div>
          <div className="text-2xl font-extrabold">{fmt(paidUtility, currency)}</div>
          <div className="text-[10px] mt-1 opacity-65">Factures payées</div>
        </div>
      </div>

      {/* Month Navigator + Bar Chart */}
      <Card className="rounded-2xl shadow-sm card-lift">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value: number) => fmt(value, currency)}
                  contentStyle={{ borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #eee' }}
                />
                <Bar dataKey="Revenus" fill="#0F6E56" radius={[6,6,0,0]} />
                <Bar dataKey="Dépenses" fill="#D85A30" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card className="rounded-2xl shadow-sm card-lift">
          <CardContent className="pt-4 pb-3">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Dépenses par catégorie
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value, currency)} contentStyle={{ borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #eee' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last transactions */}
      <Card className="rounded-2xl shadow-sm card-lift">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dernières transactions</h3>
            <button onClick={() => setScreen('historique')} className="text-xs font-semibold text-m-navy dark:text-m-teal hover:underline">
              Tout voir
            </button>
          </div>
          {monthTransactions.slice(0, 5).map(tx => {
            const tc = getTypeColor(tx.type)
            return (
              <div key={tx.id} className="tx-item flex items-center gap-2.5 py-2.5 border-b last:border-b-0 rounded-lg px-1 cursor-pointer" onClick={() => openEditTx(tx)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tc.bg} ${tc.text}`}>
                  {getTypeIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{tx.category} · {fmtDate(tx.date)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${tc.text}`}>{tx.type === 'Entrée' ? '+' : '-'}{fmt(tx.amount, currency)}</div>
                </div>
              </div>
            )
          })}
          {monthTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucune transaction ce mois</div>
          )}
        </CardContent>
      </Card>

      {/* Urgent factures */}
      {unpaidFactures.length > 0 && (
        <Card className="rounded-2xl shadow-sm card-lift">
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Factures urgentes</h3>
              <button onClick={() => setScreen('factures')} className="text-xs font-semibold text-m-navy dark:text-m-teal hover:underline">
                Tout voir
              </button>
            </div>
            {unpaidFactures.slice(0, 3).map(f => {
              const fc = getFactureColor(f.type)
              const sc = STATUS_CFG[f.statut]
              return (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${fc.bg} ${fc.text}`}>
                    {getFactureIcon(f.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{f.title}</div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc?.cls}`}>
                      {sc?.icon} {sc?.lbl}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-m-orange">{fmt(f.amount, currency)}</div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ─── HISTORIQUE ───────────────────────────────
  const renderHistorique = () => (
    <div className="space-y-3 screen-fade-in">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom, catégorie, montant…"
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
        />
      </div>

      {/* Period chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: 'Tout' },
          { key: 'today', label: "Aujourd'hui" },
          { key: 'week', label: 'Cette semaine' },
          { key: 'month', label: 'Ce mois' },
          { key: 'year', label: 'Cette année' },
          { key: 'custom', label: 'Période…' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setHistPeriod(p.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              histPeriod === p.key
                ? 'bg-m-navy text-white border-m-navy dark:bg-m-teal dark:border-m-teal'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {histPeriod === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Du</Label>
            <Input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Au</Label>
            <Input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Type chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: 'Tous types' },
          { key: 'Entrée', label: 'Entrées' },
          { key: 'Dépense', label: 'Dépenses' },
          { key: 'Eau', label: 'Eau' },
          { key: 'Électricité', label: 'Électricité' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setHistType(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              histType === t.key
                ? 'bg-m-navy text-white border-m-navy dark:bg-m-teal dark:border-m-teal'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-3 pb-1">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucune transaction trouvée</div>
          ) : (
            filteredTransactions.map(tx => {
              const tc = getTypeColor(tx.type)
              return (
                <div key={tx.id} className="tx-item flex items-center gap-2.5 py-2.5 border-b last:border-b-0 cursor-pointer rounded-lg px-1" onClick={() => openEditTx(tx)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tc.bg} ${tc.text}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{tx.category} · {fmtDate(tx.date)}{tx.member?.name ? ` · ${tx.member.name}` : ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${tc.text}`}>{tx.type === 'Entrée' ? '+' : '-'}{fmt(tx.amount, currency)}</div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Trash */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Corbeille ({trashedTransactions.length})
          </h3>
          <button onClick={() => setShowTrash(!showTrash)} className="text-xs font-semibold text-m-navy dark:text-m-teal">
            {showTrash ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {showTrash && trashedTransactions.length > 0 && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-3 pb-1">
              {trashedTransactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-2 py-2 border-b last:border-b-0 opacity-60">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate line-through">{tx.label}</div>
                    <div className="text-[11px] text-muted-foreground">{fmt(tx.amount, currency)}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => restoreTransaction(tx.id)}>
                    <Check className="w-3 h-3 mr-1" /> Restaurer
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  // ─── AJOUTER ──────────────────────────────────
  const renderAjouter = () => (
    <div className="space-y-3 screen-fade-in">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-4">
          {/* Type tabs */}
          <div className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden border border-border mb-4">
            {[
              { key: 'Entrée', label: 'Entrée', icon: <ArrowUp className="w-4 h-4" />, active: 'bg-m-teal text-white' },
              { key: 'Dépense', label: 'Dépense', icon: <ArrowDown className="w-4 h-4" />, active: 'bg-m-orange text-white' },
              { key: 'Eau', label: 'Eau', icon: <Droplets className="w-4 h-4" />, active: 'bg-m-blue text-white' },
              { key: 'Électricité', label: 'Élec.', icon: <Zap className="w-4 h-4" />, active: 'bg-m-gold text-white' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setAddType(t.key); setTxForm(f => ({ ...f, category: (CATS[t.key] || [])[0] || '' })) }}
                className={`py-2.5 flex flex-col items-center gap-1 text-[11px] font-semibold border-r border-border last:border-r-0 transition-colors ${
                  addType === t.key ? t.active : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Transaction form (for Entrée/Dépense) */}
          {(addType === 'Entrée' || addType === 'Dépense') && (
            <div className="space-y-3">
              <div>
                <Label>Désignation *</Label>
                <Input
                  placeholder="Ex: Salaire, Courses, Loyer…"
                  value={txForm.label}
                  onChange={e => setTxForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Catégorie *</Label>
                  <Select value={txForm.category} onValueChange={v => setTxForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                    <SelectContent>
                      {(CATS[addType] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Montant ({currency}) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Note</Label>
                <Input
                  placeholder="Commentaire…"
                  value={txForm.note}
                  onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div>
                <Label>Saisie par</Label>
                <Select value={txForm.memberId} onValueChange={v => setTxForm(f => ({ ...f, memberId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Récurrence</Label>
                <Select value={txForm.recurrence} onValueChange={v => setTxForm(f => ({ ...f, recurrence: v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="yearly">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-m-teal hover:bg-m-teal/90 text-white" onClick={submitTransaction}>
                <Check className="w-4 h-4 mr-1" /> Enregistrer
              </Button>
            </div>
          )}

          {/* Facture form (for Eau/Électricité) */}
          {(addType === 'Eau' || addType === 'Électricité') && (
            <div className="space-y-3">
              <div>
                <Label>Titre *</Label>
                <Input
                  placeholder="Ex: Facture eau juin 2026"
                  value={facForm.title}
                  onChange={e => setFacForm(f => ({ ...f, title: e.target.value, type: addType }))}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Détails de la facture…"
                  value={facForm.description}
                  onChange={e => setFacForm(f => ({ ...f, description: e.target.value, type: addType }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Mois facture</Label>
                  <Input type="month" value={facForm.mois} onChange={e => setFacForm(f => ({ ...f, mois: e.target.value }))} />
                </div>
                <div>
                  <Label>Date limite</Label>
                  <Input type="date" value={facForm.echeance} onChange={e => setFacForm(f => ({ ...f, echeance: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Montant *</Label>
                  <Input type="number" placeholder="0" value={facForm.amount} onChange={e => setFacForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Index {addType === 'Eau' ? '(m³)' : '(kWh)'}</Label>
                  <Input type="number" placeholder="0" value={facForm.indexVal} onChange={e => setFacForm(f => ({ ...f, indexVal: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>N° référence</Label>
                  <Input placeholder="FAC-2026-001" value={facForm.reference} onChange={e => setFacForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={facForm.statut} onValueChange={v => setFacForm(f => ({ ...f, statut: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payer">À payer</SelectItem>
                      <SelectItem value="echeance">Proche échéance</SelectItem>
                      <SelectItem value="retard">En retard</SelectItem>
                      <SelectItem value="payee">Payée</SelectItem>
                      <SelectItem value="annulee">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Saisie par</Label>
                <Select value={facForm.memberId} onValueChange={v => setFacForm(f => ({ ...f, memberId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-m-blue hover:bg-m-blue/90 text-white" onClick={submitFacture}>
                <FileText className="w-4 h-4 mr-1" /> Enregistrer la facture
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // ─── FACTURES ─────────────────────────────────
  const renderFactures = () => {
    const totalEau = factures.filter(f => f.type === 'Eau').reduce((s, f) => s + f.amount, 0)
    const totalElec = factures.filter(f => f.type === 'Électricité').reduce((s, f) => s + f.amount, 0)
    const unpaid = factures.filter(f => f.statut !== 'payee' && f.statut !== 'annulee')
    const paid = factures.filter(f => f.statut === 'payee')

    return (
      <div className="space-y-3 screen-fade-in">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="kpi-blue kpi-accent-blue rounded-2xl p-4 border card-lift shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className="w-3.5 h-3.5 opacity-60" />
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Total Eau</div>
            </div>
            <div className="text-2xl font-extrabold">{fmt(totalEau, currency)}</div>
            <div className="text-[10px] mt-1 opacity-65">{factures.filter(f => f.type === 'Eau').length} factures</div>
          </div>
          <div className="kpi-gold kpi-accent-gold rounded-2xl p-4 border card-lift shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 opacity-60" />
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Total Électricité</div>
            </div>
            <div className="text-2xl font-extrabold">{fmt(totalElec, currency)}</div>
            <div className="text-[10px] mt-1 opacity-65">{factures.filter(f => f.type === 'Électricité').length} factures</div>
          </div>
          <div className="kpi-red kpi-accent-red rounded-2xl p-4 border card-lift shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 opacity-60" />
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Non payées</div>
            </div>
            <div className="text-2xl font-extrabold">{unpaid.length}</div>
            <div className="text-[10px] mt-1 opacity-65">Montant total</div>
          </div>
          <div className="kpi-teal kpi-accent-teal rounded-2xl p-4 border card-lift shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <CircleCheck className="w-3.5 h-3.5 opacity-60" />
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Payées</div>
            </div>
            <div className="text-2xl font-extrabold">{paid.length}</div>
            <div className="text-[10px] mt-1 opacity-65">Ce mois</div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'Eau', label: '💧 Eau' },
            { key: 'Électricité', label: '⚡ Électricité' },
            { key: 'payer', label: 'À payer' },
            { key: 'retard', label: 'En retard' },
            { key: 'payee', label: 'Payées' },
            { key: 'annulee', label: 'Annulées' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFacFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                facFilter === f.key
                  ? 'bg-m-navy text-white border-m-navy dark:bg-m-teal dark:border-m-teal'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Facture cards */}
        {filteredFactures.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune facture trouvée</p>
          </div>
        ) : (
          filteredFactures.map(f => {
            const fc = getFactureColor(f.type)
            const sc = STATUS_CFG[f.statut]
            return (
              <Card key={f.id} className="rounded-2xl shadow-sm card-lift">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${fc.bg} ${fc.text}`}>
                      {getFactureIcon(f.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{f.title}</div>
                      {f.description && <div className="text-[11px] text-muted-foreground mt-0.5">{f.description}</div>}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${sc?.cls || ''}`}>
                        {sc?.icon} {sc?.lbl}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-m-orange">{fmt(f.amount, currency)}</div>
                      {f.echeance && <div className="text-[10px] text-muted-foreground mt-0.5">Échéance: {fmtDate(f.echeance)}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    {f.statut !== 'payee' && (
                      <Button
                        size="sm"
                        className="h-7 text-[11px] bg-m-teal hover:bg-m-teal/90 text-white"
                        onClick={async () => {
                          await fetch(`/api/factures/${f.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                            body: JSON.stringify({ statut: 'payee' }),
                          })
                          showToast('Facture marquée payée')
                          loadData()
                        }}
                      >
                        <CircleCheck className="w-3 h-3 mr-1" /> Payer
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => openEditFac(f)}>
                      <Edit3 className="w-3 h-3 mr-1" /> Modifier
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive" onClick={() => deleteFacture(f.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    )
  }

  // ─── PARAMÈTRES ───────────────────────────────
  const renderParametres = () => (
    <div className="space-y-3 screen-fade-in">
      {/* Members */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Membres de la famille
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white shrink-0" style={{ background: m.color }}>
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  {m.name}
                  {m.isAdmin && <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-m-gold">Admin</span>}
                </div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
            </div>
          ))}
          <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full mt-3" size="sm">
                <UserPlus className="w-4 h-4 mr-1" /> Ajouter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un membre</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={newMember.name} onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Rôle</Label>
                    <Select value={newMember.role} onValueChange={v => setNewMember(m => ({ ...m, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Membre">Membre</SelectItem>
                        <SelectItem value="Père">Père</SelectItem>
                        <SelectItem value="Mère">Mère</SelectItem>
                        <SelectItem value="Fils">Fils</SelectItem>
                        <SelectItem value="Fille">Fille</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Couleur</Label>
                    <Input type="color" value={newMember.color} onChange={e => setNewMember(m => ({ ...m, color: e.target.value }))} className="h-9" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newMember.isAdmin} onCheckedChange={v => setNewMember(m => ({ ...m, isAdmin: v }))} />
                  <Label>Administrateur</Label>
                </div>
                <Button className="w-full bg-m-navy hover:bg-m-navy/90 dark:bg-m-teal dark:hover:bg-m-teal/90" onClick={addMember}>
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> Apparence
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Thème sombre
              </div>
              <div className="text-[11px] text-muted-foreground">Basculer le mode nuit</div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={v => setTheme(v ? 'dark' : 'light')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <span className="text-base">₣</span> Devise
              </div>
            </div>
            <Select value={currency} onValueChange={v => setCurrency(v)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F CFA">F CFA</SelectItem>
                <SelectItem value="€">Euro (€)</SelectItem>
                <SelectItem value="$">Dollar ($)</SelectItem>
                <SelectItem value="XOF">XOF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export des données
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV('transactions')}>
              <Download className="w-3 h-3 mr-1" /> CSV Transactions
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV('factures')}>
              <Download className="w-3 h-3 mr-1" /> CSV Factures
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON}>
              <Download className="w-3 h-3 mr-1" /> Sauvegarde JSON
            </Button>
            <Button variant="outline" size="sm" onClick={importJSON}>
              <Upload className="w-3 h-3 mr-1" /> Restaurer JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Config */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Configuration Supabase
            {supabaseConnected && (
              <Badge variant="default" className="ml-auto text-[9px] bg-emerald-600 hover:bg-emerald-600">
                <CircleCheck className="w-2.5 h-2.5 mr-0.5" /> Connecté
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">URL du projet</Label>
              <Input
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={e => { setSupabaseUrl(e.target.value); setSupabaseConnected(false) }}
              />
            </div>
            <div>
              <Label className="text-xs">Clé Anon (publique)</Label>
              <Input
                placeholder="eyJhbGciOiJIUzI1NiIs…"
                type="password"
                value={supabaseKey}
                onChange={e => { setSupabaseKey(e.target.value); setSupabaseConnected(false) }}
              />
            </div>
            <Button
              size="sm"
              className="w-full bg-m-navy hover:bg-m-navy/90 dark:bg-m-teal dark:hover:bg-m-teal/90"
              onClick={async () => {
                if (supabaseUrl && supabaseKey) {
                  const { setSupabaseConfig } = await import('@/lib/supabase')
                  setSupabaseConfig(supabaseUrl, supabaseKey)
                  setSupabaseConnected(true)
                  showToast('Configuration Supabase enregistrée ✓')
                } else {
                  showToast('Veuillez remplir les deux champs', '#A32D2D')
                }
              }}
            >
              Enregistrer la configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Journal d&apos;audit
          </div>
          <div className="max-h-64 overflow-y-auto custom-scroll">
            {auditLogs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Aucune entrée</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex gap-2.5 py-2 border-b last:border-b-0 text-xs">
                  <div className="w-7 h-7 rounded-full bg-m-navy/10 dark:bg-m-teal/20 flex items-center justify-center shrink-0">
                    <History className="w-3 h-3 text-m-navy dark:text-m-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{log.action.replace(/_/g, ' ')}</div>
                    <div className="text-muted-foreground text-[10px]">{log.label} · {new Date(log.createdAt).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> À propos
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">Maison Matchoudo</b> v3.0<br />
            Application de gestion de budget familial<br />
            Membres : Ayouba · Elkana · Maman Hikma · Papa Hikma<br />
            <span className="text-muted-foreground/60">v3.0 · Budget Familial</span>
          </div>
          {selectedMemberId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => {
                localStorage.removeItem('matchoudo_user_member')
                setSelectedMemberId(null)
                setShowMemberSelect(true)
              }}
            >
              <Users className="w-4 h-4 mr-1" /> Changer de profil
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" /> Déconnexion
      </Button>

      {/* Delete Account */}
      <div className="mt-4 pt-4 border-t border-destructive/10">
        <Button
          variant="outline"
          className="w-full border-destructive/20 text-destructive/70 hover:bg-destructive/10 hover:text-destructive text-xs"
          onClick={async () => {
            if (!confirm('⚠️ Supprimer votre compte ? Toutes vos données (transactions, factures, membres) seront définitivement effacées.')) return
            if (!confirm('Êtes-vous vraiment sûr ? Cette action est irréversible.')) return
            try {
              const res = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: getAuthHeaders(),
              })
              if (res.ok) {
                showToast('Compte supprimé', '#0F6E56')
                handleLogout()
              } else {
                const data = await res.json()
                showToast(data.error || 'Erreur lors de la suppression', '#A32D2D')
              }
            } catch {
              showToast('Erreur de connexion', '#A32D2D')
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Supprimer mon compte
        </Button>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 header-gradient text-white h-14 flex items-center justify-between px-3.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-m-gold flex items-center justify-center font-extrabold text-lg text-m-navy shadow-sm">M</div>
          <div>
            <div className="text-sm font-bold leading-tight">Maison Matchoudo</div>
            <div className="text-[10px] text-white/50 leading-none">Budget familial</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 text-[10px] font-medium hover:bg-white/20 transition-colors"
            onClick={loadData}
            title={lastSync ? `Dernière sync: ${lastSync.toLocaleTimeString('fr-FR')}` : 'Cliquer pour synchroniser'}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${dataLoading ? 'bg-m-gold animate-pulse' : 'bg-emerald-400'}`} />
            {dataLoading ? 'Sync…' : lastSync ? `Sync ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'En ligne'}
          </button>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2 py-1 ring-1 ring-white/10">
            <div className="w-6 h-6 rounded-full bg-m-gold flex items-center justify-center text-[10px] font-bold text-m-navy">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] font-medium max-w-20 truncate">{user.name || user.email.split('@')[0]}</span>
          </div>
        </div>
      </header>

      {/* TOAST */}
      {toast.show && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-xl transition-all animate-slide-up"
          style={{ background: toast.color }}
        >
          {toast.message}
        </div>
      )}

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto pb-20 custom-scroll bg-warm-gradient-light dot-pattern">
        <div className="max-w-lg mx-auto px-3.5 py-4">
          {screen === 'accueil' && renderAccueil()}
          {screen === 'historique' && renderHistorique()}
          {screen === 'ajouter' && renderAjouter()}
          {screen === 'factures' && renderFactures()}
          {screen === 'parametres' && renderParametres()}
        </div>
      </main>

      {/* BOTTOM NAV */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex pb-[env(safe-area-inset-bottom)] ${screen === 'accueil' ? 'nav-active-glow' : 'shadow-[0_-2px_16px_rgba(0,0,0,0.06)]'}`}>
        {navLabels.map(n => {
          const Icon = n.icon
          const isActive = screen === n.key
          return (
            <button
              key={n.key}
              onClick={() => setScreen(n.key)}
              className={`nav-pill flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
                isActive ? 'text-m-navy dark:text-m-teal' : 'text-muted-foreground'
              } ${isActive ? 'active' : ''}`}
            >
              <div className={`px-3 py-0.5 rounded-full transition-all ${isActive ? 'bg-m-navy/10 dark:bg-m-teal/10' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'font-bold' : ''}`}>{n.label}</span>
              {n.key === 'factures' && unpaidFactures.length > 0 && (
                <span className="absolute top-1 right-1/2 mr-[-18px] bg-m-red text-white rounded-full text-[9px] font-bold px-1 min-w-4 text-center">
                  {unpaidFactures.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTx} onOpenChange={v => !v && setEditingTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Désignation</Label>
              <Input value={editTxForm.label} onChange={e => setEditTxForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Montant</Label>
                <Input type="number" value={editTxForm.amount} onChange={e => setEditTxForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editTxForm.date} onChange={e => setEditTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={editTxForm.category} onValueChange={v => setEditTxForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(CATS).flat().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={editTxForm.note} onChange={e => setEditTxForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-m-navy hover:bg-m-navy/90 dark:bg-m-teal dark:hover:bg-m-teal/90" onClick={updateTransaction}>
                <Check className="w-4 h-4 mr-1" /> Enregistrer
              </Button>
              <Button variant="destructive" size="icon" onClick={() => { if (editingTx) deleteTransaction(editingTx.id); setEditingTx(null) }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Facture Dialog */}
      <Dialog open={!!editingFac} onOpenChange={v => !v && setEditingFac(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titre</Label>
              <Input value={editFacForm.title} onChange={e => setEditFacForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Montant</Label>
                <Input type="number" value={editFacForm.amount} onChange={e => setEditFacForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Date limite</Label>
                <Input type="date" value={editFacForm.echeance} onChange={e => setEditFacForm(f => ({ ...f, echeance: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={editFacForm.statut} onValueChange={v => setEditFacForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payer">À payer</SelectItem>
                  <SelectItem value="echeance">Proche échéance</SelectItem>
                  <SelectItem value="retard">En retard</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editFacForm.description} onChange={e => setEditFacForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full bg-m-navy hover:bg-m-navy/90 dark:bg-m-teal dark:hover:bg-m-teal/90" onClick={updateFacture}>
              <Check className="w-4 h-4 mr-1" /> Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
