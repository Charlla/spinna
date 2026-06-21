import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Allow public marketing/content surface for general + AI crawlers; keep API,
// admin, lab and auth-gated routes out of the index.
const DISALLOW = ['/api/', '/admin', '/lab', '/auth/', '/game', '/online']

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
