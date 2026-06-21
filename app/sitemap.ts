import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { createServiceClient } from '@/lib/supabase'

// Most-recent leaderboard activity drives lastModified for the leaderboard page
// so crawlers re-fetch when new scores land. Falls back to now() on any error.
async function latestScoreDate(): Promise<Date> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('spinna_scores')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.created_at) return new Date(data.created_at)
  } catch {
    /* ignore — fall through */
  }
  return new Date()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const leaderboardUpdated = await latestScoreDate()
  const now = new Date()

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: leaderboardUpdated,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    { url: `${SITE_URL}/passplay`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]
}
