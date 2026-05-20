'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HumanVerify } from '@/components/games/HumanVerify'
import NeonButton from '@/components/games/NeonButton'
import type { OpenEvent } from './page'

const DURATIONS = [1, 3, 5, 10, 15] as const
type Duration = typeof DURATIONS[number]

export default function OnlineLobbyList({ initialEvents }: { initialEvents: OpenEvent[] }) {
  const router = useRouter()
  const [events] = useState<OpenEvent[]>(initialEvents)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [duration, setDuration] = useState<Duration>(5)
  const [isPublic, setIsPublic] = useState(true)

  async function createEvent(verifyToken: string) {
    setVerifyOpen(false)
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifyToken,
          name: name.trim(),
          duration_minutes: duration,
          is_public: isPublic,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create event')
        return
      }
      router.push(`/online/${json.room.code}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/20 via-black/60 to-black/75 backdrop-blur-md p-4 space-y-3">
        <div className="text-[9px] tracking-[4px] font-mono uppercase text-red-300">New event</div>
        <div>
          <label className="block text-[9px] tracking-[3px] font-mono text-white/50 mb-1">Event name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            placeholder="Thursday smoke session"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-white placeholder:text-white/30 outline-none focus:border-red-400/60"
            maxLength={60}
          />
        </div>
        <div>
          <label className="block text-[9px] tracking-[3px] font-mono text-white/50 mb-1">Duration</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATIONS.map(d => {
              const active = d === duration
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg border py-2 font-mono text-[11px] tracking-[2px] font-bold transition ${
                    active
                      ? 'border-red-400/70 bg-red-500/20 text-red-100'
                      : 'border-white/15 bg-black/40 text-white/55 hover:bg-white/5'
                  }`}
                >
                  {d}m
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-[9px] tracking-[3px] font-mono text-white/50 mb-1">Access</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setIsPublic(true)}
              className={`rounded-lg border py-2 font-mono text-[10px] tracking-[2px] font-bold transition ${
                isPublic
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                  : 'border-white/15 bg-black/40 text-white/55 hover:bg-white/5'
              }`}
            >
              OPEN · LISTED
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`rounded-lg border py-2 font-mono text-[10px] tracking-[2px] font-bold transition ${
                !isPublic
                  ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                  : 'border-white/15 bg-black/40 text-white/55 hover:bg-white/5'
              }`}
            >
              CODE-ONLY
            </button>
          </div>
          <div className="mt-1 text-[9px] font-mono text-white/40 leading-snug">
            {isPublic
              ? 'Shown on the public lobby list below.'
              : 'Hidden from the lobby — share the URL or 6-char code directly.'}
          </div>
        </div>
        <NeonButton variant="primary" size="lg" fullWidth onClick={() => setVerifyOpen(true)}>
          {creating ? 'Creating…' : 'Create event'}
        </NeonButton>

        {verifyOpen && (
          <div className="rounded-lg border border-white/15 bg-black/50 p-3">
            <div className="text-[9px] tracking-[4px] font-mono text-white/45 mb-2 uppercase">Confirm you&apos;re human</div>
            <HumanVerify onVerified={createEvent} />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-900/20 px-3 py-2 text-[11px] font-mono text-red-200 leading-tight">
          {error}
        </div>
      )}

      <div>
        <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase mb-2">Open events</div>
        {events.length === 0 && (
          <div className="text-[11px] font-mono text-white/40">No open events right now. Create one above.</div>
        )}
        {events.map(r => (
          <button
            key={r.id}
            onClick={() => router.push(`/online/${r.code}`)}
            className="w-full text-left rounded-lg border border-white/10 bg-black/40 px-3 py-2 mb-2 hover:bg-white/5 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold text-white truncate">
                  {r.name?.trim() || `${r.host_name}'s spin`}
                </div>
                <div className="text-[10px] font-mono text-white/45 truncate">
                  Host {r.host_name} · {r.duration_minutes}m
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] tracking-[3px] font-mono text-emerald-300">{r.code}</div>
                <div className="text-[9px] font-mono text-white/40">JOIN →</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
