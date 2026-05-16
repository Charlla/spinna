'use client'

import { useEffect, useRef, useCallback } from 'react'

interface InputState {
  throttle: number
  steer: number
  hbrk: boolean
}

interface SpinnaControlsProps {
  inputsRef: React.RefObject<InputState>
  resetKey: number
}

export default function SpinnaControls({ inputsRef, resetKey }: SpinnaControlsProps) {
  const keysRef = useRef<Set<string>>(new Set())
  const leftTouchRef = useRef<number | null>(null)
  const rightTouchRef = useRef<number | null>(null)

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Game input tick
  useEffect(() => {
    let raf: number
    const tick = () => {
      const keys = keysRef.current
      if (!inputsRef.current) { raf = requestAnimationFrame(tick); return }

      const throttleUp = keys.has('ArrowUp') || keys.has('KeyW')
      const throttleDown = keys.has('ArrowDown') || keys.has('KeyS')
      const steerLeft = keys.has('ArrowLeft') || keys.has('KeyA')
      const steerRight = keys.has('ArrowRight') || keys.has('KeyD')
      const hbrk = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight')

      let throttle = 0
      if (throttleUp) throttle = 1
      else if (throttleDown) throttle = -1

      let steer = 0
      if (steerLeft) steer = -1
      else if (steerRight) steer = 1

      inputsRef.current.throttle = throttle
      inputsRef.current.steer = steer
      inputsRef.current.hbrk = hbrk

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inputsRef, resetKey])

  const handleTouchStart = useCallback((e: React.TouchEvent, side: 'left' | 'right') => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (side === 'left') leftTouchRef.current = t.identifier
      else rightTouchRef.current = t.identifier
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent, side: 'left' | 'right') => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (side === 'left' && t.identifier === leftTouchRef.current) leftTouchRef.current = null
      if (side === 'right' && t.identifier === rightTouchRef.current) rightTouchRef.current = null
    }
    if (!inputsRef.current) return
    if (side === 'left') inputsRef.current.steer = 0
    if (side === 'right') {
      inputsRef.current.throttle = 0
      inputsRef.current.hbrk = false
    }
  }, [inputsRef])

  return (
    <>
      {/* Mobile touch controls */}
      <div className="fixed inset-x-0 bottom-0 h-32 flex z-20 sm:hidden" style={{ top: 'auto' }}>
        {/* Left: steer */}
        <div className="flex flex-1">
          <button
            className="flex-1 flex items-center justify-center text-white/30 text-3xl active:text-white/60 select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={e => { handleTouchStart(e, 'left'); if (inputsRef.current) inputsRef.current.steer = -1 }}
            onTouchEnd={e => handleTouchEnd(e, 'left')}
            onTouchCancel={e => handleTouchEnd(e, 'left')}
          >
            ◀
          </button>
          <button
            className="flex-1 flex items-center justify-center text-white/30 text-3xl active:text-white/60 select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={e => { handleTouchStart(e, 'left'); if (inputsRef.current) inputsRef.current.steer = 1 }}
            onTouchEnd={e => handleTouchEnd(e, 'left')}
            onTouchCancel={e => handleTouchEnd(e, 'left')}
          >
            ▶
          </button>
        </div>

        {/* Right: throttle + handbrake */}
        <div className="flex flex-1">
          <button
            className="flex-1 flex items-center justify-center text-white/30 text-2xl active:text-white/60 select-none"
            style={{ touchAction: 'none', background: 'rgba(252,208,11,0.05)' }}
            onTouchStart={e => { handleTouchStart(e, 'right'); if (inputsRef.current) inputsRef.current.hbrk = true }}
            onTouchEnd={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.hbrk = false }}
            onTouchCancel={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.hbrk = false }}
          >
            HBRK
          </button>
          <button
            className="flex-1 flex items-center justify-center text-white/30 text-3xl active:text-white/60 select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={e => { handleTouchStart(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = -1 }}
            onTouchEnd={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = 0 }}
            onTouchCancel={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = 0 }}
          >
            ▼
          </button>
          <button
            className="flex-1 flex items-center justify-center text-white/30 text-3xl active:text-white/60 select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={e => { handleTouchStart(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = 1 }}
            onTouchEnd={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = 0 }}
            onTouchCancel={e => { handleTouchEnd(e, 'right'); if (inputsRef.current) inputsRef.current.throttle = 0 }}
          >
            ▲
          </button>
        </div>
      </div>

      {/* Desktop key hint */}
      <div className="hidden sm:flex fixed bottom-3 left-1/2 -translate-x-1/2 gap-2 text-[9px] font-mono text-white/25 tracking-widest select-none z-10">
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
