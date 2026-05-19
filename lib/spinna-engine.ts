// TypeScript wrappers around the Spinna game engine.
// The actual physics and rendering are implemented here based on the
// extracted engine from the original Spinna game bundle.

import { ARENA, MILESTONES } from './spinna-data'

// ─── Math helpers ───────────────────────────────────────────────────────────
const TWO_PI = 2 * Math.PI
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const sign = (v: number) => (v < 0 ? -1 : +(v > 0))
function expLerp(a: number, b: number, k: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-k * dt))
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface CarDef {
  id: string
  mass: number
  wheelbase: number
  front_overhang: number
  rear_overhang: number
  width: number
  enginePower: number
  maxFwdSpeed: number
  maxRevSpeed: number
  inertiaMul: number
  color: string
  accentColor: string
}

export interface TireDef {
  id: string
  name: string
  gripLong: number
  gripLat: number
  durability: number
  wearMul: number
}

export interface TuneParams {
  enginePower: number
  topSpeed: number
  steerMaxRad: number
  steerMinRad: number
  gripLong: number
  gripLat: number
  lowSpeedStick: number
  yawDamping: number
  wearRate: number
  rearBias: number
  spinThrottle: number
}

export interface InputState {
  throttle: number  // -1..1
  steer: number     // -1..1
  hbrk: boolean
}

// ─── CarPhysics ─────────────────────────────────────────────────────────────
export class CarPhysics {
  def: CarDef
  tireDef: TireDef
  tireHealth: number
  x: number
  y: number
  heading: number
  vx = 0
  vy = 0
  omega = 0
  wheelLinSpeed = 0
  L: number
  Lf: number
  Lr: number
  totalLen: number
  width: number
  mass: number
  inertia: number
  maxEngineForce: number
  maxFwd: number
  maxRev: number
  slipLong = 0
  slipAngleR = 0
  slipAngleF = 0
  wheelspin = 0
  bounceFlash = 0
  lastWheels: Array<{ x: number; y: number }> | null = null
  v_fwd = 0
  v_lat = 0
  steer = 0
  handbrake = 0
  throttleIn = 0
  speed = 0
  onBounce?: () => void

  static readonly START_X = 750
  static readonly START_Y = 830

  constructor(def: CarDef, tire: TireDef, tireHealth: number) {
    this.def = def
    this.tireDef = tire
    this.tireHealth = tireHealth
    this.x = CarPhysics.START_X
    this.y = CarPhysics.START_Y
    this.heading = -Math.PI / 2
    this.L = def.wheelbase
    this.Lf = def.wheelbase / 2
    this.Lr = def.wheelbase / 2
    this.totalLen = def.wheelbase + def.front_overhang + def.rear_overhang
    this.width = def.width
    this.mass = def.mass / 1000
    this.inertia = this.mass * (this.totalLen ** 2 + this.width ** 2) / 12 * def.inertiaMul
    this.maxEngineForce = def.enginePower / 50
    this.maxFwd = def.maxFwdSpeed
    this.maxRev = def.maxRevSpeed
  }

  // Grip is constant throughout the tire's life — they hold full traction
  // until they pop at tireHealth=0 and the round ends.
  effGripLong() { return this.tireDef.gripLong }
  effGripLat()  { return this.tireDef.gripLat }

  reset() {
    this.x = CarPhysics.START_X
    this.y = CarPhysics.START_Y
    this.heading = -Math.PI / 2
    this.vx = this.vy = 0
    this.omega = 0
    this.wheelLinSpeed = 0
    this.bounceFlash = 0
    this.lastWheels = null
  }

