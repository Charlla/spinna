import { notFound } from 'next/navigation'
import RoomClient from './room-client'

export const dynamic = 'force-dynamic'

async function fetchRoom(code: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://spinmfana.com'
  try {
    const res = await fetch(`${base}/api/rooms/${code.toUpperCase()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const data = await fetchRoom(code)
  if (!data?.room) notFound()
  return <RoomClient initialRoom={data.room} initialMembers={data.members} />
}
