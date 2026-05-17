'use client'

import { useState, useCallback } from 'react'
import { CARS, TIRES, SaveData, Car, Tire } from '@/lib/spinna-data'

interface SpinnaGarageProps {
  save: SaveData
  onSave: (save: SaveData) => void
  onPlay: () => void
  player: { username: string } | null
  onLogin: () => void
  onLogout: () => void
}

type Step = 'car' | 'tires' | 'spin'
const STEPS: Step[] = ['car', 'tires', 'spin']
const STEP_LABEL: Record<Step, string> = { car: 'Ride', tires: 'Tyres', spin: 'Go' }

function StatBar({ value, color = '#fcd00b' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

/** Mini schematic of a car — used in the picker rows so each ride is recognisable. */
function CarPreview({ car, size = 'md' }: { car: Car; size?: 'sm' | 'md' | 'lg' }) {
  const W = size === 'sm' ? 36 : size === 'md' ? 56 : 96
  const H = Math.round(W * 1.55)
  return (
    <svg viewBox="0 0 100 155" width={W} height={H} aria-hidden="true">
      {/* shadow */}
      <ellipse cx="52" cy="80" rx="44" ry="74" fill="rgba(0,0,0,0.55)" />
      {/* body */}
      <rect x="6" y="2" width="88" height="151" rx="6" fill={car.color} />
      {/* accent stripes */}
      {car.accentColor === 'M-stripe' && (
        <>
          <rect x="6" y="68"  width="88" height="4" fill="#1c69d4" />
          <rect x="6" y="72"  width="88" height="4" fill="#3e1f7d" />
          <rect x="6" y="76"  width="88" height="4" fill="#e30613" />
        </>
      )}
      {car.accentColor === 'stripe' && (
        <rect x="6" y="72" width="88" height="6" fill="#0a0a0a" />
      )}
      {/* windscreen (front) */}
      <polygon points="12,18 88,18 84,30 16,30" fill="rgba(15,18,28,0.92)" />
      {/* rear screen */}
      <polygon points="16,130 84,130 88,141 12,141" fill="rgba(15,18,28,0.92)" />
      {/* roof slab */}
      <rect x="10" y="32" width="80" height="96" fill={car.color === '#1a1a1a' ? '#222226' : '#dcdcd6'} opacity="0.6" />
      {/* headlights */}
      {car.id === 'rx7'
        ? <rect x="14" y="4" width="72" height="3" fill="#fff8c0" />
        : (
          <>
            <rect x="14" y="4" width="20" height="4" fill="#fff8c0" />
            <rect x="66" y="4" width="20" height="4" fill="#fff8c0" />
            <rect x="46" y="4" width="8" height="4" fill="#0a0a0a" />
          </>
        )
      }
      {/* tail lights */}
      <rect x="14" y="147" width="72" height="3" fill="#cc0a16" />
      <rect x="14" y="147" width="10" height="3" fill="#ffae00" />
      <rect x="76" y="147" width="10" height="3" fill="#ffae00" />
      {/* wheels */}
      <rect x="2"  y="30"  width="8" height="14" fill="#0a0a0a" />
      <rect x="90" y="30"  width="8" height="14" fill="#0a0a0a" />
      <rect x="2"  y="116" width="8" height="14" fill="#0a0a0a" />
      <rect x="90" y="116" width="8" height="14" fill="#0a0a0a" />
    </svg>
  )
}

function CarRow({ car, owned, selected, canAfford, onSelect, onBuy }: {
  car: Car
  owned: boolean
  selected: boolean
  canAfford: boolean
  onSelect: () => void
  onBuy: () => void
}) {
  return (
    <button
      onClick={owned ? onSelect : (canAfford ? onBuy : undefined)}
      className={`relative w-full text-left rounded-lg border transition-all p-3 flex gap-3 ${
        selected
          ? 'border-amber-400 bg-amber-400/10'
          : owned
          ? 'border-white/20 bg-white/5 hover:bg-white/10'
          : 'border-white/10 bg-black/30 opacity-70'
      }`}
    >
      <CarPreview car={car} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-[8px] tracking-[3px] font-mono text-white/50">{car.tag}</div>
        <div className="font-mono font-bold text-white text-sm truncate">{car.name}</div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-white/40 w-10">PWR</span>
            <StatBar value={car.powerStat} color="#ef4444" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-white/40 w-10">GRIP</span>
            <StatBar value={car.gripStat} color="#22c55e" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-white/40 w-10">MASS</span>
            <StatBar value={car.weightStat} color="#3b82f6" />
          </div>
        </div>
        {!owned && (
          <div className={`mt-2 text-center text-[10px] font-mono font-bold tracking-widest rounded py-1 ${
            canAfford ? 'text-black bg-amber-300' : 'text-white/40 bg-white/5'
          }`}>
            {canAfford ? `BUY R${car.price.toLocaleString()}` : `R${car.price.toLocaleString()} — NEED MORE`}
          </div>
        )}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 text-[8px] font-mono text-amber-400 tracking-widest">SELECTED</div>
      )}
    </button>
  )
}

