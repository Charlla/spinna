'use client'

import { useCallback } from 'react'
import { CARS, TIRES, SaveData, Car, Tire } from '@/lib/spinna-data'

interface SpinnaGarageProps {
  save: SaveData
  onSave: (save: SaveData) => void
  onPlay: () => void
  player: { username: string } | null
  onLogin: () => void
  onLogout: () => void
}

function StatBar({ value, color = '#fcd00b' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function CarCard({ car, owned, selected, onSelect, onBuy, money }: {
  car: Car
  owned: boolean
  selected: boolean
  onSelect: () => void
  onBuy: () => void
  money: number
}) {
  const canAfford = money >= car.price
  return (
    <button
      onClick={owned ? onSelect : canAfford ? onBuy : undefined}
      className={`relative w-full text-left rounded-lg border transition-all p-3 ${
        selected
          ? 'border-amber-400 bg-amber-400/10'
          : owned
          ? 'border-white/20 bg-white/5 hover:bg-white/10'
          : 'border-white/10 bg-black/30 opacity-70'
      }`}
    >
      {/* Car color swatch */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-12 rounded flex-shrink-0 relative"
          style={{ backgroundColor: car.color, border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {car.accentColor === 'M-stripe' && (
            <div className="absolute inset-x-0" style={{ top: '50%', transform: 'translateY(-50%)' }}>
              <div className="h-0.5 w-full" style={{ backgroundColor: '#1c69d4' }} />
              <div className="h-0.5 w-full" style={{ backgroundColor: '#3e1f7d' }} />
              <div className="h-0.5 w-full" style={{ backgroundColor: '#e30613' }} />
            </div>
          )}
        </div>
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
        </div>
      </div>

      {!owned && (
        <div className={`mt-2 text-center text-[10px] font-mono font-bold tracking-widest rounded py-1 ${
          canAfford ? 'text-black bg-amber-300' : 'text-white/40 bg-white/5'
        }`}>
          {canAfford ? `BUY R${car.price.toLocaleString()}` : `R${car.price.toLocaleString()} — NEED MORE RANDS`}
        </div>
      )}
      {selected && (
        <div className="absolute top-2 right-2 text-[8px] font-mono text-amber-400 tracking-widest">SELECTED</div>
      )}
    </button>
  )
}

function TireCard({ tire, selected, onSelect }: {
  tire: Tire
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border transition-all p-3 ${
        selected
          ? 'border-amber-400 bg-amber-400/10'
          : 'border-white/20 bg-white/5 hover:bg-white/10'
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
        </div>
      </div>
      {selected && (
        <div className="mt-1 text-[8px] font-mono text-amber-400 tracking-widest text-right">MOUNTED</div>
      )}
    </button>
  )
}

export default function SpinnaGarage({ save, onSave, onPlay, player, onLogin, onLogout }: SpinnaGarageProps) {
  const selectCar = useCallback((carId: string) => {
    if (save.ownedCars.includes(carId)) {
      onSave({ ...save, car: carId })
    }
  }, [save, onSave])

  const buyCar = useCallback((car: Car) => {
    if (save.money < car.price) return
    onSave({
      ...save,
      money: save.money - car.price,
      car: car.id,
      ownedCars: [...save.ownedCars, car.id],
    })
  }, [save, onSave])

  const selectTire = useCallback((tireId: string) => {
    onSave({ ...save, tires: tireId, tireHealth: 100 })
  }, [save, onSave])

  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Money + best */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-black/40 rounded-lg border border-white/10 px-4 py-3">
            <div className="text-[8px] tracking-[3px] font-mono text-white/40">WALLET</div>
            <div className="font-mono font-black text-emerald-400 text-2xl tabular-nums">
              R{save.money.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 rounded-lg border border-white/10 px-4 py-3">
            <div className="text-[8px] tracking-[3px] font-mono text-white/40">BEST PAYOUT</div>
            <div className="font-mono font-black text-white text-2xl tabular-nums">
              R{save.bestPayout.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Car selection */}
        <div className="mb-5">
          <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase mb-3">Vehicle</div>
          <div className="space-y-2">
            {CARS.map(car => (
              <CarCard
                key={car.id}
                car={car}
                owned={save.ownedCars.includes(car.id)}
                selected={save.car === car.id}
                money={save.money}
                onSelect={() => selectCar(car.id)}
                onBuy={() => buyCar(car)}
              />
            ))}
          </div>
        </div>

        {/* Tire selection */}
        <div className="mb-6">
          <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase mb-3">Tyres</div>
          <div className="space-y-2">
            {TIRES.map(tire => (
              <TireCard
                key={tire.id}
                tire={tire}
                selected={save.tires === tire.id}
                onSelect={() => selectTire(tire.id)}
              />
            ))}
          </div>
        </div>

        {/* Current tire health */}
        <div className="mb-6 bg-black/40 rounded-lg border border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-white/40 tracking-[3px]">TYRE HEALTH</span>
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
          {save.tireHealth < 100 && (
            <div className="mt-2 text-[9px] font-mono text-white/40">
              New tyres fitted when you change selection above.
            </div>
          )}
        </div>

        {/* Spin button */}
        <button
          onClick={onPlay}
          className="w-full rounded font-mono text-[15px] tracking-[6px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-4 shadow-[0_0_32px_rgba(252,208,11,0.4)] mb-4"
        >
          SPIN ▸
        </button>

        {/* Nav links */}
        <div className="flex gap-4 justify-center text-[10px] font-mono text-white/40">
          <a href="/leaderboard" className="hover:text-amber-300 transition">LEADERBOARD</a>
        </div>

        {/* Guest hint */}
        {!player && (
          <div className="mt-4 text-center">
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
