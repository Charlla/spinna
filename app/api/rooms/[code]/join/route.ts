import { NextRequest, NextResponse } from 'next/server'
import { getSession, getServiceClient } from '@/lib/auth'
import { consumeVerifyToken } from '@/lib/security/human-verify'
import { findRoomByCode, joinRoom } from '@/lib/spinna-rooms/rooms-db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Sign in to join.' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { verifyToken?: string }
  if (!(await consumeVerifyToken(body.verifyToken ?? null))) {
    return NextResponse.json({ error: 'Verification expired — try again.' }, { status: 401 })
  }
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })

  const db = getServiceClient()
  const { data: spinnaPlayer } = await db
    .from('spinna_players')
    .select('id, display_name, username')
    .eq('id', session.playerId)
    .maybeSingle()
  if (!spinnaPlayer) return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
  const displayName = spinnaPlayer.display_name ?? spinnaPlayer.username

  try {
    const member = await joinRoom(room, { id: spinnaPlayer.id, display_name: displayName })
    return NextResponse.json({ member })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to join'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
