import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// POST /api/challenges/respond → submit a score against a challenge
// Body: { challenge_id, score, degrees }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Login to respond to challenges' }, { status: 401 })
    }

    const { challenge_id, score, degrees } = await req.json()

    if (!challenge_id || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get challenge
    const { data: challenge } = await supabase
      .from('spinna_challenges')
      .select('*')
      .eq('id', challenge_id)
      .eq('status', 'pending')
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 404 })
    }

    // Check not expired
    if (new Date(challenge.expires_at) < new Date()) {
      await supabase
        .from('spinna_challenges')
        .update({ status: 'expired' })
        .eq('id', challenge_id)
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 410 })
    }

    // Can't respond to your own challenge
    if (challenge.challenger_id === session.playerId) {
      return NextResponse.json({ error: 'Cannot respond to your own challenge' }, { status: 400 })
    }

    const playerWon = Math.floor(score) > challenge.challenge_score
    const winnerId = playerWon ? session.playerId : challenge.challenger_id

    const { data: updated, error } = await supabase
      .from('spinna_challenges')
      .update({
        opponent_id: session.playerId,
        opponent_username: session.username,
        opponent_score: Math.floor(score),
        opponent_degrees: Math.floor(degrees ?? 0),
        status: 'complete',
        winner_id: winnerId,
      })
      .eq('id', challenge_id)
      .select('*')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
    }

    return NextResponse.json({
      challenge: updated,
      won: playerWon,
      challengeScore: challenge.challenge_score,
      yourScore: Math.floor(score),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
