'use client'

import { useEffect, useRef, useState } from 'react'
import { GameStats } from '@/lib/spinna-data'

interface SpinnaHudProps {
  money: number
  stats: GameStats
  bannerKey: number
  bannerText: string
  bannerSub: string
  bannerColor: string
  onCashOut: () => void
  onMenu: () => void
}

/**
 * Spinna in-game HUD.
 *  - Top-left:  SCORE + BANK chips.
 *  - Top-right: single ≡ menu chip (cash-out lives inside the menu).
 *  - Below:     compact combo · mult · spins strip + tire bar.
 *  - Center:    speed readout + milestone banner.
 *  - When tires pop: floating END ROUND button at the bottom.
 */
export default function SpinnaHud({
  money,
  stats,
  bannerKey,
  bannerText,
  bannerSub,
  bannerColor,
  onCashOut,
  onMenu,
}: SpinnaHudProps) {
  const tireH = Math.max(0, Math.min(100, stats.tireHealth))
  const popped = tireH < 1
  const [showBanner, setShowBanner] = useState(false)
  const lastKey = useRef(0)

  useEffect(() => {
    if (bannerKey === lastKey.current) return
    lastKey.current = bannerKey
    setShowBanner(true)
    const t = setTimeout(() => setShowBanner(false), 1400)
    return () => clearTimeout(t)
  }, [bannerKey])

  return (
    <>
      {/* ── Top row: score/bank chips + single ≡ menu chip ───────────────── */}
      <div className="pointer-events-none absolute top-[max(env(safe-area-inset-top),12px)] left-3 right-3 flex items-stretch gap-2 z-10">
        <div className="flex-1 min-w-0 rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px]">
          <div className="text-[8px] tracking-[2px] text-white/55 font-mono">SCORE</div>
          <div className="text-[20px] leading-none font-extrabold text-amber-300 font-mono tabular-nums truncate">
            {stats.score.toLocaleString()}
          </div>
        </div>
        <div className="flex-1 min-w-0 rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px]">
          <div className="text-[8px] tracking-[2px] text-white/55 font-mono">BANK</div>
          <div className="text-[20px] leading-none font-extrabold text-emerald-400 font-mono tabular-nums truncate">
            R{money.toLocaleString()}
          </div>
        </div>
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu (pause, cash out, settings)"
          className="pointer-events-auto shrink-0 self-stretch font-mono font-bold text-[18px] leading-none text-white/85 border border-white/25 bg-[#141418]/70 backdrop-blur-md rounded-[3px] px-[12px] active:bg-[#282832]/85"
        >
          ≡
        </button>
      </div>

      {/* ── Compact combo strip ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+54px)] left-3 right-3 flex items-center justify-between gap-2 text-[9px] font-mono text-white/50 tracking-[2px] z-10">
        <span>COMBO <b className="text-white/85">{Math.floor(stats.comboDeg)}°</b></span>
        <span>×<b className="text-white/85">{stats.mult.toFixed(1)}</b></span>
        <span>SPINS <b className="text-white/85">{stats.totalSpins}</b></span>
      </div>

      {/* ── Tire health bar ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+72px)] left-3 right-3 z-10">
        <div className="relative h-[14px] rounded-[2px] overflow-hidden border border-white/10 bg-black/55 backdrop-blur-md">
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{
              width: `${tireH}%`,
              background: 'linear-gradient(90deg,#22c55e 0%,#fcd00b 60%,#ff2d2d 100%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] tracking-[2px] font-mono">
            <span
              className="font-bold"
              style={{ color: popped ? '#ff2d2d' : tireH > 60 ? '#22c55e' : tireH > 25 ? '#fcd00b' : '#ff2d2d' }}
            >
              {popped ? 'TIRES POPPED — CASH OUT!' : stats.tireName}
            </span>
            <span className="text-white/85 tabular-nums">{tireH.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── Big speed readout ───────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+98px)] left-1/2 -translate-x-1/2 z-10 flex items-baseline gap-1.5">
        <span className="text-[24px] leading-none font-extrabold text-white tabular-nums font-mono">{stats.speedKmh}</span>
        <span className="text-[10px] tracking-[3px] font-mono text-white/55">KM/H</span>
      </div>

      {/* ── Wall-bump damage popup (red −R cost, flashes for ~1s) ───────── */}
      {stats.lastBumpCost > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-[calc(max(env(safe-area-inset-top),12px)+140px)] -translate-x-1/2 z-10 text-center font-mono font-extrabold tracking-[2px]"
          style={{ color: '#ff2d2d', textShadow: '0 0 18px rgba(0,0,0,0.85)' }}
        >
          <div className="text-2xl">−R{stats.lastBumpCost.toLocaleString()}</div>
          <div className="text-[9px] tracking-[3px] text-white/70 mt-0.5">PANELBEATER</div>
        </div>
      )}

      {/* ── Damage tally (small, in the combo row corner) ───────────────── */}
      {stats.damageBumps > 0 && (
        <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+128px)] right-3 z-10 text-right">
          <div className="text-[8px] tracking-[2px] font-mono text-white/45">DAMAGE</div>
          <div className="text-[11px] font-mono text-red-400 tabular-nums">
            ×{stats.damageBumps} <span className="text-white/40">·</span> −R{stats.damagePenalty.toLocaleString()}
          </div>
        </div>
      )}

      {/* ── Target Hunt: bonus rings progress ──────────────────────────── */}
      {stats.mode === 'targets' && stats.targetsTotal > 0 && (
        <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+128px)] left-3 z-10">
          <div className="text-[8px] tracking-[2px] font-mono text-emerald-400/80">RINGS</div>
          <div className="text-[11px] font-mono text-emerald-300 tabular-nums">
            {stats.targetsHit}/{stats.targetsTotal}
            <span className="text-white/40"> · </span>
            <span className="tabular-nums">{Math.round(stats.targetProgress * 100)}%</span>
          </div>
          <div className="mt-1 h-1 w-24 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${stats.targetProgress * 100}%`,
                background: '#22c55e',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Milestone banner ────────────────────────────────────────────── */}
      <div
        key={bannerKey}
        aria-live="polite"
        className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 z-10 text-center font-mono font-extrabold tracking-[3px] transition-all duration-1000"
        style={{
          color: bannerColor,
          opacity: showBanner ? 1 : 0,
          transform: `translate(-50%, ${showBanner ? '0' : '-52px'}) scale(${showBanner ? 1.25 : 0.9})`,
          textShadow: '0 0 18px rgba(0,0,0,0.85)',
        }}
      >
        <div className="text-5xl">{bannerText}</div>
        <div className="text-sm tracking-[6px] mt-1 text-white/85">{bannerSub}</div>
      </div>

      {/* ── End round (tires popped) ────────────────────────────────────── */}
      {popped && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,16px)+120px)] z-20 flex justify-center">
          <button
            type="button"
            onClick={onCashOut}
            className="px-6 py-3 bg-amber-300 text-black font-mono font-extrabold tracking-[4px] text-sm rounded shadow-[0_0_24px_rgba(252,208,11,0.45)] active:scale-95 transition-transform"
          >
            END ROUND ▸
          </button>
        </div>
      )}
    </>
  )
}