  update(dt: number, throttle: number, steer: number, hbrk: boolean, tune: TuneParams) {
    const sh = Math.sin(this.heading)
    const ch = -Math.cos(this.heading)
    const cx = Math.cos(this.heading)
    const cxs = Math.sin(this.heading)

    const v_fwd = this.vx * sh + this.vy * ch
    const v_lat = this.vx * cx + this.vy * cxs
    const speed = Math.abs(v_fwd)

    const steerAngle = steer * lerp(tune.steerMaxRad, tune.steerMinRad, clamp(speed / 200, 0, 1))

    let thr = throttle
    if (thr > 0) {
      thr *= clamp(1 - Math.max(this.wheelLinSpeed, 0) / (this.maxFwd * tune.topSpeed * 1.3), 0, 1)
    } else if (thr < 0) {
      thr *= clamp(1 - Math.max(-this.wheelLinSpeed, 0) / (this.maxRev * tune.topSpeed * 1.3), 0, 1)
    }
    const driveForce = thr * this.maxEngineForce * tune.enginePower
    const effWheelSpeed = hbrk ? 0 : driveForce

    const wheelSpd = Math.max(Math.abs(this.wheelLinSpeed), Math.abs(v_fwd), 4)
    let slipLong = (this.wheelLinSpeed - v_fwd) / wheelSpd
    slipLong = clamp(slipLong, -2.5, 2.5)

    // Slip limit.
    // Below spinThrottle: maxSlip stays low so the rear tyres maintain traction —
    //   curve is quadratic so light throttle is very gentle, then ramps up.
    // At/above spinThrottle: maxSlip jumps to 2.5 so torque-induced wheelspin
    //   is allowed (high-power cars overpower their grip, breaking the rear loose
    //   even on a straight). This is the "boot it and the rear steps out" feel.
    let maxSlip = 2.5
    if (!hbrk) {
      if (throttle < 0) maxSlip = 0.18
      else if (throttle < tune.spinThrottle) {
        const ratio = clamp(throttle / tune.spinThrottle, 0, 1)
        maxSlip = lerp(0.10, 0.70, ratio * ratio)   // quadratic — gentle low, sharp knee at the threshold
      }
    }
    if (Math.abs(slipLong) > maxSlip) {
      const s = sign(slipLong)
      slipLong = s * maxSlip
      this.wheelLinSpeed = v_fwd + s * wheelSpd * maxSlip
    }
    this.slipLong = slipLong

    // Longitudinal force
    const gripLong = 160 * this.effGripLong() * tune.gripLong
    let fLong: number
    const absSlip = Math.abs(slipLong)
    fLong = absSlip <= 0.12
      ? (absSlip / 0.12) * gripLong
      : gripLong * (1 - 0.45 * Math.tanh((absSlip - 0.12) * 2.5))
    fLong = sign(slipLong) * fLong

    // Wheel speed update. 0.55 = wheel inertia (was original); 0.40 gives
    // a snappier launch — wheel spins up faster, car responds sooner.
    const wheelAcc = (driveForce - fLong) / 0.40
    this.wheelLinSpeed += (hbrk ? wheelAcc - 18 * this.wheelLinSpeed : wheelAcc) * dt
    this.wheelLinSpeed *= 1 - 0.35 * dt
    if (hbrk && Math.abs(this.wheelLinSpeed) < 1.5) this.wheelLinSpeed = 0

    // Slip angles
    const v_lat_f = v_lat + this.Lf * this.omega
    const v_lat_r = v_lat - this.Lr * this.omega
    this.slipAngleF = Math.atan2(v_lat_f, Math.max(Math.abs(v_fwd), 4)) - steerAngle
    this.slipAngleR = Math.atan2(v_lat_r, Math.max(Math.abs(v_fwd), 4))

    // Lateral forces
    const gripLat = 160 * this.effGripLat() * tune.gripLat
    const latForce = (slipAngle: number, grip: number) => {
      const abs = Math.abs(slipAngle)
      const f = abs <= 0.16
        ? (abs / 0.16) * grip
        : grip * (1 - 0.5 * Math.tanh((abs - 0.16) * 2.5))
      return -sign(slipAngle) * f
    }

    let fLatF = latForce(this.slipAngleF, gripLat)
    let fLatR = latForce(this.slipAngleR, gripLat)

    // Low-speed stick
    const lowSpeedFactor = clamp(1 - Math.abs(slipLong - 0.3) / 0.5, 0, 1) * clamp(1 - Math.abs(v_fwd) / 28, 0, 1) * (!hbrk ? 1 : 0)
    const stickForce = 6 * tune.lowSpeedStick
    fLatF -= v_lat_f * stickForce * lowSpeedFactor
    fLatR -= v_lat_r * stickForce * lowSpeedFactor

    const reversing = (v_fwd < -1 || throttle < 0) && !hbrk
    if (!reversing) {
      fLatR *= clamp(1 - (Math.abs(slipLong) - 0.2) * 1.4 * tune.rearBias, 0.2, 1)
    }

    // Combined grip limit
    const maxLat = 1.05 * gripLat
    const totalLat = Math.hypot(fLong, fLatR)
    if (totalLat > maxLat && totalLat > 0) {
      const scale = maxLat / totalLat
      fLong *= scale
      fLatR *= scale
    }

    // Wheelspin flag
    this.wheelspin = reversing ? 0 : clamp((Math.abs(slipLong) - 0.15) / 0.6, 0, 1) *
      (Math.abs(this.slipAngleF) > 0.05 || hbrk ? 1 : 0)

    // Body-frame decomposition of the front-wheel lateral force.
    // The front wheel is steered by steerAngle relative to the body,
    // so its lateral force points (sin·forward, cos·lateral) in body axes.
    //   front_x_body = component along the forward axis (helps speed up/slow down)
    //   front_y_body = component along the lateral axis  (helps yaw)
    // Original bicycle-model decomposition — DO NOT swap these. Swapping them
    // (the previous bug) made the steering feel broken.
    const sinSt = Math.sin(steerAngle)
    const cosSt = Math.cos(steerAngle)
    const front_x_body = -fLatF * sinSt
    const front_y_body =  fLatF * cosSt

    const ax = fLong   + front_x_body + (-v_fwd * Math.abs(v_fwd) * 9e-4 - 0.18 * v_fwd)
    const ay = fLatR   + front_y_body + (-v_lat * Math.abs(v_lat) * 0.0014 - 0.6 * v_lat)
    const torque = (front_y_body * this.Lf - fLatR * this.Lr) / this.inertia

    this.omega += torque * dt
    this.omega *= Math.exp(-tune.yawDamping * dt)
    this.vx = (v_fwd + ax * dt) * sh + (v_lat + ay * dt) * cx
    this.vy = (v_fwd + ax * dt) * ch + (v_lat + ay * dt) * cxs
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.heading += this.omega * dt

    // Normalize heading
    while (this.heading > Math.PI) this.heading -= TWO_PI
    while (this.heading < -Math.PI) this.heading += TWO_PI

    // Arena bounds bounce
    const arena = ARENA
    let bounced = false
    if (this.x < arena.l + 24) { this.x = arena.l + 24; if (this.vx < 0) { this.vx *= -0.32; this.bounceFlash = 0.4; bounced = true } }
    if (this.x > arena.r - 24) { this.x = arena.r - 24; if (this.vx > 0) { this.vx *= -0.32; this.bounceFlash = 0.4; bounced = true } }
    if (this.y < arena.t + 24) { this.y = arena.t + 24; if (this.vy < 0) { this.vy *= -0.32; this.bounceFlash = 0.4; bounced = true } }
    if (this.y > arena.b - 24) { this.y = arena.b - 24; if (this.vy > 0) { this.vy *= -0.32; this.bounceFlash = 0.4; bounced = true } }
    if (bounced) this.onBounce?.()
    this.bounceFlash = Math.max(0, this.bounceFlash - 1.8 * dt)

    // Tire wear
    const slipFactor = (+(Math.abs(this.slipAngleF) > 0.05) * Math.abs(slipLong) * 0.55 +
      0.7 * clamp(1.3 * Math.abs(this.slipAngleR), 0, 1.6)) * this.tireDef.wearMul
    // Wear coefficient was 7 in the original; lowered to 4.5 so a round
    // lasts comfortably long. The HUD bar now also shows one decimal place,
    // so each frame's tiny drop is visible (was Math.round → looked static).
    this.tireHealth -= 4.5 * slipFactor * tune.wearRate * dt / (this.tireDef.durability / 500)
    this.tireHealth = Math.max(0, this.tireHealth)

    this.v_fwd = v_fwd
    this.v_lat = v_lat
    this.steer = steerAngle
    this.handbrake = +hbrk
    this.throttleIn = throttle
    this.speed = Math.hypot(this.vx, this.vy)
  }

  localToWorld(lx: number, ly: number) {
    const sh = Math.sin(this.heading)
    const ch = Math.cos(this.heading)
    return { x: this.x + ch * lx + sh * ly, y: this.y + Math.sin(this.heading) * lx + (-Math.cos(this.heading)) * ly }
  }

  rearWheels() {
    // `localToWorld` interprets its second argument in a math-y-up frame —
    // a y-flip is baked in (see the formula). To get the rear axle (which sits
    // at canvas-y = +Lr in the body frame, i.e. behind the centre) we must
    // pass ly = -Lr to the math-frame transform.
    const ly = -this.Lr
    const hw = this.width / 2
    return [
      this.localToWorld(-hw, ly),
      this.localToWorld(hw, ly),
    ]
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Convention: in this canvas-local frame, −y is FORWARD (where the
    // headlights point), +y is REAR (tail-lights). Front axle is at y=−Lf,
    // rear axle at y=+Lr.
    const { bounceFlash, def, width: w, totalLen: h } = this
    const hw = w / 2
    const front_y = -this.Lf
    const rear_y  =  this.Lr
    const nose_y  = -h / 2
    const tail_y  =  h / 2

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.heading)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    ctx.ellipse(2, 4, hw + 4, h / 2 + 4, 0, 0, TWO_PI)
    ctx.fill()

    // Body
    const bodyColor = bounceFlash > 0 ? '#ffe4e4' : def.color
    ctx.fillStyle = bodyColor
    ctx.fillRect(-hw, nose_y, w, h)

    // Panel cut-lines along the doors
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(-hw + 4, nose_y + 12, w - 8, 1)
    ctx.fillRect(-hw + 4, tail_y - 14, w - 8, 1)

    // Accent stripe(s)
    if (def.accentColor === 'M-stripe') {
      ctx.fillStyle = '#1c69d4'; ctx.fillRect(-hw, -2.5, w, 1.4)
      ctx.fillStyle = '#3e1f7d'; ctx.fillRect(-hw, -1,   w, 1.4)
      ctx.fillStyle = '#e30613'; ctx.fillRect(-hw,  0.5, w, 1.4)
    } else if (def.accentColor === 'stripe') {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-hw, -1.5, w, 1.5)
    }

    // Cabin / roof — slightly lighter than body, sits between the windows
    const roofColor =
      def.color === '#1a1a1a' ? '#222226'
      : def.color === '#fcd00b' ? '#d8af0a'
      : '#dcdcd6'
    ctx.fillStyle = roofColor
    ctx.fillRect(-hw + 2, nose_y + 22, w - 4, h - 38)
    // Subtle side stripes inside the roof slab
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.fillRect(-hw, nose_y + 22, 1.5, h - 38)
    ctx.fillRect(hw - 1.5, nose_y + 22, 1.5, h - 38)
    // Cut-line at the door pillars
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(-hw + 2, -3); ctx.lineTo(hw - 2, -3)
    ctx.moveTo(-hw + 2, 3); ctx.lineTo(hw - 2, 3); ctx.stroke()

