import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findRoomByCode, tiresPopped } from '@/lib/spinna-rooms/rooms-db'

// POST /api/rooms/[code]/popped — caller's tires just died. If everyone is
// popped now, the room flips to 'finished' and ended_at is stamped.
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  const ended = await tiresPopped(room.id, session.playerId)
  return NextResponse.json({ ok: true, ended_room: ended })
}
