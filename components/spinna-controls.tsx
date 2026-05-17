'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface InputState {
  throttle: number
  steer: number
  hbrk: boolean
}

interface SpinnaControlsProps {
  inputsRef: React.RefObject<InputState>
  resetKey: number
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * Spinna touch controls — restored to match the original v0 UI exactly.
 *  - Left:  148x78 thumbstick joystick (drag to steer, releases to center).
 *  - Center: 74x74 round HBRK button (hold for handbrake).
 *  - Right: 74x260 vertical throttle slider — **STICKS** where you tap.
 *           Top 72% = forward (0→1), bottom 28% = reverse (0→-0.4),
 *           with a small dead-zone around 0.
 *
 * Keyboard: W/A/S/D + arrows + space. Keyboard mode auto-zeros throttle on keyup;
 * touch slider does NOT — it stays where you put it.
 */
export default function SpinnaControls({ inputsRef, resetKey }: SpinnaControlsProps) {
  // Visual state mirrors the input ref so the on-screen knobs animate.
  const [steerVis, setSteerVis] = useState(0)
  const [throttleVis, setThrottleVis] = useState(0)
  const [hbrkVis, setHbrkVis] = useState(false)

  // Refs to DOM nodes for pointer-rect math
  const steerRef = useRef<HTMLDivElement>(null)
  const throttleRef = useRef<HTMLDivElement>(null)

  // Reset to neutral when caller bumps resetKey (e.g. new round).
  useEffect(() => {
    setSteerVis(0)
    setThrottleVis(0)
    setHbrkVis(false)
    if (inputsRef.current) {
      inputsRef.current.throttle = 0
      inputsRef.current.steer = 0
      inputsRef.current.hbrk = false
    }
  }, [resetKey, inputsRef])

  // ─── Steering pointer drag ─────────────────────────────────────────────
  const onSteerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = steerRef.current
    if (!el) return
    e.preventDefault()
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }

    const apply = (clientX: number) => {
      const r = el.getBoundingClientRect()
      const v = clamp((clientX - (r.left + r.width / 2)) / (r.width / 2 - 16), -1, 1)
      if (inputsRef.current) inputsRef.current.steer = v
      setSteerVis(v)
    }
    apply(e.clientX)

