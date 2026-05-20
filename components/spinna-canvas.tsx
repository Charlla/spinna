'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  CarPhysics, ConePhysics, CameraState,
  createScoreState, updateScore, applyWallDamage,
  drawTireMarks, drawFloor, drawSmokeBelow, drawSmokeAbove, drawSparks, drawCrowd,
  spawnSmoke, updateParticles, buildCrowd,
  initAudio, resumeAudio, updateAudio, playBoom,
  Particle,
  ScoreState,
  Target, makeTargetSet, updateTargets, drawTargets,
} from '@/lib/spinna-engine'
import { CARS, TIRES, DEFAULT_TUNE, TuneData, GameStats } from '@/lib/spinna-data'

// World is 1500x1500. Camera viewport = CANVAS_DISPLAY world units → fills
// the on-screen canvas element. Smaller value = closer zoom / bigger car
// (and a stronger sense of speed since scenery scrolls past faster).
const CANVAS_DISPLAY = 440
const WORLD_SIZE = 1500

export interface ServerRing {
  x: number
  y: number
  r: number
  captureR: number
  ringIdx: number
}

export interface OpponentPos {
  player_id: string
  x: number
  y: number
  heading: number
  omega: number
  /** Display color for their car body (defaults to a muted gray). */
  color?: string
}

export interface MultiplayerConfig {
  /** Live ring authority from the room (server-set). */
  ringRef: React.RefObject<ServerRing | null>
  /** Other players' positions, updated by the room client from the
   *  broadcast channel. */
  opponentsRef: React.RefObject<OpponentPos[]>
  /** Fired when the local player completes ≥330° around the active ring.
   *  The room client posts to /api/rooms/[code]/bank in response. */
  onRingComplete: (ringIdx: number) => void
}

interface SpinnaCanvasProps {
  inputsRef: React.RefObject<{ throttle: number; steer: number; hbrk: boolean }>
  tuneRef: React.RefObject<TuneData>
  active: boolean
  onBanner: (text: string, sub: string, color: string) => void
  /** Provided only in multiplayer rooms. Falsy = single-player path. */
  multiplayer?: MultiplayerConfig
}

export interface SpinnaCanvasHandle {
  start: (carId: string, tireId: string, tireHealth: number, trackId?: string, mode?: string) => void
  stop: () => void
  isRunning: () => boolean
  getStats: () => GameStats
  /** Pose snapshot used by the room client for broadcasts. */
  getCarState: () => { x: number; y: number; heading: number; omega: number } | null
}

