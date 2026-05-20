import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findRoomByCode, leaveRoom } from '@/lib/spinna-rooms/rooms-db'

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  await leaveRoom(room, session.playerId)
  return NextResponse.json({ ok: true })
}
