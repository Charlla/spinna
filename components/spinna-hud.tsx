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
  onTune: () => void
  onExit: () => void
}

/**
 * Spinna in-game HUD — restored to match the original v0 layout.
 *  - Top-left:  SCORE (amber) and BANK (green) chips.
 *  - Top-right: ↩ CASH, ⚙ TUNE, ✕ chip buttons.
 *  - Below:     COMBO N° · MULT ×N · SPINS N row.
 *  - Below:     14px tire health bar with green→yellow→red gradient.
 *  - Center:    Big speed number "kkk KM/H".
 *  - Center top: animated milestone banner.
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
  onTune,
  onExit,
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
      {/* ── Top row: score/bank + action chips ──────────────────────────── */}
      <div className="pointer-events-none absolute top-[max(env(safe-area-inset-top),12px)] left-3 right-3 flex items-start gap-2 z-10">
        <div className="flex-1 min-w-0 rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px]">
          <div className="text-[8px] tracking-[2px] text-white/55 font-mono">SCORE</div>
          <div className="text-[22px] leading-none font-extrabold text-amber-300 font-mono tabular-nums truncate">
            {stats.score.toLocaleString()}
          </div>
        </div>
        <div className="flex-1 min-w-0 rounded-[3px] border border-white/10 bg-[#0c0c10]/60 backdrop-blur-md px-[10px] py-[6px]">
          <div className="text-[8px] tracking-[2px] text-white/55 font-mono">BANK</div>
          <div className="text-[22px] leading-none font-extrabold text-emerald-400 font-mono tabular-nums truncate">
            R{money.toLocaleString()}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={onCashOut}
            aria-label="Cash out and end the round"
            className="font-mono font-bold text-[9px] tracking-[2px] text-emerald-300 border border-emerald-500/50 bg-[#141418]/70 backdrop-blur-md rounded-[3px] px-[11px] py-[7px] active:bg-[#282832]/85"
          >
            ↩ CASH
          </button>
          <button
            type="button"
            onClick={onTune}
            aria-label="Open tuning panel"
            className="font-mono font-bold text-[9px] tracking-[2px] text-amber-300 border border-amber-300/55 bg-[#141418]/70 backdrop-blur-md rounded-[3px] px-[11px] py-[7px] active:bg-[#282832]/85"
          >
            ⚙ TUNE
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit to garage"
            className="font-mono font-bold text-[9px] tracking-[2px] text-white/80 border border-white/20 bg-[#141418]/70 backdrop-blur-md rounded-[3px] px-[11px] py-[7px] active:bg-[#282832]/85"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Combo / mult / spins row ────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+58px)] left-3 right-3 flex items-center justify-between gap-2 text-[10px] font-mono text-white/55 tracking-[2px] z-10">
        <span>COMBO <b className="text-white/85">{Math.floor(stats.comboDeg)}°</b></span>
        <span>MULT <b className="text-white/85">×{stats.mult.toFixed(1)}</b></span>
        <span>SPINS <b className="text-white/85">{stats.totalSpins}</b></span>
      </div>

      {/* ── Tire health bar ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+78px)] left-3 right-3 z-10">
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
      <div className="pointer-events-none absolute top-[calc(max(env(safe-area-inset-top),12px)+106px)] left-1/2 -translate-x-1/2 z-10 flex items-baseline gap-1.5">
        <span className="text-[26px] leading-none font-extrabold text-white tabular-nums font-mono">{stats.speedKmh}</span>
        <span className="text-[10px] tracking-[3px] font-mono text-white/55">KM/H</span>
      </div>

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