const SpinnaCanvas = forwardRef<SpinnaCanvasHandle, SpinnaCanvasProps>(
  function SpinnaCanvas({ inputsRef, tuneRef, active, onBanner, multiplayer }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<{
      car: CarPhysics | null
      cones: ConePhysics[]
      smoke: Particle[]
      sparks: Particle[]
      crowd: ReturnType<typeof buildCrowd>
      cam: CameraState
      score: ScoreState
      floorCanvas: HTMLCanvasElement | null
      tireCanvas: HTMLCanvasElement | null
      shakeAmp: number
      raf: number
      running: boolean
      tireName: string
      lastT: number
      worldT: number
      excitement: number
      lastBumpAt: number
      lastBumpCost: number
      mode: string
      targets: Target[]
      targetsBanked: number
      mpRingIdx: number
      mpAccumulatedDeg: number
      mpProposedIdx: number
    }>({
      car: null,
      cones: [],
      smoke: [],
      sparks: [],
      crowd: [],
      cam: new CameraState(),
      score: createScoreState(),
      floorCanvas: null,
      tireCanvas: null,
      shakeAmp: 0,
      raf: 0,
      running: false,
      tireName: '',
      lastT: 0,
      worldT: 0,
      excitement: 0,
      lastBumpAt: 0,
      lastBumpCost: 0,
      mode: 'free',
      targets: [],
      targetsBanked: 0,
      mpRingIdx: -1,
      mpAccumulatedDeg: 0,
      mpProposedIdx: -1,
    })

    useImperativeHandle(ref, () => ({
      start(carId: string, tireId: string, tireHealth: number, trackId: string = 'donut', mode: string = 'free') {
        const carDef = CARS.find(c => c.id === carId) ?? CARS[0]
        const tireDef = TIRES.find(t => t.id === tireId) ?? TIRES[1]
        const s = stateRef.current

        // Re-bake the floor canvas with the chosen track.
        if (s.floorCanvas) {
          const fctx = s.floorCanvas.getContext('2d')
          if (fctx) drawFloor(fctx, trackId)
        }

        // Mode-specific setup
        s.mode = mode
        // Rings are the primary cash source — spawn a fresh trio in every
        // mode (Target Hunt just leaves the rest of the UI tuned around them).
        s.targets = makeTargetSet()
        s.targetsBanked = 0

        s.car = new CarPhysics(carDef, tireDef, tireHealth)
        s.car.onBounce = () => {
          if (!s.car) return
          // Wall bump: subtract big points (scaled by speed), kill combo, shake.
          const cost = applyWallDamage(s.score, s.car)
          s.lastBumpAt = performance.now()
          s.lastBumpCost = cost
          s.shakeAmp = Math.max(s.shakeAmp, 12)
          playBoom()
        }
        s.car.reset()
        s.cam.reset(s.car.x, s.car.y)
        s.score = createScoreState()
        s.smoke = []
        s.sparks = []
        s.cones.forEach(c => c.reset())
        s.tireName = tireDef.name
        s.running = true
        s.lastT = 0
        s.worldT = 0
        s.excitement = 0
        s.mpRingIdx = -1
        s.mpAccumulatedDeg = 0
        s.mpProposedIdx = -1

        // Clear tire marks
        if (s.tireCanvas) {
          const ctx = s.tireCanvas.getContext('2d')
          ctx?.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE)
        }

        if (inputsRef.current) {
          inputsRef.current.throttle = 0
          inputsRef.current.steer = 0
          inputsRef.current.hbrk = false
        }

        // Audio is initialised on demand by setAudioEnabled() from the menu.
        // Calling initAudio()/resumeAudio() here is safe — both no-op when
        // disabled and warm the context once enabled.
        initAudio()
        resumeAudio()
      },
      stop() {
        stateRef.current.running = false
      },
      isRunning: () => stateRef.current.running,
      getStats(): GameStats {
        const s = stateRef.current
        const car = s.car
        const now = performance.now()
        const lastBumpCost = (s.lastBumpAt && now - s.lastBumpAt < 1000) ? s.lastBumpCost : 0
        const activeTarget = s.targets.find(t => !t.hit)
        const targetProgress = activeTarget ? Math.min(1, activeTarget.accumulatedDeg / 330) : 0
        return {
          score: s.score.score,
          comboDeg: s.score.comboDeg,
          mult: s.score.mult,
          speedKmh: car ? Math.floor(0.55 * car.speed) : 0,
          tireHealth: car ? Math.max(0, Math.min(100, car.tireHealth)) : 100,
          tireName: s.tireName,
          totalSpins: s.score.sessionTotalSpins,
          maxCombo: s.score.sessionMaxCombo,
          damageBumps: s.score.damageBumps,
          damagePenalty: s.score.damagePenalty,
          lastBumpCost,
          mode: s.mode,
          targetsHit: s.targetsBanked,
          targetsTotal: s.targets.length,
          targetProgress,
        }
      },
      getCarState() {
        const c = stateRef.current.car
        if (!c) return null
        return { x: c.x, y: c.y, heading: c.heading, omega: c.omega }
      },
    }), [inputsRef])

    // Build floor and cones on mount
    useEffect(() => {
      const s = stateRef.current

      // Floor world canvas
      const floorCanvas = document.createElement('canvas')
      floorCanvas.width = WORLD_SIZE
      floorCanvas.height = WORLD_SIZE
      const floorCtx = floorCanvas.getContext('2d')
      if (floorCtx) drawFloor(floorCtx)
      s.floorCanvas = floorCanvas

      // Tire marks canvas
      const tireCanvas = document.createElement('canvas')
      tireCanvas.width = WORLD_SIZE
      tireCanvas.height = WORLD_SIZE
      s.tireCanvas = tireCanvas

      // Cones
      const cx = 750, cy = 750
      s.cones = [
        new ConePhysics(cx - 220, cy - 220),
        new ConePhysics(cx + 220, cy - 220),
        new ConePhysics(cx - 220, cy + 220),
        new ConePhysics(cx + 220, cy + 220),
      ]

      // Crowd
      s.crowd = buildCrowd()
    }, [])

    // Game loop
    const loop = useCallback((timestamp: number) => {
      const s = stateRef.current
      // Always reschedule — start() may flip running=true after a paused frame.
      s.raf = requestAnimationFrame(loop)
      if (!s.running) { s.lastT = 0; return }

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Delta time
      const dt = s.lastT === 0 ? 1 / 60 : Math.min((timestamp - s.lastT) / 1000, 1 / 20)
      s.lastT = timestamp
      s.worldT += dt

      const tune = tuneRef?.current ?? DEFAULT_TUNE
      const inputs = inputsRef.current ?? { throttle: 0, steer: 0, hbrk: false }

      // Physics
      if (s.car && active) {
        s.car.update(dt, inputs.throttle, inputs.steer, inputs.hbrk, tune)
        s.cam.update(s.car, dt)
        updateAudio(s.car)

        // Score
        const car = s.car
        updateScore(s.score, car, dt, tune, (text, sub, color) => {
          onBanner(text, sub, color)
        })

        // Excitement for crowd
        const excite = Math.min(1, Math.abs(car.omega) / 3 + Math.abs(car.slipAngleR) * 2)
        s.excitement = s.excitement * 0.95 + excite * 0.05

        // Check tire death
        if (car.tireHealth <= 0) {
          s.running = false
        }

        // Tire marks
        const tireCtx = s.tireCanvas?.getContext('2d')
        if (tireCtx) {
          const slipping = Math.abs(car.slipAngleR) > 0.2 && (Math.abs(car.omega) > 0.4 || Math.abs(car.v_lat) > 8)
          const spinning = car.wheelspin > 0.2 && Math.abs(car.v_fwd) < 50
          if (slipping) {
            const intensity = Math.min(Math.abs(car.v_lat) / 60 + 0.4, 1.4)
            drawTireMarks(tireCtx, car, intensity)
          } else if (spinning) {
            drawTireMarks(tireCtx, car, 0.3 + 0.5 * car.wheelspin)
          } else {
            car.lastWheels = null
          }
        }

        // Particles
        spawnSmoke(s.smoke, car,
          car.wheelspin > 0.2,
          Math.abs(car.slipAngleR) > 0.25 && Math.abs(car.omega) > 0.6
        )
        updateParticles(s.smoke, dt, false)
        updateParticles(s.sparks, dt, true)

        // Cones
        for (const cone of s.cones) {
          cone.update(dt)
          cone.collideWith(car, s.sparks)
        }

        if (multiplayer) {
          // Multiplayer: a single server-authoritative ring at a time.
          const ring = multiplayer.ringRef.current
          if (ring) {
            // Reset the accumulator if the server moved on to a new ring.
            if (s.mpRingIdx !== ring.ringIdx) {
              s.mpRingIdx = ring.ringIdx
              s.mpAccumulatedDeg = 0
            }
            const dx = car.x - ring.x
            const dy = car.y - ring.y
            const inside = dx * dx + dy * dy < ring.captureR * ring.captureR
            if (inside) {
              const yaw = Math.abs(car.omega * dt) * (180 / Math.PI)
              const slipping = Math.abs(car.slipAngleR) > 0.25 && Math.abs(car.omega) > 0.6
              if (slipping) s.mpAccumulatedDeg += yaw
              if (s.mpAccumulatedDeg >= 360 && s.mpProposedIdx !== ring.ringIdx) {
                s.mpProposedIdx = ring.ringIdx
                multiplayer.onRingComplete(ring.ringIdx)
              }
            }
          }
        } else if (s.targets.length > 0) {
          // Single-player: local target set.
          updateTargets(s.targets, car, dt, (target) => {
            s.targetsBanked += 1
            const ringPayout = 7500
            s.score.score += ringPayout
            onBanner('RING!', `+R${ringPayout} · ${s.targetsBanked}/${s.targets.length}`, '#22c55e')
            for (let i = 0; i < 18; i++) {
              const a = Math.random() * Math.PI * 2
              const sp = 90 + Math.random() * 120
              s.sparks.push({
                x: target.x, y: target.y,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                r: 2 + Math.random() * 2,
                life: 0.5 + Math.random() * 0.5, maxLife: 1,
                alpha: 1, color: '34,197,94',
              })
            }
          })
          if (s.targets.every(t => t.hit)) {
            s.targets = makeTargetSet()
          }
        }

        // Camera shake
        s.shakeAmp = Math.max(0, s.shakeAmp - 18 * dt)
      }

      // ─── Render ───────────────────────────────────────────────────────────
      const DPR = window.devicePixelRatio || 1
      const displayW = canvas.offsetWidth
      const displayH = canvas.offsetHeight
      if (canvas.width !== displayW * DPR || canvas.height !== displayH * DPR) {
        canvas.width = displayW * DPR
        canvas.height = displayH * DPR
      }
      const W = canvas.width / DPR
      const H = canvas.height / DPR

      ctx.save()
      ctx.scale(DPR, DPR)

      // Camera transform
      const cam = s.cam
      const scale = W / CANVAS_DISPLAY
      const shakeX = s.shakeAmp > 0 ? (Math.random() - 0.5) * s.shakeAmp : 0
      const shakeY = s.shakeAmp > 0 ? (Math.random() - 0.5) * s.shakeAmp : 0

      const viewX = cam.x * scale - W / 2 + shakeX
      const viewY = cam.y * scale - H / 2 + shakeY

      // Clear
      ctx.fillStyle = '#0a0807'
      ctx.fillRect(0, 0, W, H)

      // Draw world
      ctx.save()
      ctx.translate(-viewX, -viewY)
      ctx.scale(scale, scale)

      // Floor
      if (s.floorCanvas) {
        ctx.drawImage(s.floorCanvas, 0, 0)
      }

      // Tire marks
      if (s.tireCanvas) {
        ctx.drawImage(s.tireCanvas, 0, 0)
      }

      // Target rings — drawn below the car so it can dip into them visually
      // as it spins around.
      if (multiplayer) {
        const ring = multiplayer.ringRef.current
        if (ring) {
          drawServerRing(ctx, ring, s.mpAccumulatedDeg, s.worldT)
        }
      } else if (s.targets.length > 0) {
        // Rings now spawn in every single-player mode (target hunt, free
        // spin, pass & play) since they're the primary cash source.
        drawTargets(ctx, s.targets)
      }

      // Opponents (multiplayer only) — drawn under the local car so the
      // player's own ride stays visually dominant.
      if (multiplayer) {
        const opponents = multiplayer.opponentsRef.current ?? []
        for (const op of opponents) {
          drawOpponent(ctx, op)
        }
      }

      // Smoke — ground-level layer (drawn under the car)
      drawSmokeBelow(ctx, s.smoke)

      // Car
      if (s.car) {
        s.car.draw(ctx)
      }

      // Smoke — risen layer (drawn over the car so you disappear into your
      // own trail when you spin back through it)
      drawSmokeAbove(ctx, s.smoke)

      // Sparks
      drawSparks(ctx, s.sparks)

      // Cones
      for (const cone of s.cones) {
        cone.draw(ctx)
      }

      // Crowd
      drawCrowd(ctx, s.crowd, s.worldT, s.excitement)

      ctx.restore()
      // ─── Screen-space overlays ──────────────────────────────────────────────
      // Edge-of-viewport pointers for any active ring that's off-screen.
      // Works for the multiplayer server ring AND the local target set.
      const screenRings: Array<{ x: number; y: number }> = []
      if (multiplayer) {
        const r = multiplayer.ringRef.current
        if (r) screenRings.push({ x: r.x, y: r.y })
      } else {
        for (const t of s.targets) if (!t.hit) screenRings.push({ x: t.x, y: t.y })
      }
      if (screenRings.length > 0) {
        drawEdgePointers(ctx, W, H, screenRings, scale, viewX, viewY)
      }
      ctx.restore()
    }, [active, inputsRef, tuneRef, onBanner, multiplayer])

    useEffect(() => {
      stateRef.current.raf = requestAnimationFrame(loop)
      return () => {
        cancelAnimationFrame(stateRef.current.raf)
      }
    }, [loop])

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
      />
    )
  }
)

