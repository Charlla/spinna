import Link from 'next/link'
import OnlineLobbyList from './lobby-list-client'

export const dynamic = 'force-dynamic'

export interface OpenEvent {
  id: string
  code: string
  name: string | null
  host_name: string
  status: string
  duration_minutes: number
  created_at: string
}

async function fetchEvents(): Promise<OpenEvent[]> {
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
  const events = await fetchEvents()
  return (
    <main className="min-h-dvh bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-[9px] tracking-[4px] font-mono text-white/40 hover:text-white/70 transition">
            ← Modes
          </Link>
          <h1 className="font-mono font-black text-2xl text-red-300 tracking-wide">EVENTS</h1>
        </div>
        <p className="text-[11px] font-mono text-white/55 leading-relaxed mb-4">
          Spin against your buddies online. Pick a session length, name your
          event, share the code — up to 6 players. Highest score on the
          leaderboard when the timer hits zero takes it.
        </p>
        <OnlineLobbyList initialEvents={events} />
      </div>
    </main>
  )
}