    // Front windscreen — wide near the roof, narrows toward the bonnet
    ctx.fillStyle = 'rgba(15,18,28,0.92)'
    ctx.beginPath()
    ctx.moveTo(-hw + 3, nose_y + 13)
    ctx.lineTo(hw - 3,  nose_y + 13)
    ctx.lineTo(hw - 4,  nose_y + 22)
    ctx.lineTo(-hw + 4, nose_y + 22)
    ctx.closePath(); ctx.fill()
    // Rear screen — wide near the roof, narrows toward the boot
    ctx.beginPath()
    ctx.moveTo(-hw + 4, tail_y - 16)
    ctx.lineTo(hw - 4,  tail_y - 16)
    ctx.lineTo(hw - 3,  tail_y - 8)
    ctx.lineTo(-hw + 3, tail_y - 8)
    ctx.closePath(); ctx.fill()

    // Headlights at the nose. RX-7 is one wide strip; everyone else gets pods.
    if (def.id === 'rx7') {
      ctx.fillStyle = '#fff8c0'
      ctx.fillRect(-hw + 2, nose_y + 1, hw - 3, 2.5)
      ctx.fillRect(1,       nose_y + 1, hw - 3, 2.5)
    } else {
      ctx.fillStyle = '#fff8c0'
      ctx.fillRect(-hw + 2,  nose_y + 1, 4.5, 3)
      ctx.fillRect(-hw + 7,  nose_y + 1, 3.5, 2.5)
      ctx.fillRect(hw - 6.5, nose_y + 1, 4.5, 3)
      ctx.fillRect(hw - 10.5, nose_y + 1, 3.5, 2.5)
      // Kidney grille / nose badge
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(-3, nose_y + 1, 6, 3.5)
    }

    // Tail-lights — red strip with orange indicator corners
    ctx.fillStyle = '#cc0a16'
    ctx.fillRect(-hw + 2, tail_y - 4, w - 4, 2.5)
    ctx.fillStyle = '#ffae00'
    ctx.fillRect(-hw + 2, tail_y - 4, 3, 2.5)
    ctx.fillRect(hw - 5,  tail_y - 4, 3, 2.5)

    // Wheels — black with a thin rim outline.
    // FRONT wheels rotate by this.steer (the actual steered angle in radians).
    // REAR wheels stay aligned with the body.
    const ww = 5, wh = 9
    const drawWheel = (cx: number, cy: number, rot: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      if (rot) ctx.rotate(rot)
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(-ww / 2, -wh / 2, ww, wh)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 0.6
      ctx.strokeRect(-ww / 2, -wh / 2, ww, wh)
      // Hub cap
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, TWO_PI); ctx.fill()
      ctx.restore()
    }
    drawWheel(-hw - 1, front_y, this.steer)
    drawWheel( hw + 1, front_y, this.steer)
    drawWheel(-hw - 1, rear_y,  0)
    drawWheel( hw + 1, rear_y,  0)

    ctx.restore()
  }
}

// ─── Target rings (Target Hunt game mode) ───────────────────────────────────
// Each target is a glowing ring on the arena floor. The player banks it by
// completing a near-full circle (≥330° of rotation) while inside its capture
// radius. Once banked, the target disappears, awards bonus points, and a new
// set spawns when all are cleared.
export interface Target {
  x: number
  y: number
  r: number          // visual ring radius
  captureR: number   // car must stay within this distance
  accumulatedDeg: number  // |Δheading| while car was inside
  hit: boolean
  phase: number      // for shimmer animation
}

const TARGET_GOAL_DEG = 330  // ~one full lap to bank a target
const TARGET_BONUS_POINTS = 4500

export function makeTargetSet(): Target[] {
  // Three rings on a randomised pattern, kept well inside the arena.
  const A = ARENA
  const margin = 220
  const positions: Array<[number, number]> = []
  for (let i = 0; i < 3; i++) {
    let tries = 0
    while (tries++ < 20) {
      const x = A.l + margin + Math.random() * (A.r - A.l - margin * 2)
      const y = A.t + margin + Math.random() * (A.b - A.t - margin * 2)
      // keep them apart from each other and from the car spawn (CarPhysics.START_X/Y)
      const sx = CarPhysics.START_X, sy = CarPhysics.START_Y
      if (Math.hypot(x - sx, y - sy) < 220) continue
      let ok = true
      for (const [px, py] of positions) {
        if (Math.hypot(x - px, y - py) < 280) { ok = false; break }
      }
      if (ok) { positions.push([x, y]); break }
    }
  }
  return positions.map(([x, y]) => ({
    x, y, r: 70, captureR: 110, accumulatedDeg: 0, hit: false, phase: Math.random() * TWO_PI,
  }))
}

export function updateTargets(
  targets: Target[],
  car: CarPhysics,
  dt: number,
  onBank: (t: Target) => void,
): void {
  for (const t of targets) {
    t.phase += dt * 2.2
    if (t.hit) continue
    const dx = car.x - t.x
    const dy = car.y - t.y
    const inside = dx * dx + dy * dy < t.captureR * t.captureR
    if (inside) {
      // accumulate yaw while inside, scaled by |omega| so it must be a real spin
      const yaw = Math.abs(car.omega * dt) * (180 / Math.PI)
      // only count when the rear is sliding (otherwise just driving in circles is too easy)
      if (Math.abs(car.slipAngleR) > 0.18) {
        t.accumulatedDeg += yaw
        if (t.accumulatedDeg >= TARGET_GOAL_DEG) {
          t.hit = true
          onBank(t)
        }
      }
    } else if (t.accumulatedDeg > 0) {
      // decay when the car drifts away
      t.accumulatedDeg = Math.max(0, t.accumulatedDeg - 60 * dt)
    }
  }
}

export function drawTargets(ctx: CanvasRenderingContext2D, targets: Target[]) {
  for (const t of targets) {
    if (t.hit) continue
    const progress = Math.min(1, t.accumulatedDeg / TARGET_GOAL_DEG)
    const pulse = 0.6 + 0.4 * Math.sin(t.phase * 1.4)
    // Outer glow
    const glow = ctx.createRadialGradient(t.x, t.y, t.r * 0.6, t.x, t.y, t.r * 1.6)
    glow.addColorStop(0, `rgba(34,197,94,${0.18 * pulse})`)
    glow.addColorStop(1, 'rgba(34,197,94,0)')
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 1.6, 0, TWO_PI); ctx.fill()
    // Ring track (dim)
    ctx.strokeStyle = 'rgba(34,197,94,0.35)'
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TWO_PI); ctx.stroke()
    // Progress arc (bright, fills clockwise from top)
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(t.x, t.y, t.r, -Math.PI / 2, -Math.PI / 2 + progress * TWO_PI)
    ctx.stroke()
    // Capture-radius hint (dashed, very faint)
    ctx.strokeStyle = 'rgba(34,197,94,0.18)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(t.x, t.y, t.captureR, 0, TWO_PI); ctx.stroke()
    ctx.setLineDash([])
    // Centre dot + degree number
    ctx.fillStyle = '#22c55e'
    ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, TWO_PI); ctx.fill()
    ctx.font = 'bold 18px "Anton", Impact, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(`${Math.floor(t.accumulatedDeg)}°`, t.x, t.y + 24)
  }
}

// ─── ConePhysics ─────────────────────────────────────────────────────────────
export class ConePhysics {
  x0: number; y0: number
  x: number; y: number
  vx = 0; vy = 0
  r = 9; h = 18
  tilt = 0; tiltVel = 0
  spin = 0; spinVel = 0

  constructor(x: number, y: number) {
    this.x0 = x; this.y0 = y
    this.x = x; this.y = y
  }

  reset() {
    this.x = this.x0; this.y = this.y0
    this.vx = this.vy = this.tilt = this.tiltVel = this.spin = this.spinVel = 0
  }

