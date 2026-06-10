import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { CARS } from '@/lib/spinna-data'

// Server-side sanity bounds for client-reported scores. The client is not
// trusted blindly: anything outside these caps is a cheat/garbage payload.
// Legit play sits far below all of them (early rounds ≈ R7–12k, rings pay
// R7.5k each; even a marathon top-tier session stays well under 5M).
const MAX_SCORE = 5_000_000
const MAX_DEGREES = 200_000     // max single-combo degrees (~550 rotations)
const MAX_COMBO_COUNT = 10_000  // total spins in one round
const MAX_DURATION_SEC = 6 * 3600
const VALID_VEHICLES = new Set(CARS.map(c => c.id))

/** Coerce to a bounded non-negative integer; null if not a finite number. */
function boundedInt(v: unknown, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.floor(v)
  if (n < 0 || n > max) return null
  return n
}

// GET /api/scores?limit=50 → top scores
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)

    const supabase = createServiceClient()

    const { data: scores, error } = await supabase
      .from('spinna_scores')
      .select('id, score, degrees, combo_count, vehicle, duration_sec, created_at, username')
      .order('score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Leaderboard error:', error)
      return NextResponse.json({ error: 'Failed to load scores' }, { status: 500 })
    }

    const leaderboard = scores?.map((s, index) => ({
      rank: index + 1,
      id: s.id,
      score: s.score,
      degrees: s.degrees,
      combo_count: s.combo_count,
      vehicle: s.vehicle,
      duration_sec: s.duration_sec,
      created_at: s.created_at,
      username: s.username ?? 'Guest',
    })) ?? []

    return NextResponse.json({ leaderboard })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/scores → submit a score (requires auth)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Login to submit scores' }, { status: 401 })
    }

    const { score, degrees, combo_count, vehicle, duration_sec } = await req.json()

    const safeScore = boundedInt(score, MAX_SCORE)
    if (safeScore === null) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }
    // Secondary fields: clamp to 0 when absent, reject only wildly bogus values.
    const safeDegrees = boundedInt(degrees ?? 0, MAX_DEGREES)
    const safeCombo = boundedInt(combo_count ?? 0, MAX_COMBO_COUNT)
    const safeDuration = boundedInt(duration_sec ?? 0, MAX_DURATION_SEC)
    if (safeDegrees === null || safeCombo === null || safeDuration === null) {
      return NextResponse.json({ error: 'Invalid score payload' }, { status: 400 })
    }
    const safeVehicle = typeof vehicle === 'string' && VALID_VEHICLES.has(vehicle) ? vehicle : 'e30'

    const supabase = createServiceClient()

    const { data: scoreRow, error } = await supabase
      .from('spinna_scores')
      .insert({
        player_id: session.playerId,
        username: session.username,
        score: safeScore,
        degrees: safeDegrees,
        combo_count: safeCombo,
        vehicle: safeVehicle,
        duration_sec: safeDuration,
        game_mode: 'classic',
      })
      .select('id, score')
      .single()

    if (error || !scoreRow) {
      console.error('Score submit error:', error)
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
    }

    // Update player stats
    const { data: player } = await supabase
      .from('spinna_players')
      .select('best_score, total_rands, games_played, total_spins')
      .eq('id', session.playerId)
      .single()

    const updates: Record<string, number> = {
      total_rands: (player?.total_rands ?? 0) + safeScore,
      games_played: (player?.games_played ?? 0) + 1,
    }

    if (!player?.best_score || scoreRow.score > player.best_score) {
      updates.best_score = scoreRow.score
    }

    if (safeCombo > 0) {
      updates.total_spins = (player?.total_spins ?? 0) + safeCombo
    }

    await supabase
      .from('spinna_players')
      .update(updates)
      .eq('id', session.playerId)

    return NextResponse.json({ id: scoreRow.id, score: scoreRow.score })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
