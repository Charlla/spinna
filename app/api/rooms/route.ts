import { NextRequest, NextResponse } from 'next/server'
import { getSession, getServiceClient } from '@/lib/auth'
import { consumeVerifyToken } from '@/lib/security/human-verify'
import { createRoom, listOpenRooms, VALID_DURATIONS } from '@/lib/spinna-rooms/rooms-db'

// GET /api/rooms — list public open events. No auth needed.
export async function GET() {
  const rooms = await listOpenRooms(20)
  return NextResponse.json({ rooms })
}

// POST /api/rooms — create an event.
//   • Requires a signed-in Spinna player.
//   • HumanVerify token required (anti-spam).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Sign in to create an event.' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    verifyToken?: string
    name?: string
    duration_minutes?: number
    is_public?: boolean
  }
  const ok = await consumeVerifyToken(body.verifyToken ?? null)
  if (!ok) return NextResponse.json({ error: 'Verification expired — try again.' }, { status: 401 })

  const duration = (VALID_DURATIONS as readonly number[]).includes(body.duration_minutes ?? 0)
    ? body.duration_minutes!
    : 5
  const isPublic = body.is_public !== false  // default to public

  const db = getServiceClient()
  const { data: spinnaPlayer } = await db
    .from('spinna_players')
    .select('id, display_name, username')
    .eq('id', session.playerId)
    .maybeSingle()
  if (!spinnaPlayer) return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
  const displayName = spinnaPlayer.display_name ?? spinnaPlayer.username

  try {
    const room = await createRoom(
      { id: spinnaPlayer.id, display_name: displayName },
      {
        name: body.name ?? '',
        duration_minutes: duration,
        is_public: isPublic,
      }
    )
    return NextResponse.json({ room }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create event'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
