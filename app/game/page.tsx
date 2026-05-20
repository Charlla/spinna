'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import SpinnaHud from '@/components/spinna-hud'
import SpinnaControls from '@/components/spinna-controls'
import SpinnaTunePanel from '@/components/spinna-tune-panel'
import PauseOverlay from '@/components/games/PauseOverlay'
import NeonButton from '@/components/games/NeonButton'
import { SpinnaCanvasHandle } from '@/components/spinna-canvas'
import { SAVE_KEY, TUNE_KEY, DEFAULT_SAVE, DEFAULT_TUNE, SaveData, TuneData, GameStats } from '@/lib/spinna-data'

// Load canvas client-side only (uses browser APIs)
const SpinnaCanvas = dynamic(() => import('@/components/spinna-canvas'), { ssr: false })

interface GameResult {
  score: number
  payout: number
  totalSpins: number
  maxCombo: number
  newBest: boolean
  reason: 'cashout' | 'tires'
}

export default function GamePage() {
  const router = useRouter()
  const canvasRef = useRef<SpinnaCanvasHandle>(null)
  const inputsRef = useRef<{ throttle: number; steer: number; hbrk: boolean }>({ throttle: 0, steer: 0, hbrk: false })
  const tuneRef = useRef<TuneData>({ ...DEFAULT_TUNE })
  const [tune, setTune] = useState<TuneData>({ ...DEFAULT_TUNE })
  const [tuneOpen, setTuneOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [save, setSave] = useState<SaveData>({ ...DEFAULT_SAVE })
  const [view, setView] = useState<'play' | 'results'>('play')
  const [stats, setStats] = useState<GameStats>({
    score: 0, comboDeg: 0, mult: 1, speedKmh: 0,
    tireHealth: 100, tireName: '', totalSpins: 0, maxCombo: 0,
    damageBumps: 0, damagePenalty: 0, lastBumpCost: 0,
    mode: 'free', targetsHit: 0, targetsTotal: 0, targetProgress: 0,
  })
  const [banner, setBanner] = useState({ key: 0, text: '', sub: '', color: '#fcd00b' })
  const [result, setResult] = useState<GameResult | null>(null)
  const [resetKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [player, setPlayer] = useState<{ username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [loaded, setLoaded] = useState(false)

  // Load save + tune + player
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('spinna_game_save') ?? localStorage.getItem(SAVE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setSave({ ...DEFAULT_SAVE, ...parsed })
      }
    } catch { /* ignore */ }

    try {
      const tRaw = localStorage.getItem(TUNE_KEY)
      if (tRaw) {
        const parsed = JSON.parse(tRaw)
        const merged: TuneData = { ...DEFAULT_TUNE, ...parsed }
        setTune(merged)
        tuneRef.current = merged
      }
    } catch { /* ignore */ }

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.player) setPlayer(data.player) })
      .catch(() => {})

    setLoaded(true)
  }, [])

  // Start game once the save has been hydrated AND the canvas is ready.
  // Previously the start poll fired on the first render with DEFAULT_SAVE before
  // the load effect set the saved track — the stale closure then called start()
  // with track='donut' even when the user had picked another. Wait for `loaded`.
  useEffect(() => {
    if (started || !loaded) return
    let cancelled = false
    const tryStart = () => {
      if (cancelled) return
      if (canvasRef.current) {
        canvasRef.current.start(save.car, save.tires, save.tireHealth, save.track ?? 'donut', save.mode ?? 'free')
        setStarted(true)
      } else {
        setTimeout(tryStart, 100)
      }
    }
    tryStart()
    return () => { cancelled = true }
  }, [save.car, save.tires, save.tireHealth, save.track, started, loaded])

  // HUD update loop
  useEffect(() => {
    if (view !== 'play') return
    let raf: number
    const tick = () => {
      if (canvasRef.current?.isRunning()) {
        setStats(canvasRef.current.getStats())
      } else if (started) {
        const st = canvasRef.current?.getStats() ?? stats
        handleEnd(st, 'tires')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, started])

  const handleEnd = useCallback((finalStats: GameStats, reason: 'cashout' | 'tires') => {
    canvasRef.current?.stop()
    const payout = finalStats.score
    const newBest = payout > save.bestPayout

    const newSave: SaveData = {
      ...save,
      money: save.money + payout,
      tireHealth: Math.max(0, finalStats.tireHealth),
      bestPayout: Math.max(save.bestPayout, payout),
      bestScore: Math.max(save.bestScore, finalStats.score),
      totalLifetimeRands: save.totalLifetimeRands + payout,
    }
    setSave(newSave)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(newSave)) } catch { /* ignore */ }

    setResult({
      score: finalStats.score,
      payout,
      totalSpins: finalStats.totalSpins,
      maxCombo: finalStats.maxCombo,
      newBest,
      reason,
    })
    setView('results')
  }, [save])

  const handleCashOut = useCallback(() => {
    const finalStats = canvasRef.current?.getStats() ?? stats
    handleEnd(finalStats, 'cashout')
  }, [handleEnd, stats])

  const handleExit = useCallback(() => {
    const finalStats = canvasRef.current?.getStats() ?? stats
    canvasRef.current?.stop()
    const newSave: SaveData = {
      ...save,
      tireHealth: Math.max(0, finalStats.tireHealth),
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(newSave)) } catch { /* ignore */ }
    router.push('/')
  }, [stats, save, router])

  const handleBanner = useCallback((text: string, sub: string, color: string) => {
    setBanner(prev => ({ key: prev.key + 1, text, sub, color }))
  }, [])

  const handleTuneChange = useCallback((next: TuneData) => {
    setTune(next)
    tuneRef.current = next
  }, [])

  // Original v0 behavior: tune panel is a live side-sheet — physics keeps running
  // so the player can feel each knob change immediately.
  const openTune = useCallback(() => setTuneOpen(true), [])
  const closeTune = useCallback(() => setTuneOpen(false), [])

  const handleSubmitScore = useCallback(async () => {
    if (!result || !player || submitting || submitted) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: result.score,
          degrees: result.maxCombo,
          combo_count: result.totalSpins,
          vehicle: save.car,
          duration_sec: 0,
        }),
      })
      if (res.ok) setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }, [result, player, submitting, submitted, save.car])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0807]">
      {view === 'play' && (
        <>
          <SpinnaCanvas
            ref={canvasRef}
            inputsRef={inputsRef}
            tuneRef={tuneRef}
            active={view === 'play' && !menuOpen}
            onBanner={handleBanner}
          />
          <SpinnaHud
            money={save.money}
            stats={stats}
            bannerKey={banner.key}
            bannerText={banner.text}
            bannerSub={banner.sub}
            bannerColor={banner.color}
            onCashOut={handleCashOut}
            onMenu={() => setMenuOpen(true)}
          />
          <SpinnaControls inputsRef={inputsRef} resetKey={resetKey} />
          <SpinnaTunePanel
            open={tuneOpen}
            tune={tune}
            onChange={handleTuneChange}
            onClose={closeTune}
          />
          <PauseOverlay
            open={menuOpen}
            title="PAUSED"
            onResume={() => setMenuOpen(false)}
            extra={
              <NeonButton
                variant="primary"
                size="md"
                fullWidth
                onClick={() => { setMenuOpen(false); handleCashOut() }}
              >
                Cash out
              </NeonButton>
            }
            onSettings={() => { setMenuOpen(false); openTune() }}
            onQuit={() => { setMenuOpen(false); handleExit() }}
          />
        </>
      )}

      {view === 'results' && result && (
        <ResultsScreen
          result={result}
          player={player}
          submitting={submitting}
          submitted={submitted}
          onSubmit={handleSubmitScore}
          onBack={() => router.push('/')}
          onLeaderboard={() => router.push('/leaderboard')}
        />
      )}
    </main>
  )
}

