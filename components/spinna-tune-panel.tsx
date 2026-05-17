'use client'

import { DEFAULT_TUNE, TUNE_KEY, TuneData } from '@/lib/spinna-data'

interface TuneParam {
  key: keyof TuneData
  label: string
  min: number
  max: number
  step: number
  fmt: (v: number) => string
  hint: string
}

// Same params and ranges as the original v0 deployment.
export const TUNE_PARAMS: TuneParam[] = [
  { key: 'enginePower',   label: 'Engine Power',     min: 0.4,  max: 2.5,  step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'Multiplier on engine drive force.' },
  { key: 'topSpeed',      label: 'Top Speed',        min: 0.5,  max: 2,    step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'Multiplier on top-speed cap (engine falloff point).' },
  { key: 'steerMaxRad',   label: 'Steering Lock',    min: 0.4,  max: 1.2,  step: 0.02, fmt: v => `${((180 * v) / Math.PI).toFixed(0)}°`, hint: 'Max wheel angle at low speed. Higher = tighter turning circle.' },
  { key: 'steerMinRad',   label: 'High-Speed Steer', min: 0.1,  max: 0.5,  step: 0.02, fmt: v => `${((180 * v) / Math.PI).toFixed(0)}°`, hint: 'Steering lock retained at high speed.' },
  { key: 'gripLong',      label: 'Long Grip',        min: 0.4,  max: 1.8,  step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'Forward/braking traction multiplier.' },
  { key: 'gripLat',       label: 'Lat Grip',         min: 0.4,  max: 1.8,  step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'Cornering traction. Lower = slidier.' },
  { key: 'lowSpeedStick', label: 'Low-Speed Stick',  min: 0,    max: 1.5,  step: 0.05, fmt: v => v.toFixed(2), hint: 'How firmly car straightens at low speed. Lower = looser, easier to break loose.' },
  { key: 'rearBias',      label: 'Rear Bite Loss',   min: 0,    max: 2,    step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'How aggressively wheelspin chops rear lateral grip. Higher = easier to spin.' },
  { key: 'yawDamping',    label: 'Yaw Damping',      min: 0,    max: 2,    step: 0.05, fmt: v => v.toFixed(2), hint: 'Spin decay. Lower = spins persist longer.' },
  { key: 'wearRate',      label: 'Tire Wear Rate',   min: 0.05, max: 3,    step: 0.05, fmt: v => `×${v.toFixed(2)}`, hint: 'Global tire decay multiplier. Tires running out ends the round.' },
  { key: 'spinThrottle',  label: 'Spin Threshold',   min: 0.2,  max: 0.95, step: 0.02, fmt: v => `${Math.round(100 * v)}%`, hint: 'Throttle floor for wheelspin. Below this the car drives normally; above it, mash to break the rear loose.' },
]

interface SpinnaTunePanelProps {
  open: boolean
  tune: TuneData
  onChange: (next: TuneData) => void
  onClose: () => void
}

/**
 * Side-sheet TUNE panel — restored from the original v0 layout.
 * Persists to localStorage[`spinna_tune_v3`] on every change.
 */
export default function SpinnaTunePanel({ open, tune, onChange, onClose }: SpinnaTunePanelProps) {
  const persist = (next: TuneData) => {
    onChange(next)
    try { localStorage.setItem(TUNE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const handleReset = () => persist({ ...DEFAULT_TUNE })

  return (
    <>
      {/* dim backdrop while open */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={[
          'fixed inset-0 z-20 transition-opacity duration-200',
          open ? 'bg-black/45 opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />
      <div
        role="dialog"
        aria-label="Tune panel"
        aria-hidden={!open}
        className={[
          'fixed inset-y-0 right-0 z-30 w-[min(340px,86vw)] flex flex-col',
          'bg-[linear-gradient(180deg,rgba(14,14,16,0.96),rgba(20,18,22,0.96))]',
          'border-l-2 border-amber-300/40 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
          <div>
            <h2 className="font-mono text-amber-300 text-sm font-extrabold tracking-[3px]">TUNE</h2>
            <p className="text-[10px] text-white/55 font-mono tracking-[1px] mt-0.5">Live physics knobs.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tune panel"
            className="text-white/55 hover:text-white text-2xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* params */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {TUNE_PARAMS.map(p => {
            const v = tune[p.key]
            return (
              <div key={p.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-[1.5px] text-white/85 font-bold">{p.label}</span>
                  <span className="text-[10px] font-mono text-amber-300 tabular-nums">{p.fmt(v)}</span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={v}
                  onChange={e => persist({ ...tune, [p.key]: parseFloat(e.currentTarget.value) })}
                  className="w-full accent-amber-300"
                  aria-label={p.label}
                />
                <p className="text-[9.5px] text-white/45 font-mono leading-snug">{p.hint}</p>
              </div>
            )
          })}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2.5 rounded-md font-mono text-[11px] tracking-[2px] font-bold text-red-300 bg-red-900/20 border border-red-800/55 hover:bg-red-900/35 transition-colors"
          >
            ↺ RESET TO DEFAULTS
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-md font-mono text-[11px] tracking-[2px] font-bold text-black bg-amber-300 hover:bg-amber-200 transition-colors"
          >
            CLOSE ▸
          </button>
        </div>
      </div>
    </>
  )
}
