'use client'

import Image from 'next/image'

interface SpinnaIntroProps {
  onStart: () => void
}

export default function SpinnaIntro({ onStart }: SpinnaIntroProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-game-deep text-game-ink">
      {/* AI-generated title art — full-bleed hero with vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
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
            alt="Spinmfana"
            fill
            sizes="(max-width: 820px) 120vw, 820px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Dim overlay to ensure text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

      {/* Diagonal ring suggesting the donut track */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="rounded-full border"
          style={{
            width: 'min(80vw, 80vh)',
            height: 'min(80vw, 80vh)',
            borderColor: 'rgba(255,255,255,0.04)',
            borderWidth: 2,
          }}
        />
        <div
          className="absolute rounded-full border-dashed"
          style={{
            width: 'min(60vw, 60vh)',
            height: 'min(60vw, 60vh)',
            borderColor: 'color-mix(in oklab, var(--game-accent) 12%, transparent)',
            borderWidth: 1,
          }}
        />
      </div>

      {/* Foreground */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center mt-[58vh] sm:mt-[60vh]">
        <p className="font-mono text-[11px] sm:text-xs text-game-ink-muted tracking-[4px] uppercase mb-6 max-w-md">
          Spin for Rands · Shisa Nyama · Donut till you drop
        </p>

        <button
          type="button"
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-10 py-4 rounded-game-pill font-mono font-black tracking-[4px] text-sm sm:text-base uppercase text-game-deep shadow-game-glow-md hover:shadow-game-glow-lg transition-shadow active:scale-[0.96]"
          style={{
            background: 'linear-gradient(180deg, var(--game-accent) 0%, color-mix(in oklab, var(--game-accent) 60%, var(--game-accent-2)) 100%)',
          }}
        >
          <span className="relative z-10">Time to Spin!</span>
        </button>

        <div className="mt-6 text-[9px] font-mono tracking-[6px] text-game-ink-faint uppercase">
          tap to enter the garage
        </div>
      </div>
    </main>
  )
}
