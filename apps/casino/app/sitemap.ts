import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const routes = [
    '',
    '/about',
    '/affiliates',
    '/aml',
    '/banking',
    '/blog',
    '/contact',
    '/cookies',
    '/faq',
    '/games/pokies',
    '/games/live',
    '/games/jackpot',
    '/games/new',
    '/games/popular',
    '/help',
    '/jackpot',
    '/kyc',
    '/limits',
    '/privacy',
    '/promotions',
    '/responsible-gaming',
    '/self-exclusion',
    '/terms',
    '/vip',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/jackpot' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.includes('/games') ? 0.9 : 0.7,
  })) as MetadataRoute.Sitemap
}
