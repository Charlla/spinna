'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import NeonButton from '@/components/games/NeonButton'
import SpinnaControls from '@/components/spinna-controls'
import type { SpinnaCanvasHandle } from '@/components/spinna-canvas'
import {
  CARS,
  TIRES,
  UPGRADES,
  DEFAULT_TUNE,
  DEFAULT_SAVE,
  SAVE_KEY,
  applyUpgrades,
  type Car,
  type Tire,
  type SaveData,
  type TuneData,
  type GameStats,
} from '@/lib/spinna-data'

const SpinnaCanvas = dynamic(() => import('@/components/spinna-canvas'), { ssr: false })

const TURN_SECONDS = 60
const MIN_PLAYERS = 2
const MAX_PLAYERS = 6

type Phase = 'setup' | 'handoff' | 'playing' | 'final'

interface PassPlayer {
  name: string
  score: number
}

export default function PassPlayPage() {
  const router = useRouter()
  const [save, setSave] = useState<SaveData>({ ...DEFAULT_SAVE })

  // Load the host's save once so we can read owned cars / mods.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) setSave({ ...DEFAULT_SAVE, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [])

  const [phase, setPhase] = useState<Phase>('setup')
  const [names, setNames] = useState<string[]>(['', ''])
  const [players, setPlayers] = useState<PassPlayer[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [carId, setCarId] = useState<string>('')
  const [tireId, setTireId] = useState<string>('')
  const [equipped, setEquipped] = useState<string[]>([])

  // Default the shared ride to the host's current setup once their save loads.
  useEffect(() => {
    if (!carId) setCarId(save.car)
    if (!tireId) setTireId(save.tires)
    if (equipped.length === 0 && save.equippedUpgrades?.length) {
      setEquipped(save.equippedUpgrades)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save])

  const ownedCars = useMemo(() => CARS.filter(c => save.ownedCars.includes(c.id)), [save.ownedCars])
  const ownedUpgrades = useMemo(() => UPGRADES.filter(u => (save.ownedUpgrades ?? []).includes(u.id)), [save.ownedUpgrades])

  const addPlayer = () => {
    if (names.length >= MAX_PLAYERS) return
    setNames(n => [...n, ''])
  }
  const removePlayer = (i: number) => {
    if (names.length <= MIN_PLAYERS) return
    setNames(n => n.filter((_, idx) => idx !== i))
  }
  const updateName = (i: number, v: string) => {
    setNames(n => n.map((x, idx) => (idx === i ? v.slice(0, 16) : x)))
  }

  const startable = useMemo(() => {
    const cleaned = names.map(n => n.trim()).filter(Boolean)
    return cleaned.length >= MIN_PLAYERS && cleaned.length === names.map(n => n.trim()).filter(Boolean).length
  }, [names])

  const startGame = () => {
    const cleaned = names.map(n => n.trim()).filter(Boolean)
    if (cleaned.length < MIN_PLAYERS) return
    setPlayers(cleaned.map(name => ({ name, score: 0 })))
    setCurrentIdx(0)
    setPhase('handoff')
  }

  if (phase === 'setup') {
    return (
      <SetupView
        names={names}
        onName={updateName}
        onAdd={addPlayer}
        onRemove={removePlayer}
        startable={startable}
        onStart={startGame}
        ownedCars={ownedCars}
        ownedUpgrades={ownedUpgrades}
        carId={carId}
        setCarId={setCarId}
        tireId={tireId}
        setTireId={setTireId}
        equipped={equipped}
        toggleEquip={(id) => setEquipped(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])}
        onBack={() => router.push('/')}
      />
    )
  }

  if (phase === 'handoff') {
    return (
      <HandoffView
        players={players}
        nextIdx={currentIdx}
        onReady={() => setPhase('playing')}
      />
    )
  }

  if (phase === 'final') {
    return (
      <FinalView
        players={players}
        onAgain={() => {
          setPlayers(players.map(p => ({ ...p, score: 0 })))
          setCurrentIdx(0)
          setPhase('handoff')
        }}
        onExit={() => router.push('/')}
      />
    )
  }

  // playing
  return (
    <PlayingView
      player={players[currentIdx]}
      isLast={currentIdx === players.length - 1}
      carId={carId}
      tireId={tireId}
      equipped={equipped}
      onDone={(score) => {
        const updated = players.map((p, i) => (i === currentIdx ? { ...p, score: Math.max(p.score, score) } : p))
        setPlayers(updated)
        if (currentIdx + 1 >= players.length) {
          setPhase('final')
        } else {
          setCurrentIdx(currentIdx + 1)
          setPhase('handoff')
        }
      }}
    />
  )
}

// ─── Setup ───────────────────────────────────────────────────────────────────
function SetupView({
  names, onName, onAdd, onRemove, startable, onStart,
  ownedCars, ownedUpgrades, carId, setCarId, tireId, setTireId, equipped, toggleEquip, onBack,
}: {
  names: string[]
  onName: (i: number, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  startable: boolean
  onStart: () => void
  ownedCars: Car[]
  ownedUpgrades: { id: string; name: string; tag: string }[]
  carId: string
  setCarId: (id: string) => void
  tireId: string
  setTireId: (id: string) => void
  equipped: string[]
  toggleEquip: (id: string) => void
  onBack: () => void
}) {
  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-[9px] tracking-[4px] font-mono text-white/40 hover:text-white/70 transition">← Modes</button>
          <h1 className="font-mono font-black text-2xl tracking-wide" style={{ color: '#a855f7' }}>PASS & PLAY</h1>
          <div style={{ width: 80 }} />
        </div>

        <section>
          <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase mb-2">
            Players ({names.length}/{MAX_PLAYERS})
          </div>
          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-purple-300 w-6 text-center">P{i + 1}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onName(i, e.target.value)}
                  placeholder={`Player ${i + 1} name`}
                  className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-white placeholder:text-white/30 outline-none focus:border-purple-400/60"
                  maxLength={16}
                />
                {names.length > MIN_PLAYERS && (
                  <button onClick={() => onRemove(i)} className="text-white/30 hover:text-red-400 transition text-lg w-7" aria-label={`Remove player ${i + 1}`}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {names.length < MAX_PLAYERS && (
            <button onClick={onAdd} className="mt-2 w-full text-[10px] tracking-[3px] font-mono font-bold text-purple-300 border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition rounded-lg py-2">
              + ADD PLAYER
            </button>
          )}
        </section>

        <section className="space-y-3">
          <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase">Shared ride</div>
          <SpinnerPicker
            label="Car"
            items={ownedCars}
            valueId={carId}
            onChange={setCarId}
            renderHero={(c) => <MiniCarPreview car={c as Car} />}
            renderTitle={(c) => (c as Car).name}
            renderTag={(c) => (c as Car).tag}
            accent="#fcd00b"
          />
          <SpinnerPicker
            label="Tyres · fresh set every turn"
            items={TIRES.map(t => ({ ...t }))}
            valueId={tireId}
            onChange={setTireId}
            renderHero={(t) => <MiniTirePreview tire={t as Tire} />}
            renderTitle={(t) => (t as Tire).name}
            renderTag={(t) => `Life ${Math.round(((t as Tire).lifeStat) * 100)}% · Grip ${Math.round(((t as Tire).gripStat) * 100)}%`}
            accent="#22c55e"
          />

          {ownedUpgrades.length > 0 && (
            <div>
              <label className="block text-[9px] tracking-[3px] font-mono text-white/50 mb-1 mt-3">Mods (your owned set)</label>
              <div className="flex flex-wrap gap-1.5">
                {ownedUpgrades.map(u => {
                  const on = equipped.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleEquip(u.id)}
                      className={`text-[9px] tracking-[2px] font-mono font-bold rounded px-2.5 py-1.5 border transition ${
                        on
                          ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15'
                          : 'text-white/60 border-white/15 bg-black/40 hover:bg-white/5'
                      }`}
                    >
                      {u.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <NeonButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          disabled={!startable}
        >
          {startable ? `Start round 1 of ${names.filter(n => n.trim()).length}` : `Need at least ${MIN_PLAYERS} names`}
        </NeonButton>

        <div className="text-[10px] font-mono text-white/45 text-center leading-snug">
          60-second rounds · fresh tyres each turn · scores reset per player
        </div>
      </div>
    </main>
  )
}

// ─── Carousel picker — same visual language as the garage ──────────────────
function SpinnerPicker<T extends { id: string }>({
  label, items, valueId, onChange, renderHero, renderTitle, renderTag, accent,
}: {
  label: string
  items: T[]
  valueId: string
  onChange: (id: string) => void
  renderHero: (item: T) => React.ReactNode
  renderTitle: (item: T) => string
  renderTag: (item: T) => string
  accent: string
}) {
  const safeIdx = Math.max(0, items.findIndex(i => i.id === valueId))
  const idx = safeIdx < 0 ? 0 : safeIdx
  const item = items[idx]
  const go = (delta: number) => {
    const n = items.length
    if (n === 0) return
    const next = (idx + delta + n) % n
    onChange(items[next].id)
  }
  if (!item) return null
  return (
    <div
      className="relative rounded-xl border bg-gradient-to-b from-black/70 via-black/60 to-black/80 backdrop-blur-md overflow-hidden px-3 py-3"
      style={{ borderColor: `${accent}33`, boxShadow: `0 0 18px ${accent}1a` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}1f, transparent 65%)` }}
      />
      <div className="text-[8px] tracking-[4px] font-mono uppercase" style={{ color: `${accent}cc` }}>
        {label}
      </div>
      <div className="flex justify-center gap-1 mt-1.5 mb-1">
        {items.map((it, i) => (
          <span
            key={it.id}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              backgroundColor: i === idx ? accent : 'rgba(255,255,255,0.18)',
              transform: i === idx ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(-1)}
          aria-label="Previous"
          className="shrink-0 w-9 h-12 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-xl"
        >
          ‹
        </button>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="shrink-0">{renderHero(item)}</div>
          <div className="min-w-0">
            <div className="font-mono font-extrabold text-white text-base leading-tight truncate">
              {renderTitle(item)}
            </div>
            <div className="text-[10px] font-mono text-white/55 leading-tight truncate mt-0.5">
              {renderTag(item)}
            </div>
          </div>
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="shrink-0 w-9 h-12 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-xl"
        >
          ›
        </button>
      </div>
    </div>
  )
}

function MiniCarPreview({ car }: { car: Car }) {
  return (
    <svg width="36" height="56" viewBox="0 0 100 155" aria-hidden="true">
      <rect x="6" y="2" width="88" height="151" rx="8" fill={car.color} />
      {car.accentColor === 'M-stripe' && (
        <>
          <rect x="6" y="68" width="88" height="4" fill="#1c69d4" />
          <rect x="6" y="72" width="88" height="4" fill="#3e1f7d" />
          <rect x="6" y="76" width="88" height="4" fill="#e30613" />
        </>
      )}
      {car.accentColor === 'stripe' && (
        <rect x="6" y="72" width="88" height="6" fill="#0a0a0a" />
      )}
      <polygon points="12,18 88,18 84,30 16,30" fill="rgba(15,18,28,0.92)" />
      <polygon points="16,130 84,130 88,141 12,141" fill="rgba(15,18,28,0.92)" />
      <rect x="2" y="30" width="8" height="14" fill="#0a0a0a" />
      <rect x="90" y="30" width="8" height="14" fill="#0a0a0a" />
      <rect x="2" y="116" width="8" height="14" fill="#0a0a0a" />
      <rect x="90" y="116" width="8" height="14" fill="#0a0a0a" />
    </svg>
  )
}

function MiniTirePreview({ tire }: { tire: Tire }) {
  // Colour shifts with grip — yellower for cheap, greener for sticky.
  const hue = Math.min(140, Math.max(40, Math.round(40 + tire.gripStat * 100)))
  return (
    <svg width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="#0a0a0a" stroke={`hsl(${hue} 85% 55%)`} strokeWidth="2" />
      <circle cx="28" cy="28" r="13" fill="#1a1a20" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        return (
          <line
            key={i}
            x1="28" y1="28"
            x2={28 + Math.cos(a) * 12}
            y2={28 + Math.sin(a) * 12}
            stroke="#3a3a44" strokeWidth="2.5"
          />
        )
      })}
      <circle cx="28" cy="28" r="2.5" fill={`hsl(${hue} 85% 55%)`} />
    </svg>
  )
}

// ─── Handoff ─────────────────────────────────────────────────────────────────
function HandoffView({ players, nextIdx, onReady }: { players: PassPlayer[]; nextIdx: number; onReady: () => void }) {
  const next = players[nextIdx]
  const sorted = [...players]
    .map((p, i) => ({ ...p, originalIdx: i, played: i < nextIdx }))
    .sort((a, b) => b.score - a.score)
  const isFirst = nextIdx === 0
  return (
    <main className="min-h-dvh bg-gradient-to-b from-purple-900/30 via-black to-black text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 min-h-dvh flex flex-col justify-center">
        {!isFirst && (
          <div>
            <div className="text-[9px] tracking-[5px] font-mono text-purple-300 uppercase text-center">Standings</div>
            <div className="mt-3 space-y-2">
              {sorted.map((p, i) => (
                <div
                  key={p.originalIdx}
                  className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${
                    p.played ? 'border-white/10 bg-black/50' : 'border-white/5 bg-black/20 opacity-60'
                  }`}
                >
                  <div className="font-mono font-extrabold text-lg text-purple-300 w-6 text-center">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-white truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-white/40">
                      {p.played ? `R${p.score.toLocaleString()}` : 'waiting'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-center pt-2">
          <div className="text-[10px] tracking-[5px] font-mono text-white/45 uppercase">{isFirst ? 'First up' : 'Next up'}</div>
          <div className="font-mono font-extrabold text-4xl mt-2" style={{ color: '#a855f7' }}>{next.name}</div>
        </div>
        <NeonButton variant="primary" size="lg" fullWidth onClick={onReady}>
          {isFirst ? `${next.name} — START` : `PASS TO ${next.name} ▸`}
        </NeonButton>
        <div className="text-[10px] font-mono text-white/40 text-center">
          60 seconds. Burn rubber.
        </div>
      </div>
    </main>
  )
}

// ─── Playing — canvas + 60s timer ────────────────────────────────────────────
function PlayingView({
  player, isLast, carId, tireId, equipped, onDone,
}: {
  player: PassPlayer
  isLast: boolean
  carId: string
  tireId: string
  equipped: string[]
  onDone: (score: number) => void
}) {
  const canvasRef = useRef<SpinnaCanvasHandle>(null)
  const inputsRef = useRef<{ throttle: number; steer: number; hbrk: boolean }>({ throttle: 0, steer: 0, hbrk: false })
  const tuneRef = useRef<TuneData>(applyUpgrades(DEFAULT_TUNE, equipped))
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS)
  const [stats, setStats] = useState<GameStats>({
    score: 0, comboDeg: 0, mult: 1, speedKmh: 0,
    tireHealth: 100, tireName: '', totalSpins: 0, maxCombo: 0,
    damageBumps: 0, damagePenalty: 0, lastBumpCost: 0,
    mode: 'passplay', targetsHit: 0, targetsTotal: 0, targetProgress: 0,
  })

  useEffect(() => {
    tuneRef.current = applyUpgrades(DEFAULT_TUNE, equipped)
  }, [equipped])

  // Start the round once the canvas is mounted.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    const tryStart = () => {
      if (canvasRef.current) {
        canvasRef.current.start(carId, tireId, 100, 'donut', 'passplay')
        startedRef.current = true
      } else {
        setTimeout(tryStart, 60)
      }
    }
    tryStart()
  }, [carId, tireId])

  // Hard 60s deadline.
  useEffect(() => {
    const deadline = Date.now() + TURN_SECONDS * 1000
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) {
        window.clearInterval(tick)
        const final = canvasRef.current?.getStats()
        canvasRef.current?.stop()
        onDone(final?.score ?? 0)
      }
    }, 100)
    return () => window.clearInterval(tick)
    // onDone is intentionally not in deps — the timer must own the run-to-completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // HUD stats polling.
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const s = canvasRef.current?.getStats()
      if (s) setStats(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onBanner = useCallback(() => { /* banners ignored in pass-and-play to keep the screen clean */ }, [])

  const timerPct = (secondsLeft / TURN_SECONDS) * 100
  const timerColor = secondsLeft <= 10 ? '#ef4444' : secondsLeft <= 25 ? '#fcd00b' : '#a855f7'

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0807]">
      <SpinnaCanvas
        ref={canvasRef}
        inputsRef={inputsRef}
        tuneRef={tuneRef}
        active={true}
        onBanner={onBanner}
      />
      <SpinnaControls inputsRef={inputsRef} resetKey={0} />

      {/* Top HUD: name + timer + score */}
      <div className="pointer-events-none absolute top-[max(env(safe-area-inset-top),12px)] left-3 right-3 z-10 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="flex-1 min-w-0 rounded-[3px] border bg-black/55 backdrop-blur-md px-3 py-1.5"
            style={{ borderColor: '#a855f755' }}
          >
            <div className="text-[8px] tracking-[3px] font-mono text-white/55 uppercase">Now spinning</div>
            <div className="font-mono font-extrabold text-base leading-tight truncate" style={{ color: '#d8b4fe' }}>
              {player.name}
            </div>
          </div>
          <div
            className="shrink-0 rounded-[3px] border bg-black/55 backdrop-blur-md px-3 py-1.5 text-right"
            style={{ borderColor: '#a855f733' }}
          >
            <div className="text-[8px] tracking-[3px] font-mono text-white/55 uppercase">Score</div>
            <div className="font-mono font-extrabold text-base leading-tight tabular-nums text-amber-300">
              {stats.score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="relative h-3 rounded-[2px] overflow-hidden border border-white/10 bg-black/55 backdrop-blur-md">
          <div className="absolute left-0 top-0 bottom-0 transition-all" style={{ width: `${timerPct}%`, background: timerColor }} />
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] tracking-[2px] font-mono">
            <span className="text-white/85">{isLast ? 'FINAL' : 'TURN'}</span>
            <span className="text-white/85 tabular-nums">{secondsLeft}s</span>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Final standings ─────────────────────────────────────────────────────────
function FinalView({ players, onAgain, onExit }: { players: PassPlayer[]; onAgain: () => void; onExit: () => void }) {
  const podium = [...players].sort((a, b) => b.score - a.score)
  return (
    <main className="min-h-dvh bg-gradient-to-b from-purple-900/40 via-black to-black text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="text-center">
          <div className="text-[9px] tracking-[6px] font-mono text-purple-300 uppercase">Pass & Play</div>
          <h1 className="font-mono font-extrabold text-3xl tracking-[4px] mt-2 text-amber-300">FINAL STANDINGS</h1>
        </div>
        {podium.map((p, i) => (
          <div
            key={p.name + i}
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-3 flex items-center gap-3"
            style={i === 0 ? { borderColor: '#fcd00b', boxShadow: '0 0 18px rgba(252,208,11,0.25)' } : undefined}
          >
            <div className="font-mono font-extrabold text-2xl w-8 text-center" style={{ color: i === 0 ? '#fcd00b' : '#a855f7' }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-white truncate">{p.name}</div>
              <div className="text-[10px] font-mono text-white/45 tabular-nums">R{p.score.toLocaleString()}</div>
            </div>
          </div>
        ))}
        <NeonButton variant="primary" size="lg" fullWidth onClick={onAgain}>
          Same crew, again
        </NeonButton>
        <NeonButton variant="ghost" size="md" fullWidth onClick={onExit}>
          Back to modes
        </NeonButton>
      </div>
    </main>
  )
}