  update(dt: number) {
    this.vx *= Math.exp(-2.4 * dt)
    this.vy *= Math.exp(-2.4 * dt)
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.tiltVel *= Math.exp(-3.5 * dt)
    this.spinVel *= Math.exp(-2.8 * dt)
    this.tilt += this.tiltVel * dt
    this.spin += this.spinVel * dt
    this.tilt = clamp(this.tilt, -Math.PI / 2, Math.PI / 2)
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.spin)
    const upright = 1 - Math.abs(this.tilt) / (Math.PI / 2)
    const conH = this.h * upright
    // Base
    ctx.fillStyle = `rgba(240,240,240,${0.7 + 0.3 * upright})`
    ctx.beginPath()
    ctx.ellipse(0, conH * 0.1, this.r * (1 - upright * 0.3), this.r * 0.4, 0, 0, TWO_PI)
    ctx.fill()
    // Body
    ctx.fillStyle = `rgba(220,50,30,${0.8 + 0.2 * upright})`
    ctx.beginPath()
    ctx.moveTo(-this.r, conH * 0.15)
    ctx.lineTo(this.r, conH * 0.15)
    ctx.lineTo(0, -conH * 0.85)
    ctx.closePath()
    ctx.fill()
    // White stripe
    ctx.fillStyle = `rgba(255,255,255,${0.7 * upright})`
    ctx.beginPath()
    ctx.moveTo(-this.r * 0.7, conH * 0.15)
    ctx.lineTo(this.r * 0.7, conH * 0.15)
    ctx.lineTo(this.r * 0.4, -conH * 0.1)
    ctx.lineTo(-this.r * 0.4, -conH * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  collideWith(car: CarPhysics, sparks: Particle[]) {
    const dx = this.x - car.x
    const dy = this.y - car.y
    const dist = Math.hypot(dx, dy)
    const minDist = car.width / 2 + this.r + 4
    if (dist < minDist && dist > 0.05) {
      const nx = dx / dist
      const ny = dy / dist
      const relV = car.vx * nx + car.vy * ny
      if (relV > 0) {
        this.vx += nx * relV * 1.6 + 0.25 * car.vx
        this.vy += ny * relV * 1.6 + 0.25 * car.vy
        this.tilt = clamp(this.tilt + 0.45, -0.9, 0.9)
        this.tiltVel += (Math.random() - 0.5) * 4
        this.spinVel += (Math.random() - 0.5) * 8 + 2 * sign(car.omega)
        if (sparks.length < 60) {
          sparks.push({
            x: this.x, y: this.y,
            vx: 0.3 * this.vx, vy: 0.3 * this.vy,
            r: 6, life: 0.5, maxLife: 0.5, alpha: 0.5,
            color: '216,212,200'
          })
        }
      }
    }
  }
}

// ─── Particle ────────────────────────────────────────────────────────────────
export interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number
  life: number; maxLife: number
  alpha: number
  color: string
}

export function updateParticles(particles: Particle[], dt: number, gravity = false) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) { particles.splice(i, 1); continue }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 1 - (gravity ? 0.6 : 1.2) * dt
    p.vy *= 1 - (gravity ? 0.6 : 1.2) * dt
    if (gravity) p.vy += 60 * dt
    if (!gravity) p.r += 8 * dt // smoke expands (slowed so 3-5s puffs don't blow up)
  }
}

// ─── Score state ─────────────────────────────────────────────────────────────
export interface ScoreState {
  score: number
  comboDeg: number
  mult: number
  comboIdleT: number
  lastSpinFloor: number
  sessionTotalSpins: number
  sessionMaxCombo: number
  damageBumps: number      // count of wall bumps in this session
  damagePenalty: number    // total R deducted from score by wall bumps
}

export function createScoreState(): ScoreState {
  return {
    score: 0, comboDeg: 0, mult: 1,
    comboIdleT: 0, lastSpinFloor: 0,
    sessionTotalSpins: 0, sessionMaxCombo: 0,
    damageBumps: 0, damagePenalty: 0,
  }
}

/** Called by the canvas on every wall bump.
 *  Cost scales with car speed at the moment of impact: gentle taps barely
 *  hurt, but slamming a wall at 100+ km/h shaves big chunks off the score
 *  and ends the current combo. Returns the points deducted. */
export function applyWallDamage(state: ScoreState, car: CarPhysics): number {
  const speed = Math.hypot(car.vx, car.vy)
  // Min 80 (gentle nudge), scales up linearly with speed.
  const cost = Math.floor(Math.max(80, speed * 4.5))
  state.score = Math.max(0, state.score - cost)
  state.damageBumps += 1
  state.damagePenalty += cost
  // Wall bumps reset the combo — punish careless driving.
  state.comboDeg = 0
  state.mult = 1
  state.lastSpinFloor = 0
  state.comboIdleT = 0
  return cost
}

export function updateScore(
  state: ScoreState,
  car: CarPhysics,
  dt: number,
  tune: TuneParams,
  onMilestone: (text: string, sub: string, color: string) => void
) {
  if (Math.abs(car.omega) > 0.6 && Math.abs(car.slipAngleR) > 0.25) {
    const degThisFrame = 180 * Math.abs(car.omega * dt) / Math.PI
    const driftBonus = clamp(Math.abs(car.v_lat || 0) / 70, 0, 2)
    // Edge bonus: closer to wall = more excitement
    const arena = ARENA
    const edgeDist = Math.max(0, Math.min(
      car.x - arena.l, arena.r - car.x, car.y - arena.t, arena.b - car.y
    ))
    const edgeBonus = 1 + 2 * clamp(1 - (edgeDist - 30) / 190, 0, 1)
    const points = degThisFrame * state.mult * (1 + driftBonus) * edgeBonus
    state.comboDeg += degThisFrame
    state.score += Math.floor(1.4 * points)
    state.comboIdleT = 0

    // Milestone checks
    const spinFloor = Math.floor(state.comboDeg / 360)
    if (spinFloor > state.lastSpinFloor) {
      const milestone = MILESTONES.find(m => state.comboDeg >= m.deg && state.comboDeg < m.deg + 360)
      if (milestone) {
        onMilestone(milestone.text, milestone.sub, milestone.c)
      }
      state.sessionTotalSpins++
      state.mult = Math.min(1 + Math.floor(state.comboDeg / 360) * 0.1, 4)
      state.lastSpinFloor = spinFloor
    }
    state.sessionMaxCombo = Math.max(state.sessionMaxCombo, state.comboDeg)
  } else {
    state.comboIdleT += dt
    if (state.comboIdleT > 1.8) {
      state.comboDeg = 0
      state.mult = 1
      state.lastSpinFloor = 0
      state.comboIdleT = 0
    }
  }
}

// ─── Camera ──────────────────────────────────────────────────────────────────
export class CameraState {
  x = CarPhysics.START_X
  y = CarPhysics.START_Y
  tx = CarPhysics.START_X
  ty = CarPhysics.START_Y

  reset(x: number, y: number) {
    this.x = this.tx = x
    this.y = this.ty = y
  }

  update(car: CarPhysics, dt: number) {
    const spd = Math.hypot(car.vx, car.vy)
    const spinFactor = clamp(Math.abs(car.omega) / 3.5, 0, 1)
    const leadDist = Math.min(0.32 * spd, 90) * clamp(1 - spinFactor, 0, 1)
    let lx = 0, ly = 0
    if (spd > 5) {
      lx = (car.vx / spd) * leadDist
      ly = (car.vy / spd) * leadDist
    }
    this.tx = car.x + lx
    this.ty = car.y + ly
    const k = lerp(2.6, 5.5, spinFactor)
    this.x = expLerp(this.x, this.tx, k, dt)
    this.y = expLerp(this.y, this.ty, k, dt)
    this.x = clamp(this.x, 100, 1400)
    this.y = clamp(this.y, 100, 1400)
  }
}

