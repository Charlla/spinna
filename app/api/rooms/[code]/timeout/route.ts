import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findRoomByCode, finishExpired } from '@/lib/spinna-rooms/rooms-db'

// POST /api/rooms/[code]/timeout — any member can call. If the event's
// started_at + duration has passed, flips status to 'finished'. Idempotent.
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  const ended = await finishExpired(room.id)
  return NextResponse.json({ ok: true, ended_room: ended })
}
