'use client'

import Image from 'next/image'
import { GAME_MODES } from '@/lib/spinna-data'

interface SpinnaIntroProps {
  onStart: (modeId: string) => void
  /** One-tap resume with the saved loadout (single-player modes only). */
  quickSpin?: { label: string; sub: string; onGo: () => void } | null
}

function ModeGlyph({ id, color }: { id: string; color: string }) {
  if (id === 'targets') {
    return (
      <svg width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="2.5" />
        <circle cx="28" cy="28" r="14" fill="none" stroke={color} strokeWidth="2.5" opacity="0.7" />
        <circle cx="28" cy="28" r="6" fill={color} />
      </svg>
    )
  }
  if (id === 'multiplayer') {
    return (
      <svg width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="20" cy="22" r="9" fill={color} opacity="0.92" />
        <circle cx="36" cy="22" r="9" fill={color} opacity="0.55" />
        <path d="M6 46c0-8 6-13 14-13s14 5 14 13" fill={color} opacity="0.92" />
        <path d="M22 46c0-8 6-13 14-13s14 5 14 13" fill={color} opacity="0.55" />
      </svg>
    )
  }
  if (id === 'passplay') {
    return (
      <svg width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">
        {/* Phone outline */}
        <rect x="18" y="8" width="20" height="40" rx="3" fill="none" stroke={color} strokeWidth="2.5" />
        <line x1="24" y1="44" x2="32" y2="44" stroke={color} strokeWidth="2" />
        {/* Arrow ring around — pass motion */}
        <path
          d="M8 28a20 20 0 0 1 40 0"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.55"
        />
        <polygon points="48,26 52,32 44,32" fill={color} opacity="0.7" />
      </svg>
    )
  }
  // free
  return (
    <svg width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="20" fill="none" stroke={color} strokeWidth="3" strokeDasharray="6 5" />
      <circle cx="28" cy="28" r="3" fill={color} />
    </svg>
  )
}

export default function SpinnaIntro({ onStart, quickSpin }: SpinnaIntroProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-game-deep text-game-ink">
      {/* AI-generated title art — top half */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] flex items-center justify-center"
      >
        <div
          className="relative w-[min(120vw,820px)] aspect-square opacity-90"
          style={{
            maskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)',
          }}
        >
          <Image
            src="/title-hero.png"
            alt="Spinmfana — South African car-spinning arcade game key art"
            fill
            sizes="(max-width: 820px) 120vw, 820px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/95" />

      {/* Foreground */}
      <div className="relative z-10 min-h-dvh flex flex-col">
        <div className="grow" />
        <div className="px-4 sm:px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
          <p className="font-mono text-[10px] sm:text-[11px] text-game-ink-muted tracking-[4px] uppercase text-center mb-3">
            Spin for Rands · Shisa Nyama · Donut till you drop
          </p>
          <div className="max-w-md mx-auto space-y-2.5">
            {quickSpin && (
              <button
                type="button"
                onClick={quickSpin.onGo}
                className="w-full rounded-xl px-3 py-3.5 flex items-center justify-between gap-3 font-mono text-black bg-amber-300 hover:bg-amber-200 transition active:scale-[0.985] shadow-[0_0_28px_rgba(252,208,11,0.4)]"
              >
                <div className="min-w-0 text-left">
                  <div className="font-extrabold text-base tracking-[3px]">{quickSpin.label}</div>
                  <div className="text-[10px] font-bold text-black/65 truncate mt-0.5">{quickSpin.sub}</div>
                </div>
                <div className="shrink-0 text-2xl font-bold">▸</div>
              </button>
            )}
            {GAME_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => onStart(m.id)}
                className="w-full text-left rounded-xl border bg-black/55 backdrop-blur-md px-3 py-3 flex items-center gap-3 transition active:scale-[0.985]"
                style={{
                  borderColor: `${m.accent}55`,
                  boxShadow: `0 0 18px ${m.accent}26`,
                  background: `linear-gradient(to right, ${m.accent}18, rgba(0,0,0,0.6) 60%)`,
                }}
              >
                <div
                  className="shrink-0 rounded-lg p-1"
                  style={{
                    background: `${m.accent}1a`,
                    border: `1px solid ${m.accent}33`,
                  }}
                >
                  <ModeGlyph id={m.id} color={m.accent} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono font-extrabold text-base sm:text-lg leading-tight tracking-wide"
                    style={{ color: m.accent }}
                  >
                    {m.name}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-white/70 leading-snug mt-0.5">
                    {m.subtitle}
                  </div>
                </div>
                <div
                  className="shrink-0 text-2xl font-mono font-bold"
                  style={{ color: m.accent }}
                >
                  ›
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-center text-[9px] font-mono tracking-[5px] text-game-ink-faint uppercase">
            Pick how you spin
          </div>
        </div>
      </div>
    </main>
  )
}
