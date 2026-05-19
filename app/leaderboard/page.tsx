import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'

async function getLeaderboard() {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('spinna_scores')
      .select('id, score, degrees, combo_count, vehicle, created_at, username')
      .order('score', { ascending: false })
      .limit(50)

    return data?.map((s, i) => ({
      rank: i + 1,
      id: s.id,
      score: s.score,
      degrees: s.degrees,
      combo_count: s.combo_count,
      vehicle: s.vehicle,
      created_at: s.created_at,
      username: s.username ?? 'Guest',
    })) ?? []
  } catch {
    return []
  }
}

const VEHICLE_LABELS: Record<string, string> = {
  e30: 'E30',
  e36: 'E36',
  rx7: 'RX-7',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

export const revalidate = 30

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard()

  return (
    <main className="min-h-dvh bg-[#0a0807] text-white">
      <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[8px] tracking-[5px] font-mono text-white/40 uppercase">Spinmfana</div>
            <h1 className="font-mono font-black text-2xl text-amber-300 tracking-wide">LEADERBOARD</h1>
          </div>
          <Link
            href="/"
            className="text-[10px] font-mono text-white/40 hover:text-white/70 transition px-3 py-1.5 border border-white/10 rounded"
          >
            ← GARAGE
          </Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[11px] font-mono text-white/30 tracking-[4px]">NO SCORES YET</div>
            <div className="mt-2 text-[10px] font-mono text-white/20">Be the first to spin!</div>
            <Link
              href="/"
              className="mt-6 inline-block rounded font-mono text-[12px] tracking-[4px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 transition px-6 py-3"
            >
              SPIN NOW ▸
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                  entry.rank === 1
                    ? 'border-amber-400/50 bg-amber-400/10'
                    : entry.rank === 2
                    ? 'border-white/20 bg-white/5'
                    : entry.rank === 3
                    ? 'border-orange-400/30 bg-orange-400/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                {/* Rank */}
                <div
                  className="font-mono font-black text-sm w-8 text-center flex-shrink-0"
                  style={{
                    color: entry.rank === 1 ? '#fcd00b' : entry.rank === 2 ? '#e5e7eb' : entry.rank === 3 ? '#fb923c' : '#6b7280'
                  }}
                >
                  {entry.rank}
                </div>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-white text-sm truncate">{entry.username}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-mono text-white/40 tracking-widest">
                      {VEHICLE_LABELS[entry.vehicle] ?? entry.vehicle}
                    </span>
                    {entry.degrees > 0 && (
                      <>
                        <span className="text-[8px] font-mono text-white/25">·</span>
                        <span className="text-[8px] font-mono text-white/40">
                          {Math.floor(entry.degrees)}°
                        </span>
                      </>
                    )}
                    <span className="text-[8px] font-mono text-white/25">·</span>
                    <span className="text-[8px] font-mono text-white/30">{formatDate(entry.created_at)}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-black text-emerald-400 text-base tabular-nums">
                    R{entry.score.toLocaleString()}
                  </div>
                  {entry.combo_count > 0 && (
                    <div className="text-[8px] font-mono text-white/40">
                      {entry.combo_count} spin{entry.combo_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded font-mono text-[12px] tracking-[5px] font-extrabold text-black bg-amber-300 hover:bg-amber-200 transition px-8 py-3 shadow-[0_0_24px_rgba(252,208,11,0.3)]"
          >
            SPIN ▸
          </Link>
        </div>
      </div>
    </main>
  )
}
