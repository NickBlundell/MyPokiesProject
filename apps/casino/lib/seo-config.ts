import { Metadata } from 'next'

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const siteConfig = {
  name: 'MyPokies',
  description: 'Play thousands of casino games, win real money with progressive jackpots, and enjoy exclusive VIP rewards at MyPokies Casino.',
  url: siteUrl,
  ogImage: `${siteUrl}/og-image.png`,
  links: {
    twitter: 'https://twitter.com/mypokies',
    facebook: 'https://facebook.com/mypokies',
  },
}

export function createMetadata(overrides?: Metadata): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'MyPokies - Australia\'s Premier Online Casino',
      template: '%s | MyPokies Casino',
    },
    description: siteConfig.description,
    keywords: [
      'online casino',
      'pokies',
      'slots',
      'casino games',
      'jackpot',
      'VIP rewards',
      'Australian casino',
      'live dealer',
      'table games',
      'real money casino',
    ],
    authors: [{ name: 'MyPokies' }],
    creator: 'MyPokies',
    publisher: 'MyPokies',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_AU',
      url: siteConfig.url,
      title: 'MyPokies - Australia\'s Premier Online Casino',
      description: siteConfig.description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: 'MyPokies Casino',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'MyPokies - Australia\'s Premier Online Casino',
      description: siteConfig.description,
      images: [siteConfig.ogImage],
      creator: '@mypokies',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.png', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',
    ...overrides,
  }
}

export const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineBusiness',
  name: 'MyPokies Casino',
  description: siteConfig.description,
  url: siteConfig.url,
  logo: `${siteUrl}/favicon.png`,
  sameAs: [
    siteConfig.links.twitter,
    siteConfig.links.facebook,
  ],
  offers: {
    '@type': 'Offer',
    description: 'Welcome Bonus - 100% Match up to $500',
    itemOffered: {
      '@type': 'Service',
      name: 'Online Casino Gaming',
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '2500',
  },
}