    const move = (ev: PointerEvent) => apply(ev.clientX)
    const end = () => {
      if (inputsRef.current) inputsRef.current.steer = 0
      setSteerVis(0)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }, [inputsRef])

  // ─── Throttle pointer drag (STICKS where you tap) ──────────────────────
  const onThrottlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = throttleRef.current
    if (!el) return
    e.preventDefault()
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }

    const apply = (clientY: number) => {
      const r = el.getBoundingClientRect()
      const top = r.top + 18
      const bottom = r.bottom - 18
      // o = 0..1, top of usable area = 1, bottom = 0
      const o = clamp((bottom - clientY) / (bottom - top), 0, 1)
      // Map: o>=0.28 → forward 0..1 ; o<0.28 → reverse 0..-0.4
      let v: number
      if (o >= 0.28) v = (o - 0.28) / 0.72
      else v = -((0.28 - o) / 0.28) * 0.4
      // Dead-zone around 0 so the knob can "park"
      if (v > 0 && v < 0.1) v = 0
      else if (v < 0 && v > -0.1) v = 0
      if (inputsRef.current) inputsRef.current.throttle = v
      setThrottleVis(v)
    }
    apply(e.clientY)

    const move = (ev: PointerEvent) => apply(ev.clientY)
    const end = () => {
      // STICKY: do NOT zero the throttle on release.
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }, [inputsRef])

  // ─── Handbrake (hold) ─────────────────────────────────────────────────
  const onHbrkDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    if (inputsRef.current) inputsRef.current.hbrk = true
    setHbrkVis(true)
  }, [inputsRef])

  const onHbrkUp = useCallback(() => {
    if (inputsRef.current) inputsRef.current.hbrk = false
    setHbrkVis(false)
  }, [inputsRef])

  // ─── Keyboard fallback ────────────────────────────────────────────────
  useEffect(() => {
    const held = new Set<string>()
    const isEditable = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false
      const tag = t.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
    }
    const onDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const k = e.key.toLowerCase()
      held.add(k)
      if (k === 'a' || k === 'arrowleft') {
        if (inputsRef.current) inputsRef.current.steer = -1
        setSteerVis(-1)
      }
      if (k === 'd' || k === 'arrowright') {
        if (inputsRef.current) inputsRef.current.steer = 1
        setSteerVis(1)
      }
      if (k === 'w' || k === 'arrowup') {
        if (inputsRef.current) inputsRef.current.throttle = 1
        setThrottleVis(1)
      }
      if (k === 's' || k === 'arrowdown') {
        if (inputsRef.current) inputsRef.current.throttle = -0.4
        setThrottleVis(-0.4)
      }
      if (k === ' ') {
        if (inputsRef.current) inputsRef.current.hbrk = true
        setHbrkVis(true)
        e.preventDefault()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      held.delete(k)
      if ((k === 'a' || k === 'arrowleft') && !held.has('d') && !held.has('arrowright')) {
        if (inputsRef.current) inputsRef.current.steer = 0
        setSteerVis(0)
      }
      if ((k === 'd' || k === 'arrowright') && !held.has('a') && !held.has('arrowleft')) {
        if (inputsRef.current) inputsRef.current.steer = 0
        setSteerVis(0)
      }
      if (k === 'w' || k === 'arrowup') {
        if (inputsRef.current) inputsRef.current.throttle = 0
        setThrottleVis(0)
      }
      if (k === 's' || k === 'arrowdown') {
        if (inputsRef.current) inputsRef.current.throttle = 0
        setThrottleVis(0)
      }
      if (k === ' ') {
        if (inputsRef.current) inputsRef.current.hbrk = false
        setHbrkVis(false)
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [inputsRef])

  // ─── Throttle knob position math (same as original) ────────────────────
  const d = throttleVis
  const knobTop = d >= 0 ? 72 - 72 * d : 72 + (-d / 0.4) * 28
  let fillTop: number
  let fillH: number
  if (d >= 0) {
    fillH = 72 * d
    fillTop = 72 - fillH
  } else {
    fillH = (-d / 0.4) * 28
    fillTop = 72
  }
  const knobLabel =
    d > 0.02 ? `${Math.round(100 * d)}` :
    d < -0.02 ? `R${Math.round(-(250 * d))}` :
    'N'

  return (
    <>
      {/* ── Left: Steering thumbstick ───────────────────────────────────── */}
      <div
        ref={steerRef}
        onPointerDown={onSteerPointerDown}
        className="pointer-events-auto absolute left-[18px] bottom-[calc(env(safe-area-inset-bottom,16px)+22px)] w-[148px] h-[78px] rounded-[42px] border-2 border-white/20 bg-black/45 backdrop-blur-md flex items-center justify-center overflow-hidden touch-none select-none z-20"
        aria-label="Steering"
        role="slider"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={steerVis}
      >
        {/* crosshairs */}
        <div className="absolute left-1/2 top-1/2 w-[90%] h-px bg-white/10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-1/2 top-1/2 w-px h-1/2 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
        {/* labels */}
        <span className="absolute left-3 top-1.5 text-[8px] tracking-[0.2em] text-white/45 font-mono pointer-events-none">◀ L</span>
        <span className="absolute right-3 top-1.5 text-[8px] tracking-[0.2em] text-white/45 font-mono pointer-events-none">R ▶</span>
        {/* knob */}
        <div
          className="absolute w-[62px] h-[62px] rounded-full border-2 border-white/25 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition-transform duration-75"
          style={{
            background: 'radial-gradient(circle at 50% 35%, #3a3a44, #1a1a20)',
            transform: `translateX(${43 * steerVis}px)`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-base">⇄</div>
        </div>
      </div>

      {/* ── Center: HBRK ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onPointerDown={onHbrkDown}
        onPointerUp={onHbrkUp}
        onPointerCancel={onHbrkUp}
        onPointerLeave={onHbrkUp}
        aria-pressed={hbrkVis}
        aria-label="Handbrake"
        className={[
          'pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,16px)+32px)] w-[74px] h-[74px] rounded-full border-2 backdrop-blur-md select-none flex flex-col items-center justify-center transition-transform z-20',
          hbrkVis
            ? 'border-white scale-95 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.4),rgba(40,40,50,0.85))] shadow-[0_0_18px_rgba(255,255,255,0.25)]'
            : 'border-white/40 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.14),rgba(20,20,24,0.7))]',
        ].join(' ')}
      >
        <span className="text-2xl leading-none" aria-hidden="true">✋</span>
        <span className="mt-1 text-[10px] tracking-[0.2em] font-bold text-white/85 font-mono">HBRK</span>
      </button>

      {/* ── Right: Vertical sticky throttle ─────────────────────────────── */}
      <div
        ref={throttleRef}
        onPointerDown={onThrottlePointerDown}
        className="pointer-events-auto absolute right-[18px] bottom-[calc(env(safe-area-inset-bottom,16px)+22px)] w-[74px] h-[260px] rounded-[38px] border-2 border-white/20 bg-black/45 backdrop-blur-md overflow-hidden touch-none select-none z-20"
        aria-label="Throttle"
        role="slider"
        aria-valuemin={-0.4}
        aria-valuemax={1}
        aria-valuenow={d}
      >
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.2em] font-mono text-emerald-400/80 pointer-events-none">+ FWD</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.2em] font-mono text-red-400/80 pointer-events-none">REV −</span>

        <div className="absolute inset-x-0 top-[18px] bottom-[18px] pointer-events-none">
          {/* vertical track */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[6px] -translate-x-1/2 rounded-[3px] bg-white/10 overflow-hidden">
            {/* dim reverse region */}
            <div
              className="absolute left-0 right-0 bottom-0"
              style={{
                height: '28%',
                background: 'linear-gradient(0deg,#5a1a1a 0%,#5a1a1a 60%,rgba(90,26,26,0.4) 100%)',
              }}
            />
            {/* fill that follows the knob */}
            <div
              className="absolute left-0 right-0 rounded-[3px]"
              style={{
                top: `${fillTop}%`,
                height: `${fillH}%`,
                background: d >= 0
                  ? 'linear-gradient(0deg,#22c55e,#fcd00b)'
                  : 'linear-gradient(180deg,#5a1a1a,#ff2d2d)',
              }}
            />
          </div>
          {/* spin-threshold notch */}
          <div
            className="absolute left-2 right-2 h-[14px] -translate-y-1/2 rounded-[1px]"
            style={{
              top: '72%',
              background: 'linear-gradient(180deg,rgba(252,208,11,0) 0%,rgba(252,208,11,0.55) 30%,rgba(252,208,11,0.85) 50%,rgba(252,208,11,0.55) 70%,rgba(252,208,11,0) 100%)',
            }}
          >
            <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[#fcd00b] -translate-y-1/2" />
          </div>
          {/* knob with N / number / R-number label */}
          <div
            className="absolute left-1/2 w-[60px] h-[34px] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center font-mono text-[13px] tracking-[2px] text-white/90"
            style={{
              top: `${knobTop}%`,
              background: 'linear-gradient(180deg,#3a3a44,#1a1a20)',
            }}
          >
            {knobLabel}
          </div>
        </div>
      </div>

      {/* Desktop key hint (hidden on touch-only viewports doesn't matter — purely decorative) */}
      <div className="hidden sm:flex fixed bottom-1 left-1/2 -translate-x-1/2 gap-2 text-[9px] font-mono text-white/25 tracking-widest select-none z-10 pointer-events-none">
        <span>[W/▲] GAS</span>
        <span>·</span>
        <span>[S/▼] REV</span>
        <span>·</span>
        <span>[A/D ◀▶] STEER</span>
        <span>·</span>
        <span>[SPACE] HBRK</span>
      </div>
    </>
  )
}
