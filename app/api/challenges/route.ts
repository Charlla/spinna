import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// GET /api/challenges → list challenges for the logged-in player
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Challenges where player is challenger OR opponent
    const { data: challenges, error } = await supabase
      .from('spinna_challenges')
      .select('*')
      .or(`challenger_id.eq.${session.playerId},opponent_id.eq.${session.playerId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Failed to load challenges' }, { status: 500 })
    }

    return NextResponse.json({ challenges: challenges ?? [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/challenges → issue a challenge after a game
// Body: { score, degrees, target_username? }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Login to challenge players' }, { status: 401 })
    }

    const { score, degrees, target_username } = await req.json()

    if (typeof score !== 'number' || score <= 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Expires in 48 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    let opponentId: string | null = null
    let opponentUsername: string | null = null

    if (target_username) {
      const { data: opponent } = await supabase
        .from('spinna_players')
        .select('id, username')
        .eq('username', target_username)
        .single()

      if (opponent) {
        opponentId = opponent.id
        opponentUsername = opponent.username
      }
    }

    const { data: challenge, error } = await supabase
      .from('spinna_challenges')
      .insert({
        challenger_id: session.playerId,
        challenger_username: session.username,
        opponent_id: opponentId,
        opponent_username: opponentUsername,
        challenge_score: Math.floor(score),
        challenge_degrees: Math.floor(degrees ?? 0),
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single()

    if (error || !challenge) {
      console.error('Challenge create error:', error)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    return NextResponse.json({ challenge })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
