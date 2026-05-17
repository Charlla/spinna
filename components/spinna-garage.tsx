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

        {/* ── Step 1: Pick your ride ──────────────────────────────────────── */}
        {step === 'car' && (
          <div className="space-y-4">
            <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase">
              Pick your ride
            </div>

            {/* Owned cars first */}
            <div className="space-y-2">
              <div className="text-[8px] tracking-[3px] font-mono text-white/30 uppercase">
                Your stable ({ownedCars.length})
              </div>
              {ownedCars.map(c => (
                <CarRow
                  key={c.id}
                  car={c}
                  owned
                  selected={save.car === c.id}
                  canAfford
                  onSelect={() => selectCar(c.id)}
                  onBuy={() => {}}
                />
              ))}
            </div>

            {/* Dealer */}
            {unownedCars.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[8px] tracking-[3px] font-mono text-white/30 uppercase">
                  Dealer
                </div>
                {unownedCars.map(c => (
                  <CarRow
                    key={c.id}
                    car={c}
                    owned={false}
                    selected={false}
                    canAfford={save.money >= c.price}
                    onSelect={() => {}}
                    onBuy={() => buyCar(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Pick your tyres ─────────────────────────────────────── */}
        {step === 'tires' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('car')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to ride
            </button>
            <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase">
              Mount your tyres
            </div>
            {/* Currently-fitted health bar */}
            <div className="bg-black/40 rounded-lg border border-white/10 px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-white/40 tracking-[3px]">CURRENT</span>
                <span className="text-[9px] font-mono text-white/60">{Math.floor(save.tireHealth)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${save.tireHealth}%`,
                    backgroundColor: save.tireHealth > 50 ? '#22c55e' : save.tireHealth > 20 ? '#f97316' : '#ef4444'
                  }}
                />
              </div>
              <div className="mt-1 text-[9px] font-mono text-white/40">Picking a tyre fits a fresh set.</div>
            </div>
            <div className="space-y-2">
              {TIRES.map(t => (
                <TireRow
                  key={t.id}
                  tire={t}
                  selected={save.tires === t.id}
                  canAfford
                  onSelect={() => selectTire(t.id)}
                />
              ))}
            </div>
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