function TireRow({ tire, selected, canAfford, onSelect }: {
  tire: Tire
  selected: boolean
  canAfford: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!canAfford && !selected}
      className={`w-full text-left rounded-lg border transition-all p-3 ${
        selected
          ? 'border-amber-400 bg-amber-400/10'
          : canAfford
          ? 'border-white/20 bg-white/5 hover:bg-white/10'
          : 'border-white/10 bg-black/30 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold text-white text-xs truncate">{tire.name}</div>
          <div className="text-[9px] font-mono text-white/50 mt-0.5">{tire.desc}</div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-white/40 w-8">GRIP</span>
              <StatBar value={tire.gripStat} color="#22c55e" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-white/40 w-8">LIFE</span>
              <StatBar value={tire.lifeStat} color="#3b82f6" />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[9px] font-mono text-amber-300">R{tire.price}</div>
          {selected && (
            <div className="mt-1 text-[8px] font-mono text-amber-400 tracking-widest">MOUNTED</div>
          )}
        </div>
      </div>
    </button>
  )
}

function StepHeader({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step)
  return (
    <div className="flex items-center gap-2 mb-4">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`size-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-bold ${
              i < idx
                ? 'bg-emerald-400 border-emerald-400 text-black'
                : i === idx
                ? 'border-amber-300 text-amber-300'
                : 'border-white/20 text-white/40'
            }`}
            aria-current={i === idx ? 'step' : undefined}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-[10px] font-mono tracking-[2px] ${
            i === idx ? 'text-amber-300' : i < idx ? 'text-white/60' : 'text-white/30'
          }`}>{STEP_LABEL[s].toUpperCase()}</span>
          {i < STEPS.length - 1 && <div className="w-3 h-px bg-white/20" />}
        </div>
      ))}
    </div>
  )
}

// ── Carousel: pick one car at a time with left/right ──────────────────────────
function CarCarousel({
  cars, currentId, ownedIds, money, onSelect, onBuy, onContinue,
}: {
  cars: Car[]
  currentId: string
  ownedIds: string[]
  money: number
  onSelect: (id: string) => void
  onBuy: (c: Car) => void
  onContinue: () => void
}) {
  const startIdx = Math.max(0, cars.findIndex(c => c.id === currentId))
  const [idx, setIdx] = useState(startIdx)
  const car = cars[idx]
  const owned = ownedIds.includes(car.id)
  const canAfford = money >= car.price

  const go = (delta: number) =>
    setIdx(i => (i + delta + cars.length) % cars.length)

  return (
    <div className="space-y-3">
      <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase text-center">
        Pick your ride
      </div>

      <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-amber-950/20 via-black/60 to-black/70 backdrop-blur-md overflow-hidden py-6 px-3">
        {/* Spotlight glow */}
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(252,208,11,0.18), transparent 60%)' }}
        />

        {/* Index dots */}
        <div className="flex justify-center gap-1 mb-3">
          {cars.map((c, i) => (
            <span
              key={c.id}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === idx ? '#fcd00b' : ownedIds.includes(c.id) ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)',
                transform: i === idx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div className="flex items-stretch gap-2">
          <button
            onClick={() => go(-1)}
            aria-label="Previous car"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 active:bg-amber-400/10 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ‹
          </button>

          <div className="flex-1 flex flex-col items-center text-center px-1">
            {/* Big car preview with subtle float animation */}
            <div className="relative" style={{ filter: owned ? 'none' : 'grayscale(0.6) brightness(0.7)' }}>
              <div
                className="absolute -inset-4 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(252,208,11,0.18) 0%, transparent 65%)' }}
              />
              <div className="relative animate-[carfloat_3s_ease-in-out_infinite]">
                <CarPreview car={car} size="lg" />
              </div>
            </div>
            <div className="mt-4 text-[9px] tracking-[4px] font-mono text-amber-300/80 uppercase">
              {car.tag}
            </div>
            <div className="mt-1 font-mono font-extrabold text-white text-lg leading-tight">
              {car.name}
            </div>

            {/* Stat bars */}
            <div className="w-full max-w-[220px] mt-4 space-y-1.5">
              <StatRow label="PWR" value={car.powerStat} color="#ef4444" />
              <StatRow label="GRIP" value={car.gripStat} color="#22c55e" />
              <StatRow label="MASS" value={car.weightStat} color="#3b82f6" />
            </div>
          </div>

          <button
            onClick={() => go(1)}
            aria-label="Next car"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 active:bg-amber-400/10 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ›
          </button>
        </div>

        <style jsx>{`
          @keyframes carfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        `}</style>
      </div>

      {/* Action button */}
      {owned ? (
        <button
          onClick={() => { onSelect(car.id); onContinue() }}
          className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(252,208,11,0.3)]"
        >
          DRIVE {car.name.split(' ').slice(-1)} ▸
        </button>
      ) : canAfford ? (
        <button
          onClick={() => onBuy(car)}
          className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-emerald-300 hover:bg-emerald-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          BUY R{car.price.toLocaleString()}
        </button>
      ) : (
        <button disabled className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-bold text-white/40 bg-white/5 py-3 cursor-not-allowed">
          R{car.price.toLocaleString()} — NEED MORE RANDS
        </button>
      )}
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/45 w-9 tracking-[1.5px]">{label}</span>
      <StatBar value={value} color={color} />
    </div>
  )
}

