import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/cart', '/checkout', '/order-confirmation/'],
      },
    ],
    sitemap: 'https://batteriq.com/sitemap.xml',
    host: 'https://batteriq.com',
  }
}
