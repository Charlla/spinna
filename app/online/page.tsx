import Link from 'next/link'
import OnlineLobbyList from './lobby-list-client'

export const dynamic = 'force-dynamic'

interface OpenRoom {
  id: string
  code: string
  host_name: string
  status: string
  created_at: string
}

async function fetchRooms(): Promise<OpenRoom[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://spinmfana.com'
    const res = await fetch(`${base}/api/rooms`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.rooms ?? []
  } catch {
    return []
  }
}

export default async function OnlinePage() {
  const rooms = await fetchRooms()
  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-[9px] tracking-[4px] font-mono text-white/40 hover:text-white/70 transition">
            ← Garage
          </Link>
          <h1 className="font-mono font-black text-2xl text-amber-300 tracking-wide">ONLINE</h1>
        </div>
        <p className="text-[11px] font-mono text-white/55 leading-relaxed mb-4">
          Spin against your buddies — first to ring a full lap takes it. Hosting
          a room needs a Spit Wars account (use the same email).
        </p>
        <OnlineLobbyList initialRooms={rooms} />
      </div>
    </main>
  )
}
