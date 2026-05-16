'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  CarPhysics, ConePhysics, CameraState,
  createScoreState, updateScore,
  drawTireMarks, drawFloor, drawSmoke, drawSparks, drawCrowd,
  spawnSmoke, updateParticles, buildCrowd,
  initAudio, resumeAudio, updateAudio, playBoom,
  Particle,
  ScoreState,
} from '@/lib/spinna-engine'
import { CARS, TIRES, DEFAULT_TUNE, TuneData, GameStats } from '@/lib/spinna-data'

const CANVAS_DISPLAY = 750
const WORLD_SIZE = 1500

interface SpinnaCanvasProps {
  inputsRef: React.RefObject<{ throttle: number; steer: number; hbrk: boolean }>
  tuneRef: React.RefObject<TuneData>
  active: boolean
  onBanner: (text: string, sub: string, color: string) => void
}

export interface SpinnaCanvasHandle {
  start: (carId: string, tireId: string, tireHealth: number) => void
  stop: () => void
  isRunning: () => boolean
  getStats: () => GameStats
}

const SpinnaCanvas = forwardRef<SpinnaCanvasHandle, SpinnaCanvasProps>(
  function SpinnaCanvas({ inputsRef, tuneRef, active, onBanner }, ref) {
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
    })

    useImperativeHandle(ref, () => ({
      start(carId: string, tireId: string, tireHealth: number) {
        const carDef = CARS.find(c => c.id === carId) ?? CARS[0]
        const tireDef = TIRES.find(t => t.id === tireId) ?? TIRES[1]
        const s = stateRef.current

        s.car = new CarPhysics(carDef, tireDef, tireHealth)
        s.car.onBounce = () => { s.shakeAmp = Math.max(s.shakeAmp, 7); playBoom() }
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
        return {
          score: s.score.score,
          comboDeg: s.score.comboDeg,
          mult: s.score.mult,
          speedKmh: car ? Math.floor(0.55 * car.speed) : 0,
          tireHealth: car ? Math.max(0, Math.min(100, car.tireHealth)) : 100,
          tireName: s.tireName,
          totalSpins: s.score.sessionTotalSpins,
          maxCombo: s.score.sessionMaxCombo,
        }
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
      if (!s.running) return

      const canvas = canvasRef.current
      if (!canvas) { s.raf = requestAnimationFrame(loop); return }

      const ctx = canvas.getContext('2d')
      if (!ctx) { s.raf = requestAnimationFrame(loop); return }

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

      // Smoke (behind car)
      drawSmoke(ctx, s.smoke)

      // Car
      if (s.car) {
        s.car.draw(ctx)
      }

      // Sparks
      drawSparks(ctx, s.sparks)

      // Cones
      for (const cone of s.cones) {
        cone.draw(ctx)
      }

      // Crowd
      drawCrowd(ctx, s.crowd, s.worldT, s.excitement)

      ctx.restore()
      ctx.restore()

      s.raf = requestAnimationFrame(loop)
    }, [active, inputsRef, tuneRef, onBanner])

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

export default SpinnaCanvas
