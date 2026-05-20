import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findRoomByCode, startRoom } from '@/lib/spinna-rooms/rooms-db'

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  if (room.host_id !== session.playerId) {
    return NextResponse.json({ error: 'Only the host can start.' }, { status: 403 })
  }
  try {
    const started = await startRoom(room)
    return NextResponse.json({ room: started })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