// ─── Tire marks ──────────────────────────────────────────────────────────────
export function drawTireMarks(
  ctx: CanvasRenderingContext2D,
  car: CarPhysics,
  intensity: number
) {
  const wheels = car.rearWheels()
  if (!car.lastWheels) {
    car.lastWheels = wheels.map(w => ({ x: w.x, y: w.y }))
    return
  }
  const alpha = clamp(0.1 + 0.55 * intensity, 0, 0.85)
  ctx.strokeStyle = `rgba(8,6,4,${alpha})`
  ctx.lineWidth = 3.4
  ctx.lineCap = 'round'
  for (let i = 0; i < 2; i++) {
    const dx = wheels[i].x - car.lastWheels[i].x
    const dy = wheels[i].y - car.lastWheels[i].y
    if (dx * dx + dy * dy > 150) { car.lastWheels = null; return }
    ctx.beginPath()
    ctx.moveTo(car.lastWheels[i].x, car.lastWheels[i].y)
    ctx.lineTo(wheels[i].x, wheels[i].y)
    ctx.stroke()
    car.lastWheels[i].x = wheels[i].x
    car.lastWheels[i].y = wheels[i].y
  }
}

// ─── Floor drawing ───────────────────────────────────────────────────────────
/** Top-level floor renderer. Each track shares the same arena bounds but
 *  decorates the asphalt differently. trackId values come from TRACKS in
 *  spinna-data.ts; unknown ids fall back to 'donut'. */
export function drawFloor(ctx: CanvasRenderingContext2D, trackId: string = 'donut') {
  const W = 1500, H = 1500
  const cx = 750, cy = 750
  const arena = ARENA

  ctx.clearRect(0, 0, W, H)

  // Background
  const bg = ctx.createRadialGradient(cx, cy, 200, cx, cy, 1050)
  bg.addColorStop(0, '#181412')
  bg.addColorStop(1, '#0a0807')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Grit noise (every track gets this for visual consistency)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  let seed = 9999
  const prng = () => { seed = (9301 * seed + 49297) % 233280; return seed / 233280 }
  for (let i = 0; i < 4000; i++) ctx.fillRect(W * prng(), H * prng(), 1, 1)
  ctx.fillStyle = 'rgba(120,90,60,0.18)'
  for (let i = 0; i < 1500; i++) ctx.fillRect(W * prng(), H * prng(), 1, 1)

  // Arena floor
  const sw = arena.r - arena.l, sh = arena.b - arena.t
  const floorGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, 0.7 * Math.max(sw, sh))
  floorGrad.addColorStop(0, '#26262c')
  floorGrad.addColorStop(0.6, '#1a1a1f')
  floorGrad.addColorStop(1, '#101015')
  ctx.fillStyle = floorGrad
  ctx.fillRect(arena.l, arena.t, sw, sh)

  // Asphalt detail
  ctx.fillStyle = 'rgba(255,255,255,0.012)'
  for (let i = 0; i < 8000; i++) ctx.fillRect(arena.l + prng() * sw, arena.t + prng() * sh, 1, 1)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  for (let i = 0; i < 6500; i++) ctx.fillRect(arena.l + prng() * sw, arena.t + prng() * sh, 1, 1)

  // Per-track overlay
  switch (trackId) {
    case 'intersection': return drawIntersection(ctx)
    case 'airport':      return drawAirport(ctx)
    case 'harbour':      return drawHarbour(ctx)
    case 'cityblock':    return drawCityBlock(ctx)
    case 'shisanyama':   return drawShisaNyama(ctx)
    case 'donut':
    default:             return drawDonut(ctx)
  }
}

function drawDonut(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  const sw = arena.r - arena.l, sh = arena.b - arena.t

  // Donut rings
  const ra = sw / 2 - 60, rb = sh / 2 - 40
  const ri = ra - 110, rj = rb - 110
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, ra, rb, 0, 0, TWO_PI)
  ctx.ellipse(cx, cy, ri, rj, 0, 0, TWO_PI, true)
  ctx.fillStyle = '#16161b'
  ctx.fill('evenodd')
  ctx.restore()

  // Donut stripe
  const stripeCount = 56
  for (let i = 0; i < stripeCount; i++) {
    const a0 = (i / stripeCount) * TWO_PI
    const a1 = ((i + 1) / stripeCount) * TWO_PI
    ctx.beginPath()
    ctx.ellipse(cx, cy, ra + 6, rb + 6, 0, a0, a1)
    ctx.lineWidth = 6
    ctx.strokeStyle = i % 2 === 0 ? '#d92d2d' : '#f5f5f0'
    ctx.stroke()
  }
  const stripeCount2 = 48
  for (let i = 0; i < stripeCount2; i++) {
    const a0 = (i / stripeCount2) * TWO_PI
    const a1 = ((i + 1) / stripeCount2) * TWO_PI
    ctx.beginPath()
    ctx.ellipse(cx, cy, ri - 6, rj - 6, 0, a0, a1)
    ctx.lineWidth = 6
    ctx.strokeStyle = i % 2 === 0 ? '#d92d2d' : '#f5f5f0'
    ctx.stroke()
  }

  // Yellow dots
  ctx.fillStyle = 'rgba(252,208,11,0.55)'
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TWO_PI
    const dx = Math.cos(a) * (ri + 18)
    const dy = Math.sin(a) * (rj + 18)
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, 2.4, 0, TWO_PI)
    ctx.fill()
  }

  // Checkerboard entry strip
  const stripT = cy + rj + 4, stripB = cy + rb - 4
  const stripL = cx - 28
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(stripL, stripT, 56, stripB - stripT)
  const cellH = (stripB - stripT) / 2
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 7; row++) {
      if ((col + row) % 2 === 0) {
        ctx.fillStyle = '#f5f5f0'
        ctx.fillRect(stripL + 8 * row, stripT + col * cellH, 8, cellH)
      }
    }
  }
  ctx.restore()

  // SPIN text watermark
  ctx.save()
  ctx.translate(cx, cy + 20)
  ctx.rotate(-0.18)
  ctx.font = 'bold 220px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(252,208,11,0.05)'
  ctx.fillText('SPIN', 0, 0)
  ctx.font = 'bold 88px "Anton", Impact, sans-serif'
  ctx.fillStyle = 'rgba(255,45,45,0.05)'
  ctx.fillText('MFANA', 0, 160)
  ctx.restore()

  // Concentric rings
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 2
  for (const rad of [120, 220, 320, 440]) {
    ctx.beginPath()
    ctx.arc(cx, cy, rad, 0, TWO_PI)
    ctx.stroke()
  }

  // Crosshair
  ctx.beginPath()
  ctx.moveTo(cx - 500, cy); ctx.lineTo(cx + 500, cy)
  ctx.moveTo(cx, cy - 500); ctx.lineTo(cx, cy + 500)
  ctx.stroke()

  // Center mark
  ctx.fillStyle = '#fcd00b'
  ctx.fillRect(cx - 1.5, cy - 14, 3, 28)
  ctx.fillRect(cx - 14, cy - 1.5, 28, 3)

  drawBoundary(ctx)
}

