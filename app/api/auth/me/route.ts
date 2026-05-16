import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: player } = await supabase
      .from('spinna_players')
      .select('id, username, email, best_score, total_lifetime_rands, created_at')
      .eq('id', session.playerId)
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json({ player })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
