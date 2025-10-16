import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyPokies - Online Casino',
    short_name: 'MyPokies',
    description: 'Play thousands of casino games, win real money with progressive jackpots, and enjoy exclusive VIP rewards at MyPokies Casino.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f14',
    theme_color: '#1a2024',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['entertainment', 'games'],
    shortcuts: [
      {
        name: 'Games',
        short_name: 'Games',
        description: 'Browse all casino games',
        url: '/games/pokies',
        icons: [{ src: '/favicon.png', sizes: '192x192' }],
      },
      {
        name: 'Jackpot',
        short_name: 'Jackpot',
        description: 'View jackpot prizes',
        url: '/jackpot',
        icons: [{ src: '/favicon.png', sizes: '192x192' }],
      },
      {
        name: 'Promotions',
        short_name: 'Promos',
        description: 'View current promotions',
        url: '/promotions',
        icons: [{ src: '/favicon.png', sizes: '192x192' }],
      },
    ],
  }
}
