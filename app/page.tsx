'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SpinnaGarage from '@/components/spinna-garage'
import { SAVE_KEY, DEFAULT_SAVE, SaveData } from '@/lib/spinna-data'

interface Player {
  id: string
  username: string
  email: string
}

export default function Home() {
  const router = useRouter()
  const [save, setSave] = useState<SaveData>({ ...DEFAULT_SAVE })
  const [player, setPlayer] = useState<Player | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  // Load save from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const merged: SaveData = { ...DEFAULT_SAVE, ...parsed }
        if (!Array.isArray(merged.ownedCars)) merged.ownedCars = ['e30']
        if (!merged.ownedCars.includes('e30')) merged.ownedCars.push('e30')
        setSave(merged)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.player) setPlayer(data.player) })
      .catch(() => {})
  }, [])

  const handleSave = useCallback((newSave: SaveData) => {
    setSave(newSave)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(newSave)) } catch { /* ignore */ }
  }, [])

  const handlePlay = useCallback(() => {
    sessionStorage.setItem('spinna_game_save', JSON.stringify(save))
    router.push('/game')
  }, [save, router])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setPlayer(null)
  }, [])

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0a0807]">
        <div className="font-mono text-amber-300 tracking-[6px] text-xs animate-pulse">
          LOADING SPINNA…
        </div>
      </main>
    )
  }

  return (
    <>
      <SpinnaGarage
        save={save}
        onSave={handleSave}
        onPlay={handlePlay}
        player={player}
        onLogin={() => setShowAuth(true)}
        onLogout={handleLogout}
      />
      {showAuth && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setShowAuth(false)}
          onSuccess={(p) => { setPlayer(p); setShowAuth(false) }}
        />
      )}
    </>
  )
}

function AuthModal({
  mode,
  onModeChange,
  onClose,
  onSuccess,
}: {
  mode: 'login' | 'register'
  onModeChange: (m: 'login' | 'register') => void
  onClose: () => void
  onSuccess: (player: Player) => void
}) {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        onSuccess(data.player)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono font-black text-lg text-amber-300 tracking-widest uppercase">
            {mode === 'login' ? 'Login' : 'Register'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition text-xl">×</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username (3-20 chars)"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
              required
              minLength={3}
              maxLength={20}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
            required
            minLength={6}
          />
          {error && (
            <div className="text-[11px] font-mono text-red-400">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 disabled:opacity-50 transition py-3 mt-1"
          >
            {loading ? 'LOADING…' : mode === 'login' ? 'LOGIN ▸' : 'JOIN ▸'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
          >
            {mode === 'login' ? 'No account? Register here' : 'Have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
