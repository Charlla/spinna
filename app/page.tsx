import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, OG_IMAGE, KEY_ART } from '@/lib/seo'
import HomeClient from './home-client'

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Spinmfana — SA drift arcade key art' }],
  },
}

// VideoGame schema — the site-specific structured data. Key art is the OG image.
const videoGameJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  '@id': `${SITE_URL}/#game`,
  name: SITE_NAME,
  alternateName: 'Spin Mfana',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  image: KEY_ART,
  inLanguage: 'en',
  applicationCategory: 'Game',
  genre: ['Arcade', 'Racing', 'Drifting'],
  gamePlatform: ['Web Browser', 'Mobile'],
  operatingSystem: 'Any (web browser)',
  playMode: ['SinglePlayer', 'CoOp'],
  publisher: { '@id': `${SITE_URL}/#organization` },
  author: { '@id': `${SITE_URL}/#organization` },
  countryOfOrigin: 'ZA',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'ZAR',
    availability: 'https://schema.org/InStock',
  },
}

// FAQ — genuine, factual Q&A about how the game works (also mirrored in /llms.txt).
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Spinmfana?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Spinmfana is a free South African car-spinning arcade game. You drift iconic cars like the BMW E30, Toyota Cressida and Nissan Skyline R34, chaining combo degrees to spin for Rands and climb the leaderboard.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Spinmfana free to play?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Spinmfana is completely free and runs in your web browser on mobile or desktop — no download, no purchase required.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you play Spinmfana?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Hold throttle, steer into the slide and use the handbrake to keep the rear loose. Tight continuous spins build combo degrees and a score multiplier; cash out before your tyres wear out to bank your Rands.',
      },
    },
    {
      '@type': 'Question',
      name: 'What game modes are there?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free Spin (an open donut session), Target Hunt (spin around glowing rings for bonuses) and Pass & Play hotseat for up to six players sharing one device.',
      },
    },
  ],
}

export default function Page() {
  return (
    <>
      <JsonLd data={videoGameJsonLd} />
      <JsonLd data={faqJsonLd} />
      <HomeClient />
    </>
  )
}