// Shared dashed-yellow + thin-red arena boundary used by every track.
function drawBoundary(ctx: CanvasRenderingContext2D) {
  const arena = ARENA
  const sw = arena.r - arena.l, sh = arena.b - arena.t
  ctx.strokeStyle = '#fcd00b'
  ctx.lineWidth = 4
  ctx.setLineDash([22, 14])
  ctx.strokeRect(arena.l, arena.t, sw, sh)
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(222,56,49,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(arena.l + 12, arena.t + 12, sw - 24, sh - 24)
}

// ─── Intersection ─────────────────────────────────────────────────────────────
// Four-way crossroads: two perpendicular wide roads with stop-line markings.
function drawIntersection(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  const sw = arena.r - arena.l, sh = arena.b - arena.t
  const roadW = 220
  // North-south & east-west roads (slightly darker asphalt)
  ctx.fillStyle = '#0c0c10'
  ctx.fillRect(cx - roadW / 2, arena.t, roadW, sh)
  ctx.fillRect(arena.l, cy - roadW / 2, sw, roadW)
  // Centre dashed line (yellow), N-S
  ctx.strokeStyle = '#fcd00b'
  ctx.lineWidth = 3
  ctx.setLineDash([30, 22])
  ctx.beginPath(); ctx.moveTo(cx, arena.t + 20); ctx.lineTo(cx, arena.b - 20); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(arena.l + 20, cy); ctx.lineTo(arena.r - 20, cy); ctx.stroke()
  ctx.setLineDash([])
  // White edge lines
  ctx.strokeStyle = 'rgba(245,245,240,0.85)'
  ctx.lineWidth = 2
  ctx.strokeRect(cx - roadW / 2 + 6, arena.t, roadW - 12, sh)
  ctx.strokeRect(arena.l, cy - roadW / 2 + 6, sw, roadW - 12)
  // Stop bars (where the roads enter the central intersection box)
  ctx.fillStyle = '#f5f5f0'
  ctx.fillRect(cx - roadW / 2 + 8, cy - roadW / 2 - 10, roadW - 16, 6)
  ctx.fillRect(cx - roadW / 2 + 8, cy + roadW / 2 + 4, roadW - 16, 6)
  ctx.fillRect(cx - roadW / 2 - 10, cy - roadW / 2 + 8, 6, roadW - 16)
  ctx.fillRect(cx + roadW / 2 + 4, cy - roadW / 2 + 8, 6, roadW - 16)
  // Pedestrian crossings (zebra stripes outside the box, on each entry)
  const zebraDraw = (x: number, y: number, vertical: boolean) => {
    ctx.fillStyle = '#f5f5f0'
    for (let i = 0; i < 8; i++) {
      if (vertical) ctx.fillRect(x + i * 12, y, 8, 28)
      else ctx.fillRect(x, y + i * 12, 28, 8)
    }
  }
  zebraDraw(cx - 48, cy - roadW / 2 - 50, true)   // north entry
  zebraDraw(cx - 48, cy + roadW / 2 + 22, true)   // south entry
  zebraDraw(cx - roadW / 2 - 50, cy - 48, false)  // west entry
  zebraDraw(cx + roadW / 2 + 22, cy - 48, false)  // east entry
  // Centre name watermark
  ctx.save()
  ctx.font = 'bold 80px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillText('4-WAY', cx, cy - 20)
  ctx.font = 'bold 32px "Anton", Impact, sans-serif'
  ctx.fillStyle = 'rgba(252,208,11,0.06)'
  ctx.fillText('STOP', cx, cy + 30)
  ctx.restore()
  drawBoundary(ctx)
}

// ─── Old airstrip ─────────────────────────────────────────────────────────────
// Single long runway with painted numbers + runway lights along the edges.
function drawAirport(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  // Wide grey runway
  const rwW = 600
  ctx.fillStyle = '#15151a'
  ctx.fillRect(cx - rwW / 2, arena.t + 40, rwW, arena.b - arena.t - 80)
  // Centre dashed white line
  ctx.strokeStyle = '#f5f5f0'
  ctx.lineWidth = 6
  ctx.setLineDash([60, 36])
  ctx.beginPath(); ctx.moveTo(cx, arena.t + 80); ctx.lineTo(cx, arena.b - 80); ctx.stroke()
  ctx.setLineDash([])
  // Solid white edges
  ctx.strokeStyle = 'rgba(245,245,240,0.85)'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(cx - rwW / 2 + 18, arena.t + 80); ctx.lineTo(cx - rwW / 2 + 18, arena.b - 80); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + rwW / 2 - 18, arena.t + 80); ctx.lineTo(cx + rwW / 2 - 18, arena.b - 80); ctx.stroke()
  // Threshold stripes (top + bottom)
  ctx.fillStyle = '#f5f5f0'
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(cx - rwW / 2 + 40 + i * 50, arena.t + 60, 28, 60)
    ctx.fillRect(cx - rwW / 2 + 40 + i * 50, arena.b - 120, 28, 60)
  }
  // Runway numbers (huge)
  ctx.save()
  ctx.font = 'bold 220px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(245,245,240,0.18)'
  ctx.fillText('27', cx, arena.t + 230)
  ctx.save()
  ctx.translate(cx, arena.b - 230); ctx.rotate(Math.PI)
  ctx.fillText('09', 0, 0)
  ctx.restore()
  ctx.restore()
  // Runway edge lights — small yellow dots
  ctx.fillStyle = 'rgba(252,208,11,0.7)'
  for (let y = arena.t + 100; y <= arena.b - 100; y += 60) {
    ctx.beginPath(); ctx.arc(cx - rwW / 2 - 14, y, 3, 0, TWO_PI); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + rwW / 2 + 14, y, 3, 0, TWO_PI); ctx.fill()
  }
  // Apron rectangles to either side
  ctx.fillStyle = 'rgba(60,60,70,0.5)'
  ctx.fillRect(arena.l + 30, arena.t + 200, 130, 200)
  ctx.fillRect(arena.l + 30, arena.b - 400, 130, 200)
  ctx.fillRect(arena.r - 160, arena.t + 200, 130, 200)
  ctx.fillRect(arena.r - 160, arena.b - 400, 130, 200)
  drawBoundary(ctx)
}

// ─── Harbour docks ────────────────────────────────────────────────────────────
// Concrete pad with container blocks lining the edges.
function drawHarbour(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  // Bluish concrete tint
  ctx.fillStyle = 'rgba(20,30,40,0.5)'
  ctx.fillRect(arena.l, arena.t, arena.r - arena.l, arena.b - arena.t)
  // Concrete joint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let x = arena.l; x <= arena.r; x += 120) {
    ctx.beginPath(); ctx.moveTo(x, arena.t); ctx.lineTo(x, arena.b); ctx.stroke()
  }
  for (let y = arena.t; y <= arena.b; y += 120) {
    ctx.beginPath(); ctx.moveTo(arena.l, y); ctx.lineTo(arena.r, y); ctx.stroke()
  }
  // Cargo containers along the four edges (rectangles in shipping colours)
  const colors = ['#cc3300', '#1c69d4', '#22c55e', '#e6a300', '#7c2128', '#06b6d4']
  const cw = 90, ch = 30
  const placeContainer = (x: number, y: number, idx: number, rotated: boolean) => {
    ctx.save()
    ctx.translate(x, y)
    if (rotated) ctx.rotate(Math.PI / 2)
    ctx.fillStyle = colors[idx % colors.length]
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    for (let k = 0; k < 6; k++) ctx.fillRect(-cw / 2 + 4 + k * 14, -ch / 2 + 2, 1, ch - 4)
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.strokeRect(-cw / 2, -ch / 2, cw, ch)
    ctx.restore()
  }
  // Top + bottom rows
  for (let i = 0; i < 12; i++) {
    placeContainer(arena.l + 80 + i * 105, arena.t + 50, i, false)
    placeContainer(arena.l + 80 + i * 105, arena.b - 50, i + 3, false)
  }
  // Left + right rows
  for (let i = 0; i < 12; i++) {
    placeContainer(arena.l + 50, arena.t + 80 + i * 105, i + 1, true)
    placeContainer(arena.r - 50, arena.t + 80 + i * 105, i + 2, true)
  }
  // Big "DOCKS" watermark
  ctx.save()
  ctx.font = 'bold 200px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(6,182,212,0.06)'
  ctx.fillText('DOCKS', cx, cy)
  ctx.restore()
  drawBoundary(ctx)
}