// ── Tire carousel ─────────────────────────────────────────────────────────────
function TireCarousel({
  tires, currentId, tireHealth, onSelect,
}: {
  tires: Tire[]
  currentId: string
  tireHealth: number
  onSelect: (id: string) => void
}) {
  const startIdx = Math.max(0, tires.findIndex(t => t.id === currentId))
  const [idx, setIdx] = useState(startIdx)
  const tire = tires[idx]
  const isFitted = tire.id === currentId

  const go = (delta: number) =>
    setIdx(i => (i + delta + tires.length) % tires.length)

  return (
    <div className="space-y-3">
      <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase text-center">
        Mount your tyres
      </div>

      <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/40 via-black/60 to-black/70 backdrop-blur-md overflow-hidden py-6 px-3">
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 60%)' }}
        />

        {/* Index dots */}
        <div className="flex justify-center gap-1 mb-3">
          {tires.map((t, i) => (
            <span
              key={t.id}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === idx ? '#fcd00b' : 'rgba(255,255,255,0.18)',
                transform: i === idx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div className="flex items-stretch gap-2">
          <button
            onClick={() => go(-1)}
            aria-label="Previous tyre"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ‹
          </button>

          <div className="flex-1 flex flex-col items-center text-center px-1">
            <TirePreview />
            <div className="mt-3 font-mono font-extrabold text-white text-base leading-tight">
              {tire.name}
            </div>
            <div className="mt-1 text-[10px] font-mono text-white/50">{tire.desc}</div>
            <div className="mt-1 text-[10px] font-mono text-amber-300/90">R{tire.price}</div>
            <div className="w-full max-w-[200px] mt-3 space-y-1.5">
              <StatRow label="GRIP" value={tire.gripStat} color="#22c55e" />
              <StatRow label="LIFE" value={tire.lifeStat} color="#3b82f6" />
            </div>
            {isFitted && (
              <div className="mt-2 text-[9px] font-mono text-amber-300 tracking-[3px]">CURRENTLY FITTED · {Math.floor(tireHealth)}%</div>
            )}
          </div>

          <button
            onClick={() => go(1)}
            aria-label="Next tyre"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ›
          </button>
        </div>
      </div>

      <button
        onClick={() => onSelect(tire.id)}
        className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(252,208,11,0.3)]"
      >
        FIT FRESH ▸
      </button>
    </div>
  )
}

function TirePreview() {
  return (
    <svg viewBox="0 0 100 100" width={96} height={96} aria-hidden="true">
      <defs>
        <radialGradient id="tireG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a2a30" />
          <stop offset="70%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#tireG)" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Tread blocks */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        const x1 = 50 + Math.cos(a) * 38
        const y1 = 50 + Math.sin(a) * 38
        const x2 = 50 + Math.cos(a) * 46
        const y2 = 50 + Math.sin(a) * 46
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      })}
      {/* Rim */}
      <circle cx="50" cy="50" r="22" fill="#1a1a20" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {/* Spokes */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        return <line key={i} x1="50" y1="50" x2={50 + Math.cos(a) * 20} y2={50 + Math.sin(a) * 20} stroke="#3a3a44" strokeWidth="3" />
      })}
      <circle cx="50" cy="50" r="4" fill="#fcd00b" opacity="0.8" />
    </svg>
  )
}

