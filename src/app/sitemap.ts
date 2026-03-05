import type { MetadataRoute } from 'next'

const siteUrl = 'https://trueroute.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '/',
    '/how-to/connect-obd2',
    '/how-to/positioning-modes',
    '/how-to/download-maps',
    '/how-to/import-gpx-route',
    '/how-to/diagnostics',
    '/troubleshooting/obd2-not-connecting',
    '/troubleshooting/gps-signal-lost',
    '/troubleshooting/map-not-loading',
    '/troubleshooting/dead-reckoning-inaccurate',
  ]

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1.0 : 0.7,
  }))
}
