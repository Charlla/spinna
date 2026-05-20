import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { bankRing, findRoomByCode } from '@/lib/spinna-rooms/rooms-db'

interface BankBody {
  ring_idx?: number
}

// POST /api/rooms/[code]/bank — server-authoritative ring bank. Body must
// carry the ring_idx the caller believes is currently active; the server
// rejects with 409 if anyone else got there first.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({} as BankBody))
  if (typeof body.ring_idx !== 'number') {
    return NextResponse.json({ error: 'ring_idx required' }, { status: 400 })
  }
  const result = await bankRing(room.id, session.playerId, body.ring_idx)
  if (!result.ok) {
    const status = result.code === 'stale_ring' ? 409 : 400
    return NextResponse.json({ error: result.code }, { status })
  }
  return NextResponse.json({ room: result.room })
}