// ─── Multiplayer draw helpers ────────────────────────────────────────────────

function drawServerRing(
  ctx: CanvasRenderingContext2D,
  ring: ServerRing,
  accumulated: number,
  worldT: number,
) {
  const pulse = 0.6 + 0.4 * Math.sin(worldT * 4)
  ctx.save()
  ctx.translate(ring.x, ring.y)
  // outer glow
  ctx.strokeStyle = `rgba(34,197,94,${0.55 * pulse})`
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, ring.r, 0, Math.PI * 2); ctx.stroke()
  // capture radius (subtle)
  ctx.strokeStyle = 'rgba(34,197,94,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(0, 0, ring.captureR, 0, Math.PI * 2); ctx.stroke()
  // progress wedge
  if (accumulated > 0) {
    const pct = Math.min(1, accumulated / 360)
    ctx.fillStyle = 'rgba(34,197,94,0.18)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, ring.r * 0.9, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Edge-of-viewport pointers — tiny arrows that hug the canvas border and point
 * toward any ring that's currently off-screen. Drawn in screen-space (after
 * the world ctx.restore()).
 */
function drawEdgePointers(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rings: Array<{ x: number; y: number }>,
  scale: number,
  viewX: number,
  viewY: number,
) {
  const cx = W / 2
  const cy = H / 2
  const inset = 22
  const halfW = W / 2 - inset
  const halfH = H / 2 - inset
  for (const r of rings) {
    const sx = r.x * scale - viewX
    const sy = r.y * scale - viewY
    const dx = sx - cx
    const dy = sy - cy
    // Already on-screen with a generous margin? Skip.
    if (
      sx > inset && sx < W - inset &&
      sy > inset && sy < H - inset
    ) continue
    const k = Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH)
    if (k <= 0) continue
    const ex = cx + dx / k
    const ey = cy + dy / k
    const angle = Math.atan2(dy, dx)
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(angle)
    // Triangle pointer
    ctx.fillStyle = 'rgba(34,197,94,0.92)'
    ctx.shadowColor = 'rgba(34,197,94,0.7)'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-11, -6)
    ctx.lineTo(-7, 0)
    ctx.lineTo(-11, 6)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    // Subtle dot behind
    ctx.fillStyle = 'rgba(34,197,94,0.35)'
    ctx.beginPath()
    ctx.arc(-14, 0, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawOpponent(ctx: CanvasRenderingContext2D, op: OpponentPos) {
  ctx.save()
  ctx.translate(op.x, op.y)
  ctx.rotate(op.heading)
  // simple body — narrower than the player's own car, slightly faded
  const w = 22, h = 56
  ctx.globalAlpha = 0.7
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath(); ctx.ellipse(2, 4, w / 2 + 4, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = op.color ?? '#7c8593'
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.fillStyle = 'rgba(15,18,28,0.85)'
  ctx.fillRect(-w / 2 + 3, -h / 2 + 14, w - 6, h - 30)
  ctx.restore()
}

export default SpinnaCanvas
