import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findRoomByCode, setReady } from '@/lib/spinna-rooms/rooms-db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { ready?: boolean }
  const { code } = await params
  const room = await findRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  await setReady(room.id, session.playerId, !!body.ready)
  return NextResponse.json({ ok: true })
}
