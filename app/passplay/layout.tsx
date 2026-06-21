import type { Metadata } from 'next'
import { SITE_URL, OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Pass & Play — local hotseat',
  description:
    'Play Spinmfana Pass & Play: a local hotseat car-spinning party mode for up to six mates. Everyone drives the same car for 60 seconds, then passes the device — highest score wins.',
  alternates: { canonical: '/passplay' },
  openGraph: {
    title: 'Spinmfana Pass & Play — hotseat party mode',
    description: 'Local hotseat car-spinning for up to six players on one device.',
    url: `${SITE_URL}/passplay`,
    images: [OG_IMAGE],
  },
}

export default function PassPlayLayout({ children }: { children: React.ReactNode }) {
  return children
}
