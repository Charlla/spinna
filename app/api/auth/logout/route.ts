import { NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST() {
  try {
    const session = await getSession()
    if (session) {
      const supabase = createServiceClient()
      await supabase
        .from('spinna_sessions')
        .delete()
        .eq('player_id', session.playerId)
    }
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