// ─── City block ───────────────────────────────────────────────────────────────
// Narrow tar between high-rise rooftops (top-down).
function drawCityBlock(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  // Dark tar centre rectangle
  const tar = 60
  ctx.fillStyle = '#0a0a0e'
  ctx.fillRect(arena.l + tar, arena.t + tar, arena.r - arena.l - tar * 2, arena.b - arena.t - tar * 2)
  // White lane lines on the inner road
  ctx.strokeStyle = 'rgba(245,245,240,0.6)'
  ctx.lineWidth = 2
  ctx.setLineDash([18, 14])
  ctx.strokeRect(cx - 200, cy - 200, 400, 400)
  ctx.setLineDash([])
  // Building rooftops — rectangles along edges with little air-con units
  const drawBuilding = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.strokeRect(x, y, w, h)
    // air-con boxes
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 6 + i * 12, y + h - 18, 8, 8)
    }
    // door / skylight
    ctx.fillStyle = 'rgba(252,208,11,0.4)'
    ctx.fillRect(x + w / 2 - 4, y + h / 2 - 4, 8, 8)
  }
  // Top edge buildings
  let xc = arena.l
  while (xc < arena.r) {
    const w = 90 + (xc % 17) * 5
    const c = ['#3a3a44', '#2e2e36', '#4a3a3a', '#3a4a4a'][xc % 4]
    drawBuilding(xc, arena.t, Math.min(w, arena.r - xc), tar - 4, c)
    xc += w + 4
  }
  xc = arena.l
  while (xc < arena.r) {
    const w = 80 + (xc % 13) * 6
    const c = ['#2e2e36', '#3a3a44', '#3a4a4a', '#4a3a3a'][xc % 4]
    drawBuilding(xc, arena.b - tar + 4, Math.min(w, arena.r - xc), tar - 4, c)
    xc += w + 4
  }
  let yc = arena.t + tar
  while (yc < arena.b - tar) {
    const h = 75 + (yc % 19) * 5
    const c = ['#3a3a44', '#2e2e36', '#4a3a3a', '#3a4a4a'][yc % 4]
    drawBuilding(arena.l, yc, tar - 4, Math.min(h, arena.b - tar - yc), c)
    yc += h + 4
  }
  yc = arena.t + tar
  while (yc < arena.b - tar) {
    const h = 88 + (yc % 11) * 4
    const c = ['#2e2e36', '#3a3a44', '#3a4a4a', '#4a3a3a'][yc % 4]
    drawBuilding(arena.r - tar + 4, yc, tar - 4, Math.min(h, arena.b - tar - yc), c)
    yc += h + 4
  }
  // CBD watermark
  ctx.save()
  ctx.font = 'bold 200px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(168,85,247,0.06)'
  ctx.fillText('CBD', cx, cy)
  ctx.restore()
  drawBoundary(ctx)
}

// ─── Shisa Nyama ──────────────────────────────────────────────────────────────
// Open lot with bonfires + braai drums + crowd on the sidelines.
function drawShisaNyama(ctx: CanvasRenderingContext2D) {
  const cx = 750, cy = 750
  const arena = ARENA
  // Dusty brown ground tint
  ctx.fillStyle = 'rgba(60,40,20,0.35)'
  ctx.fillRect(arena.l, arena.t, arena.r - arena.l, arena.b - arena.t)
  // Tyre marks pre-drawn (looks like a well-used spinpad)
  ctx.strokeStyle = 'rgba(15,12,10,0.4)'
  ctx.lineWidth = 4
  for (let i = 0; i < 6; i++) {
    const r = 200 + i * 30
    const off = (i % 2 === 0 ? 1 : -1) * 30
    ctx.beginPath()
    ctx.ellipse(cx + off, cy, r, r * 0.85, 0, 0, TWO_PI)
    ctx.stroke()
  }
  // Bonfire drums at corners
  const fire = (x: number, y: number) => {
    // drum
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.ellipse(x, y, 22, 12, 0, 0, TWO_PI); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.stroke()
    // flames
    const grad = ctx.createRadialGradient(x, y - 8, 4, x, y - 8, 32)
    grad.addColorStop(0, 'rgba(255,250,200,0.9)')
    grad.addColorStop(0.4, 'rgba(255,160,40,0.7)')
    grad.addColorStop(1, 'rgba(180,60,20,0)')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(x, y - 8, 32, 0, TWO_PI); ctx.fill()
  }
  fire(arena.l + 90, arena.t + 90)
  fire(arena.r - 90, arena.t + 90)
  fire(arena.l + 90, arena.b - 90)
  fire(arena.r - 90, arena.b - 90)
  fire(cx - 380, cy)
  fire(cx + 380, cy)
  // Crowd dots along the edges
  ctx.fillStyle = 'rgba(180,180,180,0.5)'
  for (let x = arena.l + 30; x < arena.r; x += 18) {
    ctx.beginPath(); ctx.arc(x, arena.t + 30, 4, 0, TWO_PI); ctx.fill()
    ctx.beginPath(); ctx.arc(x, arena.b - 30, 4, 0, TWO_PI); ctx.fill()
  }
  for (let y = arena.t + 50; y < arena.b - 50; y += 18) {
    ctx.beginPath(); ctx.arc(arena.l + 30, y, 4, 0, TWO_PI); ctx.fill()
    ctx.beginPath(); ctx.arc(arena.r - 30, y, 4, 0, TWO_PI); ctx.fill()
  }
  // Watermark
  ctx.save()
  ctx.font = 'bold 160px "Anton", Impact, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(239,68,68,0.10)'
  ctx.fillText('SHISA', cx, cy - 50)
  ctx.fillStyle = 'rgba(252,208,11,0.10)'
  ctx.fillText('NYAMA', cx, cy + 80)
  ctx.restore()
  drawBoundary(ctx)
}

// ─── Audio ───────────────────────────────────────────────────────────────────
interface AudioState {
  ctx: AudioContext
  master: GainNode
  engineOsc: OscillatorNode
  engineGain: GainNode
  vibLfo: OscillatorNode
  squealFilter: BiquadFilterNode
  squealGain: GainNode
}

let audio: AudioState | null = null
let lastBoomTime = 0
let lastUpdateTime = 0

export function initAudio() {
  if (audio) return
  const AudioCtx = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    const ctx = new AudioCtx()
    const master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)

    // Engine oscillator
    const engineOsc = ctx.createOscillator()
    engineOsc.type = 'sine'
    engineOsc.frequency.value = 80
    const engineGain = ctx.createGain()
    engineGain.gain.value = 0
    engineOsc.connect(engineGain)
    engineGain.connect(master)
    engineOsc.start()

    // Vib LFO
    const vibLfo = ctx.createOscillator()
    vibLfo.frequency.value = 8
    vibLfo.type = 'sine'
    vibLfo.start()

    // Squeal
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = 2 * Math.random() - 1
    const squealSrc = ctx.createBufferSource()
    squealSrc.buffer = buf
    squealSrc.loop = true
    const squealFilter = ctx.createBiquadFilter()
    squealFilter.type = 'bandpass'
    squealFilter.frequency.value = 2400
    squealFilter.Q.value = 14
    const squealGain = ctx.createGain()
    squealGain.gain.value = 0
    squealSrc.connect(squealFilter)
    squealFilter.connect(squealGain)
    squealGain.connect(master)
    squealSrc.start()

    audio = { ctx, master, engineOsc, engineGain, vibLfo, squealFilter, squealGain }
  } catch {
    audio = null
  }
}

export function resumeAudio() {
  if (audio && audio.ctx.state === 'suspended') audio.ctx.resume()
}

export function stopAudio() {
  if (!audio) return
  const t = audio.ctx.currentTime
  audio.engineGain.gain.cancelScheduledValues(t)
  audio.engineGain.gain.setTargetAtTime(0, t, 0.15)
  audio.squealGain.gain.cancelScheduledValues(t)
  audio.squealGain.gain.setTargetAtTime(0, t, 0.1)
}

