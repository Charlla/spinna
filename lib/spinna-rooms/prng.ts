/*
 * Deterministic PRNG + ring generator for Spinna multiplayer rooms.
 *
 * The host writes a random `world_seed` when the room is created. Every
 * client and the server then compute ring positions the same way using
 * mulberry32(world_seed + ring_idx) — that way nobody has to fetch each
 * ring's coords from the server, only confirm they banked it.
 */

import { ARENA } from '@/lib/spinna-data'

const WORLD_START_X = 750
const WORLD_START_Y = 750

export function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RoomRing {
  x: number
  y: number
  r: number
  captureR: number
  ringIdx: number
}

/**
 * Compute ring N for a given world seed. Deterministic so all clients +
 * the server agree on the coordinates from `ringIdx` alone.
 */
export function ringForIdx(worldSeed: number, ringIdx: number, arena = ARENA): RoomRing {
  const rng = mulberry32(worldSeed + ringIdx * 2654435761)
  const margin = 220
  // try a few placements until we land far enough from the spawn point
  for (let i = 0; i < 16; i++) {
    const x = arena.l + margin + rng() * (arena.r - arena.l - margin * 2)
    const y = arena.t + margin + rng() * (arena.b - arena.t - margin * 2)
    if (Math.hypot(x - WORLD_START_X, y - WORLD_START_Y) > 200) {
      return { x, y, r: 70, captureR: 110, ringIdx }
    }
  }
  // give up and return whatever we computed last (still valid coords)
  return {
    x: arena.l + (arena.r - arena.l) / 2,
    y: arena.t + (arena.b - arena.t) / 4,
    r: 70,
    captureR: 110,
    ringIdx,
  }
}

export function makeRoomCode(): string {
  // Excludes ambiguous chars (I, L, O, 0, 1).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/** Random 31-bit positive integer suitable for use as `world_seed`. */
export function makeWorldSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647)
}