function ResultsScreen({
  result,
  player,
  submitting,
  submitted,
  onSubmit,
  onBack,
  onLeaderboard,
}: {
  result: GameResult
  player: { username: string } | null
  submitting: boolean
  submitted: boolean
  onSubmit: () => void
  onBack: () => void
  onLeaderboard: () => void
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-[#0a0807]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-4">
          <div
            className="font-mono font-black text-2xl tracking-widest"
            style={{ color: result.reason === 'tires' ? '#ff2d2d' : '#22c55e' }}
          >
            {result.reason === 'tires' ? 'TYRES POPPED' : 'CASHED OUT'}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/55 backdrop-blur-md p-5">
          <div className="text-center">
            <div className="text-[9px] tracking-[3px] font-mono text-white/55">PAYOUT</div>
            <div className="mt-1 font-mono font-extrabold text-emerald-400 text-5xl tabular-nums">
              R{result.payout.toLocaleString()}
            </div>
            {result.newBest && (
              <div className="mt-1 text-[10px] tracking-[3px] font-mono text-amber-300">
                NEW PERSONAL BEST
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <StatCell label="SCORE" value={result.score.toLocaleString()} />
            <StatCell label="SPINS" value={String(result.totalSpins)} />
            <StatCell label="MAX SPIN" value={`${Math.floor(result.maxCombo)}°`} />
          </div>
        </div>

        {player && !submitted && (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="mt-4 w-full rounded font-mono text-[12px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 disabled:opacity-50 transition py-3"
          >
            {submitting ? 'SUBMITTING…' : 'SUBMIT TO LEADERBOARD ▸'}
          </button>
        )}
        {!player && (
          <div className="mt-4 text-center text-[11px] font-mono text-white/55">
            <Link href="/auth/login" className="text-amber-300 hover:text-amber-200 transition">
              Sign in to save your score →
            </Link>
          </div>
        )}
        {submitted && (
          <div className="mt-4 text-center text-[11px] font-mono text-emerald-400 tracking-widest">
            SCORE SUBMITTED
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onLeaderboard}
            className="rounded font-mono text-[11px] tracking-[3px] font-bold text-white/70 bg-white/5 hover:bg-white/10 transition py-3 border border-white/10"
          >
            LEADERBOARD
          </button>
          <button
            onClick={onBack}
            className="rounded font-mono text-[11px] tracking-[3px] font-bold text-white bg-white/10 hover:bg-white/20 transition py-3"
          >
            GARAGE ▸
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] tracking-[2px] font-mono text-white/55">{label}</div>
      <div className="mt-0.5 text-white text-base font-extrabold font-mono tabular-nums">{value}</div>
    </div>
  )
}
