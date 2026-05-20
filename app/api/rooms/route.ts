import { NextRequest, NextResponse } from 'next/server'
import { getSession, getServiceClient } from '@/lib/auth'
import { consumeVerifyToken } from '@/lib/security/human-verify'
import { createRoom, listOpenRooms } from '@/lib/spinna-rooms/rooms-db'

// GET /api/rooms — list open rooms. No auth needed.
export async function GET() {
  const rooms = await listOpenRooms(20)
  return NextResponse.json({ rooms })
}

// POST /api/rooms — create a room.
//   • Requires a signed-in Spinna player.
//   • Cross-app gate: caller email must exist in spitwars_players.
//   • HumanVerify token required (anti-spam).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Sign in to create a room.' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { verifyToken?: string }
  const ok = await consumeVerifyToken(body.verifyToken ?? null)
  if (!ok) return NextResponse.json({ error: 'Verification expired — try again.' }, { status: 401 })

  const db = getServiceClient()

  // Cross-app gate.
  const { data: spitwarsRow } = await db
    .from('spitwars_players')
    .select('id')
    .eq('email', session.email)
    .maybeSingle()
  if (!spitwarsRow) {
    return NextResponse.json({
      error: 'Online rooms need a Spit Wars account. Sign up at https://spitwars.com first.',
      code: 'spitwars_required',
    }, { status: 403 })
  }

  // Resolve a display_name for the host.
  const { data: spinnaPlayer } = await db
    .from('spinna_players')
    .select('id, display_name, username')
    .eq('id', session.playerId)
    .maybeSingle()
  if (!spinnaPlayer) return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
  const displayName = spinnaPlayer.display_name ?? spinnaPlayer.username

  try {
    const room = await createRoom({ id: spinnaPlayer.id, display_name: displayName })
    return NextResponse.json({ room }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create room'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
