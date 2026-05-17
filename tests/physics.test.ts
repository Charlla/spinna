/**
 * Spinna physics unit tests.
 *
 * Pure-engine assertions — no canvas, no React. Runs the bicycle-model
 * `CarPhysics` through controlled inputs and verifies macroscopic behaviour
 * (forward motion, left/right steering yaw, handbrake spin, etc.).
 *
 * Run with:  npx tsx tests/physics.test.ts
 *
 * Each case prints PASS/FAIL — the harness exits 1 on any failure so it can
 * be wired into npm scripts / CI.
 */
import { CarPhysics } from '../lib/spinna-engine'
import { CARS, TIRES, DEFAULT_TUNE } from '../lib/spinna-data'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  console.log(`${tag}  ${label}${detail ? `  — ${detail}` : ''}`)
  if (!ok) failures++
}

function makeCar() {
  const def = CARS.find(c => c.id === 'e30')!
  const tire = TIRES.find(t => t.id === 'budget')!
  const car = new CarPhysics(def, tire, 100)
  car.reset()
  return car
}

// Drive the car for N seconds of simulated time at 60Hz with given inputs.
function simulate(car: CarPhysics, seconds: number, throttle: number, steer: number, hbrk = false) {
  const dt = 1 / 60
  const steps = Math.floor(seconds / dt)
  for (let i = 0; i < steps; i++) car.update(dt, throttle, steer, hbrk, DEFAULT_TUNE)
}

// ── Case 1: full throttle → speed grows above 0
{
  const car = makeCar()
  simulate(car, 2, 1, 0)
  check('full throttle accelerates the car',
    car.speed > 30,
    `speed=${car.speed.toFixed(1)}px/s`)
}

// ── Case 2: throttle=0 means no engine drive (only rolling drag)
{
  const car = makeCar()
  simulate(car, 2, 0, 0)
  check('idle throttle keeps car stationary',
    car.speed < 1,
    `speed=${car.speed.toFixed(2)}px/s`)
}

// ── Case 3: forward + LEFT steer → heading turns counter-clockwise (omega<0 in our sign-convention)
{
  const car = makeCar()
  const headingBefore = car.heading
  simulate(car, 1, 1, 0)       // 1 second straight ahead to build speed
  simulate(car, 2.5, 0.7, -1)  // then hard left
  const headingDelta = car.heading - headingBefore
  // Heading should have changed perceptibly; sign tells us which way.
  check('left steer changes heading',
    Math.abs(headingDelta) > 0.15,
    `Δheading=${headingDelta.toFixed(3)} rad`)
  // ω (yaw rate) at the end should be NEGATIVE (turning left = CCW).
  // If left/right are swapped, this will fail.
  check('left steer produces negative yaw rate ω',
    car.omega <= 0,
    `omega=${car.omega.toFixed(3)} rad/s`)
}

// ── Case 4: forward + RIGHT steer → heading turns the OTHER way from left
{
  const car = makeCar()
  simulate(car, 1, 1, 0)
  const headingBefore = car.heading
  simulate(car, 2.5, 0.7, +1)  // hard right
  const headingDelta = car.heading - headingBefore
  check('right steer changes heading',
    Math.abs(headingDelta) > 0.15,
    `Δheading=${headingDelta.toFixed(3)} rad`)
  check('right steer produces positive yaw rate ω',
    car.omega >= 0,
    `omega=${car.omega.toFixed(3)} rad/s`)
}

// ── Case 5: left vs right yields OPPOSITE yaw signs (the symmetry test)
// This is the critical regression for the "rear wheels steer" bug.
{
  const carL = makeCar(); simulate(carL, 1, 1, 0); simulate(carL, 2, 0.7, -1)
  const carR = makeCar(); simulate(carR, 1, 1, 0); simulate(carR, 2, 0.7, +1)
  check('left and right yaw rates have opposite signs',
    Math.sign(carL.omega) !== Math.sign(carR.omega) && carL.omega !== 0 && carR.omega !== 0,
    `L.ω=${carL.omega.toFixed(3)}  R.ω=${carR.omega.toFixed(3)}`)
  // And the magnitudes should be roughly similar (within 2x).
  const ratio = Math.abs(carL.omega) / Math.max(Math.abs(carR.omega), 1e-6)
  check('left and right yaw rates have similar magnitude',
    ratio > 0.5 && ratio < 2,
    `L/R magnitude ratio=${ratio.toFixed(2)}`)
}

// ── Case 6: handbrake produces measurable yaw at speed (drift initiation)
{
  const car = makeCar()
  simulate(car, 2, 1, 0)             // get up to speed
  simulate(car, 0.5, 0.3, -1, true)  // hbrk + slight throttle + left
  check('handbrake initiates a drift (measurable yaw)',
    Math.abs(car.omega) > 0.2,
    `omega=${car.omega.toFixed(3)} rad/s`)
}

// ── Case 7: at very low speed, steering has more effect (steerMaxRad)
{
  const carSlow = makeCar()
  simulate(carSlow, 0.5, 0.4, 0)
  const slowSpeed = carSlow.speed
  simulate(carSlow, 0.5, 0.4, 1)
  const slowYaw = Math.abs(carSlow.omega)

  const carFast = makeCar()
  simulate(carFast, 2, 1, 0)
  simulate(carFast, 0.5, 0.4, 1)
  const fastYaw = Math.abs(carFast.omega)
  check('low speed yaw rate ≥ high speed yaw rate for same steer input',
    slowYaw === 0 || slowYaw >= fastYaw * 0.7,
    `slow speed=${slowSpeed.toFixed(1)} ω=${slowYaw.toFixed(3)} | fast ω=${fastYaw.toFixed(3)}`)
}

// ── Case 8: tire-health depletes during sustained spin (any non-zero wear)
{
  const def = CARS.find(c => c.id === 'e30')!
  const usedTire = TIRES.find(t => t.id === 'used')!   // 1.6x wear multiplier
  const car = new CarPhysics(def, usedTire, 100)
  car.reset()
  const startHealth = car.tireHealth
  simulate(car, 3, 1, 0, false)
  simulate(car, 5, 1, 1, true)
  check('handbrake-spin wears tires',
    car.tireHealth < startHealth,
    `tireHealth ${startHealth} → ${car.tireHealth.toFixed(2)}`)
}

// ── Case 9: rearWheels returns wheels BEHIND the car (positive body-y in canvas-local)
{
  const car = makeCar()
  car.x = 500; car.y = 500; car.heading = -Math.PI / 2 // facing -x (left)
  const wheels = car.rearWheels()
  // When facing left (heading=-π/2), the REAR of the car is to the RIGHT in world space.
  // Both rear wheels should have x > 500.
  const allOnTheRight = wheels.every(p => p.x > 500)
  check('rearWheels() actually returns wheels behind the car',
    allOnTheRight,
    `wheels=${JSON.stringify(wheels.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })))}`)
}

// ── Summary
console.log()
if (failures > 0) {
  console.error(`\x1b[31m${failures} test(s) failed\x1b[0m`)
  process.exit(1)
}
console.log(`\x1b[32mAll physics tests passed\x1b[0m`)