export function updateAudio(car: CarPhysics) {
  if (!audio) return
  const t = audio.ctx.currentTime
  if (t - lastUpdateTime < 0.08) return
  lastUpdateTime = t

  const spd = Math.hypot(car.vx, car.vy)
  const baseFreq = 80 + spd * 0.6 + Math.abs(car.omega) * 15
  audio.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.06)
  const engineVol = clamp(0.05 + (spd / 300 + Math.abs(car.throttleIn)) * 0.35, 0, 0.8)
  audio.engineGain.gain.setTargetAtTime(engineVol, t, 0.04)

  const squealIntensity = clamp(Math.abs(car.slipAngleR) * 1.5 + car.wheelspin * 0.8, 0, 1)
  audio.squealFilter.frequency.setTargetAtTime(1800 + squealIntensity * 1400, t, 0.04)
  audio.squealGain.gain.setTargetAtTime(squealIntensity * 0.6, t, 0.04)
}

export function playBoom() {
  if (!audio) return
  const t = audio.ctx.currentTime
  if (t - lastBoomTime < 0.08) return
  lastBoomTime = t
  const osc = audio.ctx.createOscillator()
  osc.type = 'sine'
  const g = audio.ctx.createGain()
  g.gain.value = 0
  osc.connect(g)
  g.connect(audio.master)
  osc.frequency.setValueAtTime(160, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.1)
  g.gain.setValueAtTime(0.08, t)
  g.gain.exponentialRampToValueAtTime(1e-4, t + 0.14)
  osc.start(t)
  osc.stop(t + 0.18)
}

export function playCashOut() {
  if (!audio) return
  const t = audio.ctx.currentTime
  const freqs = [523, 659, 784, 1046]
  freqs.forEach((freq, i) => {
    if (!audio) return
    const osc = audio.ctx.createOscillator()
    osc.type = 'triangle'
    const g = audio.ctx.createGain()
    g.gain.value = 0
    osc.connect(g)
    g.connect(audio.master)
    const st = t + 0.06 * i
    osc.frequency.setValueAtTime(freq, st)
    g.gain.setValueAtTime(0.07, st)
    g.gain.exponentialRampToValueAtTime(1e-4, st + 0.22)
    osc.start(st)
    osc.stop(st + 0.26)
  })
}

// ─── Crowd drawing ───────────────────────────────────────────────────────────
const CROWD_COLORS = [
  '#fcd00b','#ff2d2d','#22c55e','#3b82f6','#a855f7',
  '#f97316','#ec4899','#ffffff','#ef4444','#84cc16',
]
function randCrowdColor() {
  return CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)]
}

export function buildCrowd() {
  const crowd: Array<{x:number,y:number,c:string,bob:number,wave:number}> = []
  const arena = ARENA
  const l = arena.l + 12, r = arena.r - 12
  const t = arena.t + 12, b = arena.b - 12
  for (let row = 0; row < 2; row++) {
    const wy = arena.t - 6 - 9 * row
    const offset = 7 * row
    for (let x = l + offset; x <= r; x += 14) {
      crowd.push({ x: x + rand(-2, 2), y: wy + rand(-1, 1), c: randCrowdColor(), bob: rand(0, TWO_PI), wave: rand(0.5, 1) })
    }
  }
  for (let row = 0; row < 2; row++) {
    const wy = arena.b + 6 + 9 * row
    const offset = 7 * row
    for (let x = l + offset; x <= r; x += 14) {
      crowd.push({ x: x + rand(-2, 2), y: wy + rand(-1, 1), c: randCrowdColor(), bob: rand(0, TWO_PI), wave: rand(0.5, 1) })
    }
  }
  for (let col = 0; col < 2; col++) {
    const wx = arena.l - 6 - 9 * col
    const offset = 7 * col
    for (let y = t + offset; y <= b; y += 14) {
      crowd.push({ x: wx + rand(-1, 1), y: y + rand(-2, 2), c: randCrowdColor(), bob: rand(0, TWO_PI), wave: rand(0.5, 1) })
    }
  }
  for (let col = 0; col < 2; col++) {
    const wx = arena.r + 6 + 9 * col
    const offset = 7 * col
    for (let y = t + offset; y <= b; y += 14) {
      crowd.push({ x: wx + rand(-1, 1), y: y + rand(-2, 2), c: randCrowdColor(), bob: rand(0, TWO_PI), wave: rand(0.5, 1) })
    }
  }
  return crowd
}

export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  crowd: ReturnType<typeof buildCrowd>,
  t: number,
  excitement: number
) {
  for (const person of crowd) {
    const bob = Math.sin(t * person.wave * 3 + person.bob) * (2 + 4 * excitement)
    ctx.fillStyle = person.c
    ctx.beginPath()
    ctx.arc(person.x, person.y + bob, 3.5, 0, TWO_PI)
    ctx.fill()
  }
}

// ─── Smoke ───────────────────────────────────────────────────────────────────
export function spawnSmoke(
  smoke: Particle[],
  car: CarPhysics,
  wheelspin: boolean,
  slipping: boolean
) {
  if (!wheelspin && !slipping) return
  // Fewer puffs but they hang around twice as long, so a faint trail
  // lingers between spawns — denser-looking without crowding the canvas.
  if (smoke.length > 140) return
  const wheels = car.rearWheels()
  const speed = Math.hypot(car.vx, car.vy)
  for (const w of wheels) {
    if (Math.random() > 0.45) continue
    smoke.push({
      x: w.x + rand(-3, 3),
      y: w.y + rand(-3, 3),
      vx: -car.vx * 0.08 + rand(-10, 10),
      vy: -car.vy * 0.08 + rand(-10, 10),
      r: rand(5, 9),
      // Was 1.6–2.4s → 3.2–4.8s so each puff lasts twice as long.
      life: rand(3.2, 4.8),
      maxLife: 4.8,
      alpha: clamp(0.30 + speed / 520, 0.18, 0.65),
      color: '140,130,120',
    })
  }
}

// How long a smoke puff sits "low" on the ground (drawn under the car) before
// it starts to rise into the air (drawn over the car). Tuned so a puff that
// just spawned at the rear wheels reads as ground dust, but you actually
// vanish into your own trail if you come back around through it.
const SMOKE_LIFT_DELAY = 0.35  // seconds since spawn

function smokeAge(p: Particle): number {
  return p.maxLife - p.life
}

/** Draws smoke puffs whose age < SMOKE_LIFT_DELAY — i.e. ground-level, below the car. */
export function drawSmokeBelow(ctx: CanvasRenderingContext2D, smoke: Particle[]) {
  for (const p of smoke) {
    if (smokeAge(p) >= SMOKE_LIFT_DELAY) continue
    const t = 1 - p.life / p.maxLife
    const alpha = p.alpha * (1 - t * 0.8)
    ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(2)})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, TWO_PI)
    ctx.fill()
  }
}

/** Draws smoke puffs that have lifted above the ground — drawn over the car
 *  so the player can disappear into their own trail when they cross it again. */
export function drawSmokeAbove(ctx: CanvasRenderingContext2D, smoke: Particle[]) {
  for (const p of smoke) {
    if (smokeAge(p) < SMOKE_LIFT_DELAY) continue
    const t = 1 - p.life / p.maxLife
    // Brief 0.2s fade-in as it "rises" so the swap doesn't pop.
    const sinceLift = Math.min(1, (smokeAge(p) - SMOKE_LIFT_DELAY) / 0.2)
    const alpha = p.alpha * (1 - t * 0.8) * (0.6 + 0.4 * sinceLift)
    ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(2)})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, TWO_PI)
    ctx.fill()
  }
}

/** Backwards-compat shim — same as drawSmokeBelow + drawSmokeAbove combined,
 *  rendered as a single layer. New callers should use the split pair. */
export function drawSmoke(ctx: CanvasRenderingContext2D, smoke: Particle[]) {
  drawSmokeBelow(ctx, smoke)
  drawSmokeAbove(ctx, smoke)
}

export function drawSparks(ctx: CanvasRenderingContext2D, sparks: Particle[]) {
  for (const p of sparks) {
    const alpha = p.alpha * (p.life / p.maxLife)
    ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(2)})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 0.4, 0, TWO_PI)
    ctx.fill()
  }
}
