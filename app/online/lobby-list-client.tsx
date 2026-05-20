'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HumanVerify } from '@/components/games/HumanVerify'
import NeonButton from '@/components/games/NeonButton'

interface OpenRoom {
  id: string
  code: string
  host_name: string
  status: string
  created_at: string
}

export default function OnlineLobbyList({ initialRooms }: { initialRooms: OpenRoom[] }) {
  const router = useRouter()
  const [rooms] = useState<OpenRoom[]>(initialRooms)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRoom(verifyToken: string) {
    setVerifyOpen(false)
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyToken }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create room')
        return
      }
      router.push(`/online/${json.room.code}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <NeonButton variant="primary" size="lg" fullWidth onClick={() => setVerifyOpen(true)}>
        {creating ? 'Creating…' : 'Create room'}
      </NeonButton>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-900/20 px-3 py-2 text-[11px] font-mono text-red-200 leading-tight">
          {error}
        </div>
      )}

      {verifyOpen && (
        <div className="rounded-lg border border-white/15 bg-black/50 p-4">
          <div className="text-[9px] tracking-[4px] font-mono text-white/45 mb-2 uppercase">Confirm you&apos;re human</div>
          <HumanVerify onVerified={createRoom} />
        </div>
      )}

      <div>
        <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase mb-2">Open rooms</div>
        {rooms.length === 0 && (
          <div className="text-[11px] font-mono text-white/40">No open rooms right now. Create one above.</div>
        )}
        {rooms.map(r => (
          <button
            key={r.id}
            onClick={() => router.push(`/online/${r.code}`)}
            className="w-full text-left rounded-lg border border-white/10 bg-black/40 px-3 py-2 mb-2 hover:bg-white/5 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-[3px] font-mono text-emerald-300">{r.code}</div>
                <div className="text-[11px] font-mono text-white/70">{r.host_name}</div>
              </div>
              <div className="text-[9px] font-mono text-white/40">JOIN →</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
