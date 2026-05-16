import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

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

    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: scoreRow, error } = await supabase
      .from('spinna_scores')
      .insert({
        player_id: session.playerId,
        username: session.username,
        score: Math.floor(score),
        degrees: Math.floor(degrees ?? 0),
        combo_count: Math.floor(combo_count ?? 0),
        vehicle: vehicle ?? 'e30',
        duration_sec: Math.floor(duration_sec ?? 0),
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
      total_rands: (player?.total_rands ?? 0) + Math.floor(score),
      games_played: (player?.games_played ?? 0) + 1,
    }

    if (!player?.best_score || scoreRow.score > player.best_score) {
      updates.best_score = scoreRow.score
    }

    if (combo_count) {
      updates.total_spins = (player?.total_spins ?? 0) + Math.floor(combo_count)
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
