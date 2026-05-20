'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CARS, TIRES, TRACKS, GAME_MODES, UPGRADES, SaveData, Car, Tire, Track, UpgradeDef, type GameMode } from '@/lib/spinna-data'

interface SpinnaGarageProps {
  save: SaveData
  onSave: (save: SaveData) => void
  onPlay: () => void
  player: { username: string } | null
  onLogin: () => void
  onLogout: () => void
}

type Step = 'mode' | 'car' | 'tires' | 'upgrades' | 'track' | 'spin'
const STEPS: Step[] = ['mode', 'car', 'tires', 'upgrades', 'track', 'spin']
const STEP_LABEL: Record<Step, string> = { mode: 'Mode', car: 'Ride', tires: 'Tyres', upgrades: 'Mods', track: 'Track', spin: 'Go' }

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

// ── Track carousel — pick the spin track ──────────────────────────────────────
function TrackCarousel({
  tracks, currentId, onSelect,
}: {
  tracks: Track[]
  currentId: string
  onSelect: (id: string) => void
}) {
  const startIdx = Math.max(0, tracks.findIndex(t => t.id === currentId))
  const [idx, setIdx] = useState(startIdx)
  const track = tracks[idx]
  const go = (delta: number) =>
    setIdx(i => (i + delta + tracks.length) % tracks.length)
  return (
    <div className="space-y-3">
      <div className="text-[9px] tracking-[4px] font-mono text-white/40 uppercase text-center">
        Pick your track
      </div>
      <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/40 via-black/60 to-black/70 backdrop-blur-md overflow-hidden py-6 px-3">
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${track.accent}33, transparent 60%)` }}
        />
        <div className="flex justify-center gap-1 mb-3">
          {tracks.map((t, i) => (
            <span
              key={t.id}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === idx ? t.accent : 'rgba(255,255,255,0.18)',
                transform: i === idx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <div className="flex items-stretch gap-2">
          <button
            onClick={() => go(-1)}
            aria-label="Previous track"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ‹
          </button>
          <div className="flex-1 flex flex-col items-center text-center px-1">
            <TrackPreview track={track} />
            <div className="mt-3 text-[9px] tracking-[4px] font-mono uppercase" style={{ color: track.accent }}>
              {track.subtitle}
            </div>
            <div className="mt-1 font-mono font-extrabold text-white text-lg leading-tight">
              {track.name}
            </div>
          </div>
          <button
            onClick={() => go(1)}
            aria-label="Next track"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ›
          </button>
        </div>
      </div>
      <button
        onClick={() => onSelect(track.id)}
        className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(252,208,11,0.3)]"
      >
        SET TRACK ▸
      </button>
    </div>
  )
}

/** Tiny stylised top-down icon of each track so the picker has a real preview. */
function TrackPreview({ track }: { track: Track }) {
  const W = 110, H = 110
  switch (track.id) {
    case 'intersection':
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#1a1a1f" />
          <rect x="40" y="0" width="20" height="100" fill="#0c0c10" />
          <rect x="0" y="40" width="100" height="20" fill="#0c0c10" />
          <line x1="50" y1="0"  x2="50" y2="100" stroke={track.accent} strokeDasharray="3 2" strokeWidth="1" />
          <line x1="0"  y1="50" x2="100" y2="50" stroke={track.accent} strokeDasharray="3 2" strokeWidth="1" />
          <rect x="42" y="34" width="16" height="2" fill="#fff" />
          <rect x="42" y="64" width="16" height="2" fill="#fff" />
          <rect x="34" y="42" width="2" height="16" fill="#fff" />
          <rect x="64" y="42" width="2" height="16" fill="#fff" />
        </svg>
      )
    case 'airport':
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#1a1a1f" />
          <rect x="36" y="6" width="28" height="88" fill="#15151a" />
          <line x1="50" y1="14" x2="50" y2="86" stroke="#fff" strokeDasharray="4 3" strokeWidth="1.5" />
          {[0, 1, 2, 3].map(i => <rect key={`t${i}`} x={40 + i * 5} y="8" width="3" height="6" fill="#fff" />)}
          {[0, 1, 2, 3].map(i => <rect key={`b${i}`} x={40 + i * 5} y="86" width="3" height="6" fill="#fff" />)}
          {[0, 1, 2, 3, 4, 5].map(i => <circle key={`l${i}`} cx="34" cy={20 + i * 12} r="1" fill={track.accent} />)}
          {[0, 1, 2, 3, 4, 5].map(i => <circle key={`r${i}`} cx="66" cy={20 + i * 12} r="1" fill={track.accent} />)}
        </svg>
      )
    case 'harbour':
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#15252e" />
          {['#cc3300', '#1c69d4', '#22c55e', '#e6a300', '#06b6d4'].map((c, i) => (
            <rect key={`t${i}`} x={6 + i * 18} y="6" width="14" height="8" fill={c} />
          ))}
          {['#22c55e', '#1c69d4', '#cc3300', '#e6a300', '#06b6d4'].map((c, i) => (
            <rect key={`b${i}`} x={6 + i * 18} y="86" width="14" height="8" fill={c} />
          ))}
          {['#1c69d4', '#cc3300', '#22c55e'].map((c, i) => (
            <rect key={`l${i}`} x="6" y={24 + i * 18} width="8" height="14" fill={c} />
          ))}
          {['#cc3300', '#22c55e', '#1c69d4'].map((c, i) => (
            <rect key={`r${i}`} x="86" y={24 + i * 18} width="8" height="14" fill={c} />
          ))}
        </svg>
      )
    case 'cityblock':
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#0a0a0e" />
          {[0,1,2,3,4,5].map(i => <rect key={`t${i}`} x={6 + i * 15} y="6" width="13" height="14" fill={['#3a3a44','#2e2e36','#4a3a3a','#3a4a4a'][i%4]} />)}
          {[0,1,2,3,4,5].map(i => <rect key={`b${i}`} x={6 + i * 15} y="80" width="13" height="14" fill={['#2e2e36','#3a3a44','#3a4a4a','#4a3a3a'][i%4]} />)}
          {[0,1,2,3].map(i => <rect key={`l${i}`} x="6" y={26 + i * 13} width="14" height="11" fill={['#3a3a44','#2e2e36','#4a3a3a','#3a4a4a'][i%4]} />)}
          {[0,1,2,3].map(i => <rect key={`r${i}`} x="80" y={26 + i * 13} width="14" height="11" fill={['#2e2e36','#3a3a44','#3a4a4a','#4a3a3a'][i%4]} />)}
          <rect x="32" y="32" width="36" height="36" fill="none" stroke={track.accent} strokeDasharray="3 2" strokeWidth="0.8" />
        </svg>
      )
    case 'shisanyama':
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#2a1c10" />
          {[[20,20],[80,20],[20,80],[80,80],[10,50],[90,50]].map(([x,y], i) => (
            <g key={i}>
              <circle cx={x} cy={y - 2} r="6" fill={track.accent} opacity="0.7" />
              <circle cx={x} cy={y - 3} r="3" fill="#fff8c0" />
              <rect x={x - 4} y={y + 2} width="8" height="3" fill="#1a1a1a" />
            </g>
          ))}
          <ellipse cx="50" cy="50" rx="32" ry="22" fill="none" stroke="rgba(15,12,10,0.6)" strokeWidth="1.5" />
          <ellipse cx="50" cy="50" rx="24" ry="16" fill="none" stroke="rgba(15,12,10,0.4)" strokeWidth="1" />
        </svg>
      )
    case 'donut':
    default:
      return (
        <svg viewBox="0 0 100 100" width={W} height={H} aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="#1a1a1f" />
          <circle cx="50" cy="50" r="38" fill="#16161b" />
          <circle cx="50" cy="50" r="20" fill="#1a1a1f" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={track.accent} strokeDasharray="4 3" strokeWidth="2" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#d92d2d" strokeDasharray="3 2" strokeWidth="1.5" />
          <rect x="48" y="74" width="4" height="20" fill="#fff" />
        </svg>
      )
  }
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

// ─── Upgrade list ───────────────────────────────────────────────────────────
// Each row: tag chip + name + price/owned indicator + effects summary.
// Owned upgrades show an EQUIP/UNEQUIP toggle. Unowned show a BUY button.
function effectsSummary(effects: UpgradeDef['effects']): string {
  const parts: string[] = []
  for (const k of Object.keys(effects) as Array<keyof UpgradeDef['effects']>) {
    const v = effects[k]
    if (v == null) continue
    const pct = Math.round((v - 1) * 100)
    if (pct === 0) continue
    const sign = pct > 0 ? '+' : ''
    parts.push(`${sign}${pct}% ${k}`)
  }
  return parts.join(' · ')
}

// ─── Mode picker (front-most screen) ────────────────────────────────────────
function ModeGlyph({ id, color }: { id: string; color: string }) {
  // Tiny glyphs for each mode — saved as an inline SVG to keep tree shaking
  // happy and avoid an extra asset request.
  if (id === 'multiplayer') {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="20" cy="22" r="9" fill={color} opacity="0.92" />
        <circle cx="36" cy="22" r="9" fill={color} opacity="0.55" />
        <path d="M6 46c0-8 6-13 14-13s14 5 14 13" fill={color} opacity="0.92" />
        <path d="M22 46c0-8 6-13 14-13s14 5 14 13" fill={color} opacity="0.55" />
      </svg>
    )
  }
  if (id === 'free') {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="20" fill="none" stroke={color} strokeWidth="3" strokeDasharray="6 5" />
        <circle cx="28" cy="28" r="3" fill={color} />
      </svg>
    )
  }
  // targets
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="28" cy="28" r="14" fill="none" stroke={color} strokeWidth="2.5" opacity="0.7" />
      <circle cx="28" cy="28" r="6" fill={color} />
    </svg>
  )
}

function ModePicker({
  modes, currentId, onPick,
}: {
  modes: GameMode[]
  currentId: string | undefined
  onPick: (m: GameMode) => void
}) {
  return (
    <div className="space-y-3">
      <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase text-center">
        Pick how you spin
      </div>
      <div className="space-y-3">
        {modes.map(m => {
          const active = currentId === m.id
          return (
            <button
              key={m.id}
              onClick={() => onPick(m)}
              className="w-full text-left rounded-xl border bg-gradient-to-b from-black/60 via-black/70 to-black/85 backdrop-blur-md p-4 flex items-center gap-4 transition active:scale-[0.99]"
              style={{
                borderColor: active ? m.accent : `${m.accent}33`,
                boxShadow: active ? `0 0 24px ${m.accent}40` : `0 0 0 transparent`,
                background: active
                  ? `linear-gradient(to bottom, ${m.accent}26, rgba(0,0,0,0.7), rgba(0,0,0,0.85))`
                  : undefined,
              }}
            >
              <div className="shrink-0 rounded-lg p-1.5" style={{ background: `${m.accent}1a`, border: `1px solid ${m.accent}33` }}>
                <ModeGlyph id={m.id} color={m.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] tracking-[4px] font-mono uppercase" style={{ color: m.accent }}>
                  {m.subtitle}
                </div>
                <div className="font-mono font-extrabold text-white text-lg tracking-wide leading-tight mt-0.5">
                  {m.name}
                </div>
                <div className="text-[10px] font-mono text-white/60 mt-1 leading-snug">
                  {m.description}
                </div>
              </div>
              <div className="shrink-0 text-2xl font-mono font-bold" style={{ color: m.accent }}>›</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Upgrades carousel — focused single mod with arrows ─────────────────────
function UpgradeCarousel({
  upgrades, ownedIds, equippedIds, money, onBuy, onToggle, onContinue,
}: {
  upgrades: UpgradeDef[]
  ownedIds: string[]
  equippedIds: string[]
  money: number
  onBuy: (u: UpgradeDef) => void
  onToggle: (id: string) => void
  onContinue: () => void
}) {
  const [idx, setIdx] = useState(0)
  const u = upgrades[idx]
  const owned = ownedIds.includes(u.id)
  const equipped = equippedIds.includes(u.id)
  const canAfford = money >= u.price
  const go = (delta: number) => setIdx(i => (i + delta + upgrades.length) % upgrades.length)
  const effectLabel = effectsSummary(u.effects)
  return (
    <div className="space-y-3">
      <div className="text-[9px] tracking-[4px] font-mono text-white/45 uppercase text-center">
        Bolt on mods ({equippedIds.length} fitted)
      </div>
      <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-amber-950/15 via-black/60 to-black/75 backdrop-blur-md overflow-hidden py-5 px-3">
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(252,208,11,0.16), transparent 60%)' }}
        />
        <div className="flex justify-center gap-1 mb-3">
          {upgrades.map((mod, i) => (
            <span
              key={mod.id}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor:
                  i === idx ? '#fcd00b'
                  : equippedIds.includes(mod.id) ? 'rgba(52,211,153,0.85)'
                  : ownedIds.includes(mod.id) ? 'rgba(255,255,255,0.4)'
                  : 'rgba(255,255,255,0.12)',
                transform: i === idx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <div className="flex items-stretch gap-2">
          <button
            onClick={() => go(-1)}
            aria-label="Previous mod"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ‹
          </button>
          <div className="flex-1 flex flex-col items-center text-center px-1">
            <div className="text-[9px] tracking-[4px] font-mono text-amber-300/80 uppercase">{u.tag}</div>
            <div className="font-mono font-extrabold text-white text-lg leading-tight mt-1">{u.name}</div>
            <div className="text-[11px] font-mono text-white/65 mt-2 leading-snug max-w-[230px]">{u.desc}</div>
            <div className="text-[10px] font-mono text-white/40 mt-2 leading-snug max-w-[230px]">{effectLabel}</div>
            {equipped && (
              <div className="mt-2 text-[9px] tracking-[3px] font-mono text-emerald-300">FITTED</div>
            )}
          </div>
          <button
            onClick={() => go(1)}
            aria-label="Next mod"
            className="shrink-0 w-9 self-stretch rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white/60 hover:text-amber-300 text-2xl"
          >
            ›
          </button>
        </div>
      </div>
      {owned ? (
        <button
          onClick={() => onToggle(u.id)}
          className={`w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold transition py-3 ${
            equipped
              ? 'text-emerald-200 bg-emerald-500/20 border border-emerald-400/40'
              : 'text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] shadow-[0_0_20px_rgba(252,208,11,0.3)]'
          }`}
        >
          {equipped ? 'UNFIT' : 'FIT IT'}
        </button>
      ) : canAfford ? (
        <button
          onClick={() => onBuy(u)}
          className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-extrabold text-black bg-emerald-300 hover:bg-emerald-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          BUY R{u.price.toLocaleString()}
        </button>
      ) : (
        <button disabled className="w-full rounded-lg font-mono text-[13px] tracking-[4px] font-bold text-white/40 bg-white/5 py-3 cursor-not-allowed">
          R{u.price.toLocaleString()} — NEED MORE RANDS
        </button>
      )}
      <button
        onClick={onContinue}
        className="w-full rounded-lg font-mono text-[11px] tracking-[4px] font-bold text-white/70 border border-white/15 bg-black/30 hover:bg-white/5 transition py-2.5"
      >
        DONE WITH MODS ▸
      </button>
    </div>
  )
}

export default function SpinnaGarage({ save, onSave, onPlay, player, onLogin, onLogout }: SpinnaGarageProps) {
  const router = useRouter()
  // If save already has a mode, skip the picker on subsequent visits.
  const [step, setStep] = useState<Step>(save.mode ? 'car' : 'mode')

  const car = CARS.find(c => c.id === save.car)!
  const tire = TIRES.find(t => t.id === save.tires)!
  const ownedCars = CARS.filter(c => save.ownedCars.includes(c.id))
  const unownedCars = CARS.filter(c => !save.ownedCars.includes(c.id))

  const pickMode = useCallback((mode: GameMode) => {
    if (mode.id === 'multiplayer') {
      router.push('/online')
      return
    }
    onSave({ ...save, mode: mode.id })
    setStep('car')
  }, [save, onSave, router])

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
    setStep('upgrades')
  }, [save, onSave])

  const buyUpgrade = useCallback((upgrade: UpgradeDef) => {
    if (save.money < upgrade.price) return
    if ((save.ownedUpgrades ?? []).includes(upgrade.id)) return
    onSave({
      ...save,
      money: save.money - upgrade.price,
      ownedUpgrades: [...(save.ownedUpgrades ?? []), upgrade.id],
      equippedUpgrades: [...(save.equippedUpgrades ?? []), upgrade.id],
    })
  }, [save, onSave])

  const toggleEquip = useCallback((upgradeId: string) => {
    const owned = save.ownedUpgrades ?? []
    if (!owned.includes(upgradeId)) return
    const equipped = save.equippedUpgrades ?? []
    const next = equipped.includes(upgradeId)
      ? equipped.filter(id => id !== upgradeId)
      : [...equipped, upgradeId]
    onSave({ ...save, equippedUpgrades: next })
  }, [save, onSave])

  const selectTrack = useCallback((trackId: string) => {
    onSave({ ...save, track: trackId })
    setStep('spin')
  }, [save, onSave])

  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[8px] tracking-[5px] font-mono text-white/40 uppercase">Spinna</div>
            <h1 className="font-mono font-black text-2xl text-amber-300 tracking-wide">GARAGE</h1>
          </div>
          {player && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/60 truncate max-w-[140px]">{player.username}</span>
              <button
                onClick={onLogout}
                className="text-[9px] font-mono text-white/30 hover:text-white/60 transition px-2 py-1 border border-white/10 rounded"
              >
                OUT
              </button>
            </div>
          )}
        </div>

        {/* Sign-in prompt — front and centre when no player. */}
        {!player && (
          <button
            onClick={onLogin}
            className="w-full mb-4 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 px-4 py-3 text-left flex items-center justify-between gap-2 hover:from-amber-500/20 hover:to-amber-500/20 transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <div className="text-[9px] tracking-[3px] font-mono text-amber-300/90 uppercase">Sign in</div>
              <div className="text-[12px] font-mono text-white/80 leading-tight">
                Save your money, climb the leaderboard, host rooms.
              </div>
            </div>
            <div className="shrink-0 text-[10px] tracking-[3px] font-mono font-extrabold text-amber-300">
              SIGN IN ▸
            </div>
          </button>
        )}

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

        {/* ── Step 0: Pick a mode ──────────────────────────────────────────── */}
        {step === 'mode' && (
          <ModePicker
            modes={GAME_MODES}
            currentId={save.mode}
            onPick={pickMode}
          />
        )}

        {/* ── Step 1: Pick your ride — single-car spotlight carousel ──────── */}
        {step === 'car' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('mode')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Change mode
            </button>
            <CarCarousel
              cars={CARS}
              currentId={save.car}
              ownedIds={save.ownedCars}
              money={save.money}
              onSelect={selectCar}
              onBuy={buyCar}
              onContinue={() => setStep('tires')}
            />
          </div>
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

        {/* ── Step 3: Bolt on upgrades ────────────────────────────────────── */}
        {step === 'upgrades' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('tires')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to tyres
            </button>
            <UpgradeCarousel
              upgrades={UPGRADES}
              ownedIds={save.ownedUpgrades ?? []}
              equippedIds={save.equippedUpgrades ?? []}
              money={save.money}
              onBuy={buyUpgrade}
              onToggle={toggleEquip}
              onContinue={() => setStep('track')}
            />
          </div>
        )}

        {/* ── Step 4: Pick your track ─────────────────────────────────────── */}
        {step === 'track' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('upgrades')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to mods
            </button>
            <TrackCarousel
              tracks={TRACKS}
              currentId={save.track ?? 'donut'}
              onSelect={selectTrack}
            />
          </div>
        )}

        {/* ── Step 4: Confirm & spin ──────────────────────────────────────── */}
        {step === 'spin' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('track')}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition"
            >
              ← Back to track
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
                {(() => {
                  const t = TRACKS.find(x => x.id === (save.track ?? 'donut'))
                  return t ? (
                    <div className="text-[10px] font-mono mt-1" style={{ color: t.accent }}>
                      @ {t.name}
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            {/* Active mode display (chosen at step 1) */}
            {(() => {
              const m = GAME_MODES.find(x => x.id === save.mode) ?? GAME_MODES[1]
              return (
                <button
                  onClick={() => setStep('mode')}
                  className="w-full rounded-lg border p-3 flex items-center justify-between gap-2 transition active:scale-[0.99]"
                  style={{ borderColor: `${m.accent}55`, background: `${m.accent}14` }}
                >
                  <div className="text-left">
                    <div className="text-[9px] tracking-[3px] font-mono uppercase" style={{ color: m.accent }}>
                      Mode · {m.name}
                    </div>
                    <div className="text-[10px] font-mono text-white/65 leading-tight">{m.subtitle}</div>
                  </div>
                  <div className="text-[9px] tracking-[2px] font-mono text-white/45">CHANGE ›</div>
                </button>
              )
            })()}

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

      </div>
    </main>
  )
}
