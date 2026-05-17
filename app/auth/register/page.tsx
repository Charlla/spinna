'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        router.push('/')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0a0807] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1
            className="select-none text-3xl font-extrabold leading-none tracking-tight font-mono"
            style={{
              background: 'linear-gradient(180deg,#facc15 0%,#f59e0b 60%,#ef4444 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            SPINNA
          </h1>
          <p className="mt-1 text-[10px] tracking-[4px] font-mono text-white/55">CREATE ACCOUNT</p>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
          <form onSubmit={submit} className="space-y-3">
            <input
              type="text"
              placeholder="Username (3-20 chars)"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password (6+ chars)"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
              required
              minLength={6}
              autoComplete="new-password"
            />
            {error && (
              <div className="text-[11px] font-mono text-red-400">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 disabled:opacity-50 transition py-3 mt-1"
            >
              {loading ? 'LOADING…' : 'JOIN ▸'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/auth/login"
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              Have an account? Login
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/game"
            className="text-[11px] font-mono text-white/45 hover:text-amber-300 transition tracking-[2px]"
          >
            Play as guest →
          </Link>
        </div>
      </div>
    </main>
  )
}
