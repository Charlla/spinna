'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase'
import { HumanVerify } from '@/components/games/HumanVerify'
import NeonButton from '@/components/games/NeonButton'
import SpinnaControls from '@/components/spinna-controls'
import type { SpinnaCanvasHandle, ServerRing, OpponentPos } from '@/components/spinna-canvas'
import { DEFAULT_TUNE, applyUpgrades, type TuneData } from '@/lib/spinna-data'

const SpinnaCanvas = dynamic(() => import('@/components/spinna-canvas'), { ssr: false })

interface Room {
  id: string
  code: string
  host_id: string
  host_name: string
  status: 'waiting' | 'playing' | 'finished'
  world_seed: number
  current_ring: ServerRing | null
  ring_idx: number
  name: string | null
  duration_minutes: number
  is_public: boolean
  started_at: string | null
  ended_at: string | null
}

interface Member {
  id: string
  room_id: string
  player_id: string
  display_name: string
  seat: number
  ready: boolean
  rings_banked: number
  tires_popped_at: string | null
}

interface Me {
  playerId: string
  username: string
  email: string
}

export default function RoomClient({
  initialRoom,
  initialMembers,
}: {
  initialRoom: Room
  initialMembers: Member[]
}) {
  const router = useRouter()
  const [room, setRoom] = useState<Room>(initialRoom)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [me, setMe] = useState<Me | null>(null)
  const [joining, setJoining] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareToast, setShareToast] = useState<string | null>(null)

  // ─── Identity ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.player) {
          setMe({ playerId: data.player.id, username: data.player.username, email: data.player.email })
        }
      })
      .catch(() => {})
  }, [])

  const meMember = useMemo(
    () => (me ? members.find(m => m.player_id === me.playerId) ?? null : null),
    [members, me]
  )
  const amHost = !!me && me.playerId === room.host_id
  const everyoneReady = members.length >= 1 && members.every(m => m.ready || m.player_id === room.host_id)

  // ─── Realtime: room row + members ─────────────────────────────────────────
  useEffect(() => {
    const sb = createPublicClient()
    const channel = sb
      .channel(`room:${room.code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'spinna_rooms', filter: `code=eq.${room.code}` },
        payload => setRoom(payload.new as Room)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spinna_room_members', filter: `room_id=eq.${room.id}` },
        () => {
          // Refetch — broadcast events don't carry the full ordered list.
          fetch(`/api/rooms/${room.code}`)
            .then(r => (r.ok ? r.json() : null))
            .then(data => { if (data?.members) setMembers(data.members) })
            .catch(() => {})
        }
      )
      .subscribe()
    return () => {
      sb.removeChannel(channel)
    }
  }, [room.code, room.id])

  // ─── Realtime: opponent position broadcasts ───────────────────────────────
  const opponentsRef = useRef<OpponentPos[]>([])
  const ringRef = useRef<ServerRing | null>(null)
  const tickChannelRef = useRef<ReturnType<ReturnType<typeof createPublicClient>['channel']> | null>(null)

  useEffect(() => {
    ringRef.current = room.current_ring
  }, [room.current_ring])

  useEffect(() => {
    if (room.status !== 'playing' || !me) return
    const sb = createPublicClient()
    const ch = sb.channel(`room:${room.code}:tick`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const op = payload as OpponentPos
      if (!op || op.player_id === me.playerId) return
      // Upsert by player_id.
      const list = opponentsRef.current.slice()
      const idx = list.findIndex(o => o.player_id === op.player_id)
      if (idx >= 0) list[idx] = op
      else list.push(op)
      opponentsRef.current = list
    })
    ch.subscribe()
    tickChannelRef.current = ch
    return () => {
      sb.removeChannel(ch)
      tickChannelRef.current = null
      opponentsRef.current = []
    }
  }, [room.code, room.status, me])

  // ─── Lobby actions ────────────────────────────────────────────────────────
  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/online/${room.code}`
  }, [room.code])

  async function joinRoom(verifyToken: string) {
    setVerifyOpen(false)
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${room.code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyToken }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to join'); return }
      // Members refresh via Realtime.
    } finally {
      setJoining(false)
    }
  }

  async function toggleReady() {
    if (!meMember) return
    const next = !meMember.ready
    setMembers(prev => prev.map(m => (m.id === meMember.id ? { ...m, ready: next } : m)))
    await fetch(`/api/rooms/${room.code}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ready: next }),
    })
  }

  async function leave() {
    await fetch(`/api/rooms/${room.code}/leave`, { method: 'POST' })
    router.push('/online')
  }

  async function startGame() {
    setError(null)
    const res = await fetch(`/api/rooms/${room.code}/start`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Failed to start')
  }

  async function shareInvite() {
    if (typeof window === 'undefined') return
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Spinmfana room', text: 'Spin against me', url: inviteUrl })
      } else {
        await navigator.clipboard.writeText(inviteUrl)
        setShareToast('Link copied')
        setTimeout(() => setShareToast(null), 1500)
      }
    } catch { /* user cancelled */ }
  }

  // ─── In-game wiring ───────────────────────────────────────────────────────
  const canvasRef = useRef<SpinnaCanvasHandle>(null)
  const inputsRef = useRef<{ throttle: number; steer: number; hbrk: boolean }>({ throttle: 0, steer: 0, hbrk: false })
  const tuneRef = useRef<TuneData>(applyUpgrades(DEFAULT_TUNE, []))
  const bannerRef = useRef({ key: 0, text: '', sub: '', color: '#fcd00b' })
  const [, forceTick] = useState(0)
  const [resetKey] = useState(0)

  const onBanner = useCallback((text: string, sub: string, color: string) => {
    bannerRef.current = { key: bannerRef.current.key + 1, text, sub, color }
    forceTick(t => t + 1)
  }, [])

  const onRingComplete = useCallback(async (ringIdx: number) => {
    try {
      await fetch(`/api/rooms/${room.code}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ring_idx: ringIdx }),
      })
    } catch { /* ignore — Realtime will resync */ }
  }, [room.code])

  // Start the canvas exactly once when status flips to playing.
  const startedRef = useRef(false)
  useEffect(() => {
    if (room.status !== 'playing') return
    if (startedRef.current) return
    let cancelled = false
    const tryStart = () => {
      if (cancelled) return
      if (canvasRef.current) {
        canvasRef.current.start('e30', 'budget', 100, 'donut', 'rooms')
        startedRef.current = true
      } else {
        setTimeout(tryStart, 80)
      }
    }
    tryStart()
    return () => { cancelled = true }
  }, [room.status])

  // Broadcast my position at 10Hz while playing.
  useEffect(() => {
    if (room.status !== 'playing' || !me) return
    let alive = true
    const tick = () => {
      if (!alive) return
      const ch = tickChannelRef.current
      const pose = canvasRef.current?.getCarState()
      if (ch && pose) {
        ch.send({
          type: 'broadcast',
          event: 'pos',
          payload: { player_id: me.playerId, ...pose },
        })
      }
      setTimeout(tick, 100)
    }
    tick()
    return () => { alive = false }
  }, [room.status, me])

  // When tires die locally, notify the server so the room can finish.
  useEffect(() => {
    if (room.status !== 'playing') return
    let alive = true
    const watch = () => {
      if (!alive) return
      const stats = canvasRef.current?.getStats()
      if (stats && stats.tireHealth <= 0 && !meMember?.tires_popped_at) {
        fetch(`/api/rooms/${room.code}/popped`, { method: 'POST' }).catch(() => {})
        return
      }
      setTimeout(watch, 250)
    }
    watch()
    return () => { alive = false }
  }, [room.status, room.code, meMember?.tires_popped_at])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (room.status === 'waiting') {
    return (
      <main className="min-h-dvh bg-background text-white">
        <div className="max-w-lg mx-auto px-4 py-4 sm:py-6 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/online')} className="text-[9px] tracking-[4px] font-mono text-white/40 hover:text-white/70 transition">
              ← Events
            </button>
            <div className="text-right">
              <div className="text-[8px] tracking-[4px] font-mono text-white/40 uppercase">Event code</div>
              <div className="font-mono font-extrabold text-amber-300 text-2xl tracking-[8px]">{room.code}</div>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-gradient-to-r from-red-950/20 via-black/60 to-black/70 px-3 py-3">
            <div className="text-[9px] tracking-[3px] font-mono text-red-300 uppercase">Event</div>
            <div className="font-mono font-extrabold text-white text-lg leading-tight truncate mt-0.5">
              {room.name?.trim() || `${room.host_name}'s spin`}
            </div>
            <div className="text-[10px] font-mono text-white/55 mt-0.5">
              Host {room.host_name} · {room.duration_minutes} minute{room.duration_minutes === 1 ? '' : 's'} · {room.is_public ? 'open' : 'code-only'}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[8px] tracking-[3px] font-mono text-white/45 uppercase">Invite link</div>
              <div className="font-mono text-[11px] text-white/70 truncate">{inviteUrl}</div>
            </div>
            <button onClick={shareInvite} className="shrink-0 text-[9px] tracking-[2px] font-mono font-bold rounded px-3 py-2 border border-emerald-400/40 text-emerald-300 bg-emerald-500/10">
              SHARE
            </button>
          </div>
          {shareToast && <div className="text-[10px] font-mono text-emerald-300/80 text-center">{shareToast}</div>}

          <div>
            <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase mb-2">Seats</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 6 }).map((_, seat) => {
                const m = members.find(x => x.seat === seat)
                return (
                  <div
                    key={seat}
                    className={`rounded-lg border px-2 py-2 text-center ${
                      m ? 'border-white/20 bg-black/40' : 'border-dashed border-white/10 bg-black/20'
                    }`}
                  >
                    <div className="text-[8px] tracking-[3px] font-mono text-white/40 uppercase">
                      {seat === 0 ? 'Host' : `Seat ${seat}`}
                    </div>
                    <div className="font-mono text-[12px] text-white truncate">{m?.display_name ?? '—'}</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${m?.ready ? 'text-emerald-300' : 'text-white/40'}`}>
                      {m?.ready ? 'READY' : seat === 0 ? 'HOST' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-900/20 px-3 py-2 text-[11px] font-mono text-red-200">{error}</div>
          )}

          {!me && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-mono text-amber-100">
              <a href={`/auth/login?next=/online/${room.code}`} className="underline">Sign in</a> to join this event.
            </div>
          )}

          {me && !meMember && !verifyOpen && (
            <NeonButton variant="primary" size="lg" fullWidth onClick={() => setVerifyOpen(true)}>
              {joining ? 'Joining…' : 'Join event'}
            </NeonButton>
          )}

          {verifyOpen && (
            <div className="rounded-lg border border-white/15 bg-black/50 p-4">
              <div className="text-[9px] tracking-[4px] font-mono text-white/45 mb-2 uppercase">Confirm you&apos;re human</div>
              <HumanVerify onVerified={joinRoom} />
            </div>
          )}

          {me && meMember && !amHost && (
            <NeonButton variant={meMember.ready ? 'ghost' : 'primary'} size="lg" fullWidth onClick={toggleReady}>
              {meMember.ready ? 'Cancel ready' : "I'm ready"}
            </NeonButton>
          )}

          {amHost && (
            <NeonButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={startGame}
            >
              {everyoneReady ? 'Start round' : `Waiting on ${members.filter(m => !m.ready && m.player_id !== room.host_id).length} player(s)`}
            </NeonButton>
          )}

          {me && meMember && (
            <button onClick={leave} className="w-full text-[10px] tracking-[3px] font-mono text-white/40 hover:text-red-300 transition">
              Leave event
            </button>
          )}
        </div>
      </main>
    )
  }

  if (room.status === 'finished') {
    const podium = [...members].sort((a, b) => b.rings_banked - a.rings_banked)
    return (
      <main className="min-h-dvh bg-background text-white">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="text-center">
            <div className="text-[9px] tracking-[6px] font-mono text-white/40 uppercase">Round over</div>
            <h1 className="font-mono font-extrabold text-3xl text-amber-300 tracking-[4px] mt-2">PODIUM</h1>
          </div>
          {podium.map((m, i) => (
            <div key={m.id} className="rounded-lg border border-white/10 bg-black/40 px-3 py-3 flex items-center gap-3">
              <div className="font-mono font-extrabold text-2xl text-amber-300 w-8 text-center">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold text-white truncate">{m.display_name}</div>
                <div className="text-[10px] font-mono text-white/45">{m.rings_banked} ring{m.rings_banked === 1 ? '' : 's'}</div>
              </div>
            </div>
          ))}
          <NeonButton variant="ghost" size="md" fullWidth onClick={() => router.push('/online')}>
            Back to events
          </NeonButton>
        </div>
      </main>
    )
  }

  // status === 'playing'
  const leaderboard = [...members].sort((a, b) => b.rings_banked - a.rings_banked)
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0807]">
      <SpinnaCanvas
        ref={canvasRef}
        inputsRef={inputsRef}
        tuneRef={tuneRef}
        active={true}
        onBanner={onBanner}
        multiplayer={{ ringRef, opponentsRef, onRingComplete }}
      />
      <SpinnaControls inputsRef={inputsRef} resetKey={resetKey} />
      <div className="pointer-events-none absolute top-[max(env(safe-area-inset-top),12px)] left-3 right-3 z-10 space-y-2">
        <div className="flex items-start gap-2">
          <div className="rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px] flex-1 min-w-0">
            <div className="text-[8px] tracking-[2px] text-white/55 font-mono">EVENT</div>
            <div className="text-[14px] leading-none font-extrabold text-amber-300 font-mono tracking-[4px] truncate">
              {room.name?.trim() || room.code}
            </div>
          </div>
          <div className="rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px] flex-1 min-w-0">
            <div className="text-[8px] tracking-[2px] text-white/55 font-mono">RINGS</div>
            <div className="text-[16px] leading-none font-extrabold text-emerald-400 font-mono tabular-nums">
              {meMember?.rings_banked ?? 0}
            </div>
          </div>
        </div>
        <EventTimer room={room} />
      </div>
      {/* Leaderboard ticker — left side */}
      <div className="pointer-events-none absolute left-3 top-[calc(max(env(safe-area-inset-top),12px)+58px)] z-10 space-y-1">
        {leaderboard.map(m => (
          <div
            key={m.id}
            className={`rounded border px-2 py-1 flex items-center gap-2 text-[10px] font-mono ${
              m.player_id === me?.playerId
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-black/50 text-white/70'
            } ${m.tires_popped_at ? 'opacity-50' : ''}`}
          >
            <span className="font-bold tabular-nums w-4">{m.rings_banked}</span>
            <span className="truncate max-w-[100px]">{m.display_name}</span>
            {m.tires_popped_at && <span className="text-red-300 text-[9px]">POP</span>}
          </div>
        ))}
      </div>
      {/* Banner */}
      <div
        key={bannerRef.current.key}
        className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 z-10 text-center font-mono font-extrabold tracking-[3px]"
        style={{ color: bannerRef.current.color, textShadow: '0 0 18px rgba(0,0,0,0.85)' }}
      >
        <div className="text-3xl">{bannerRef.current.text}</div>
        <div className="text-xs tracking-[5px] mt-1 text-white/75">{bannerRef.current.sub}</div>
      </div>
    </main>
  )
}

// ─── Session timer — shows mm:ss remaining and posts /timeout when it expires.
function EventTimer({ room }: { room: Room }) {
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)
  const deadline = useMemo(() => {
    if (!room.started_at) return null
    return Date.parse(room.started_at) + room.duration_minutes * 60_000
  }, [room.started_at, room.duration_minutes])
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])
  if (!deadline) return null
  const remaining = Math.max(0, deadline - now)
  const total = room.duration_minutes * 60_000
  const pct = (remaining / total) * 100
  const secs = Math.ceil(remaining / 1000)
  const mm = Math.floor(secs / 60)
  const ss = secs % 60
  const color = remaining < 30_000 ? '#ef4444' : remaining < 90_000 ? '#fcd00b' : '#22c55e'
  // Fire timeout once.
  if (remaining <= 0 && !firedRef.current) {
    firedRef.current = true
    fetch(`/api/rooms/${room.code}/timeout`, { method: 'POST' }).catch(() => {})
  }
  return (
    <div className="relative h-3 rounded-[2px] overflow-hidden border border-white/10 bg-black/55 backdrop-blur-md pointer-events-none">
      <div className="absolute left-0 top-0 bottom-0 transition-all" style={{ width: `${pct}%`, background: color }} />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] tracking-[2px] font-mono">
        <span className="text-white/85">EVENT</span>
        <span className="text-white/85 tabular-nums">{mm}:{ss.toString().padStart(2, '0')}</span>
      </div>
    </div>
  )
}
