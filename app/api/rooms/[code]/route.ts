import { NextResponse } from 'next/server'
import { findRoomByCode, listRoomMembers } from '@/lib/spinna-rooms/rooms-db'

// GET /api/rooms/[code] — fetch room + members. Public so the lobby page can
// render before the user is signed in (they'll be nudged to sign in before
// joining).
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  const members = await listRoomMembers(room.id)
  return NextResponse.json({ room, members })
}
