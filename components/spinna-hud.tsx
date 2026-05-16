'use client'

import { useEffect, useState } from 'react'
import { GameStats } from '@/lib/spinna-data'

interface BannerState {
  key: number
  text: string
  sub: string
  color: string
}

interface SpinnaHudProps {
  money: number
  stats: GameStats
  bannerKey: number
  bannerText: string
  bannerSub: string
  bannerColor: string
  onCashOut: () => void
  onExit: () => void
}

export default function SpinnaHud({
  money,
  stats,
  bannerKey,
  bannerText,
  bannerSub,
  bannerColor,
  onCashOut,
  onExit,
}: SpinnaHudProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [banner, setBanner] = useState<BannerState>({ key: 0, text: '', sub: '', color: '#fcd00b' })

  useEffect(() => {
    if (!bannerText) return
    setBanner({ key: bannerKey, text: bannerText, sub: bannerSub, color: bannerColor })
    setShowBanner(true)
    const t = setTimeout(() => setShowBanner(false), 1800)
    return () => clearTimeout(t)
  }, [bannerKey, bannerText, bannerSub, bannerColor])

  const tireColor = stats.tireHealth > 50 ? '#22c55e' : stats.tireHealth > 20 ? '#f97316' : '#ef4444'
  const tireW = Math.max(0, stats.tireHealth)

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-3 gap-2">
        {/* Score + combo */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[120px]">
          <div className="text-[8px] tracking-[3px] font-mono text-white/50 uppercase">Score</div>
          <div className="font-mono font-extrabold text-white text-xl tabular-nums leading-none">
            R{stats.score.toLocaleString()}
          </div>
          {stats.comboDeg > 0 && (
            <div className="mt-1 text-[10px] font-mono text-amber-300">
              {Math.floor(stats.comboDeg)}° · x{stats.mult.toFixed(1)}
            </div>
          )}
        </div>

        {/* Speed */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
          <div className="text-[8px] tracking-[3px] font-mono text-white/50 uppercase">km/h</div>
          <div className="font-mono font-extrabold text-white text-xl tabular-nums leading-none">
            {stats.speedKmh}
          </div>
        </div>

        {/* Money */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-right">
          <div className="text-[8px] tracking-[3px] font-mono text-white/50 uppercase">Wallet</div>
          <div className="font-mono font-extrabold text-emerald-400 text-xl tabular-nums leading-none">
            R{money.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tire health bar */}
      <div className="absolute bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-48">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] tracking-[3px] font-mono text-white/50 uppercase">Tyres</span>
            <span className="text-[9px] font-mono text-white/70">{stats.tireName}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${tireW}%`, backgroundColor: tireColor }}
            />
          </div>
          <div className="mt-0.5 text-right text-[9px] font-mono" style={{ color: tireColor }}>
            {Math.floor(stats.tireHealth)}%
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute bottom-4 left-3 right-3 flex gap-2 pointer-events-auto">
        <button
          onClick={onExit}
          className="flex-1 rounded font-mono text-[11px] tracking-[3px] font-bold text-white/70 bg-black/70 hover:bg-white/10 active:scale-[0.98] transition py-3 border border-white/10"
        >
          EXIT
        </button>
        <button
          onClick={onCashOut}
          className="flex-[2] rounded font-mono text-[12px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 active:scale-[0.99] transition py-3 shadow-[0_0_20px_rgba(252,208,11,0.4)]"
        >
          CASH OUT ▸ R{stats.score.toLocaleString()}
        </button>
      </div>

      {/* Milestone banner */}
      {showBanner && banner.text && (
        <div
          key={banner.key}
          className="absolute inset-x-0 flex flex-col items-center justify-center"
          style={{ top: '35%', pointerEvents: 'none' }}
        >
          <div
            className="font-mono font-black text-4xl sm:text-5xl tracking-[6px] drop-shadow-lg animate-[spinBanner_1.8s_ease-out_forwards]"
            style={{ color: banner.color, textShadow: `0 0 40px ${banner.color}` }}
          >
            {banner.text}
          </div>
          <div className="mt-1 font-mono text-xs tracking-[5px] text-white/70 uppercase">
            {banner.sub}
          </div>
        </div>
      )}
    </div>
  )
}