export default function SpinnaGarage({ save, onSave, onPlay, player, onLogin, onLogout }: SpinnaGarageProps) {
  const [step, setStep] = useState<Step>('car')

  const car = CARS.find(c => c.id === save.car)!
  const tire = TIRES.find(t => t.id === save.tires)!
  const ownedCars = CARS.filter(c => save.ownedCars.includes(c.id))
  const unownedCars = CARS.filter(c => !save.ownedCars.includes(c.id))

  const selectCar = useCallback((carId: string) => {
    if (save.ownedCars.includes(carId)) {
      onSave({ ...save, car: carId })
      setStep('tires')
    }
  }, [save, onSave])

  const buyCar = useCallback((c: Car) => {
    if (save.money < c.price) return
    onSave({
      ...save,
      money: save.money - c.price,
      car: c.id,
      ownedCars: [...save.ownedCars, c.id],
    })
    setStep('tires')
  }, [save, onSave])

  const selectTire = useCallback((tireId: string) => {
    const t = TIRES.find(x => x.id === tireId)!
    // First selection of a tire is free in this build (no separate purchase flow). Just mount it.
    onSave({ ...save, tires: tireId, tireHealth: 100 })
    void t
    setStep('spin')
  }, [save, onSave])

  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[8px] tracking-[5px] font-mono text-white/40 uppercase">Spinna</div>
            <h1 className="font-mono font-black text-2xl text-amber-300 tracking-wide">GARAGE</h1>
          </div>
          <div className="flex items-center gap-2">
            {player ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/60">{player.username}</span>
                <button
                  onClick={onLogout}
                  className="text-[9px] font-mono text-white/30 hover:text-white/60 transition px-2 py-1 border border-white/10 rounded"
                >
                  OUT
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="text-[10px] font-mono text-amber-300 hover:text-amber-200 transition px-2 py-1 border border-amber-400/30 rounded"
              >
                LOGIN
              </button>
            )}
          </div>
        </div>

        {/* Wallet / best */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-black/40 rounded-lg border border-white/10 px-3 py-2">
            <div className="text-[8px] tracking-[3px] font-mono text-white/40">WALLET</div>
            <div className="font-mono font-black text-emerald-400 text-xl tabular-nums">
              R{save.money.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 rounded-lg border border-white/10 px-3 py-2">
            <div className="text-[8px] tracking-[3px] font-mono text-white/40">BEST PAYOUT</div>
            <div className="font-mono font-black text-white text-xl tabular-nums">
              R{save.bestPayout.toLocaleString()}
            </div>
          </div>
        </div>

        <StepHeader step={step} />

        {/* ── Step 1: Pick your ride — single-car spotlight carousel ──────── */}
        {step === 'car' && (
          <CarCarousel
            cars={CARS}
            currentId={save.car}
            ownedIds={save.ownedCars}
            money={save.money}
            onSelect={selectCar}
            onBuy={buyCar}
            onContinue={() => setStep('tires')}
          />
        )}

        {/* ── Step 2: Pick your tyres — single-tire spotlight carousel ────── */}
        {step === 'tires' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('car')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to ride
            </button>
            <TireCarousel
              tires={TIRES}
              currentId={save.tires}
              tireHealth={save.tireHealth}
              onSelect={selectTire}
            />
          </div>
        )}

        {/* ── Step 3: Confirm & spin ──────────────────────────────────────── */}
        {step === 'spin' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('tires')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to tyres
            </button>
            <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase">
              Ready to spin
            </div>
            <div className="bg-black/40 rounded-lg border border-white/10 p-4 flex items-center gap-4">
              <CarPreview car={car} size="md" />
              <div className="flex-1">
                <div className="text-[8px] tracking-[3px] font-mono text-white/50">{car.tag}</div>
                <div className="font-mono font-bold text-white text-base">{car.name}</div>
                <div className="text-[10px] font-mono text-white/50 mt-1">on {tire.name}</div>
              </div>
            </div>

            <button
              onClick={onPlay}
              className="w-full rounded font-mono text-[15px] tracking-[6px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-4 shadow-[0_0_32px_rgba(252,208,11,0.4)]"
            >
              SPIN ▸
            </button>

            <div className="flex justify-center text-[10px] font-mono text-white/40">
              <a href="/leaderboard" className="hover:text-amber-300 transition">LEADERBOARD</a>
            </div>

          </div>
        )}

        {/* Guest sign-in nudge (every step) */}
        {!player && (
          <div className="mt-6 text-center">
            <a
              href="/auth/login"
              className="text-[10px] font-mono text-white/35 hover:text-amber-300 transition"
            >
              Sign in to save scores →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
