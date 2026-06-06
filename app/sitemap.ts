import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://batteriq.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/ecoflow-kenya`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/power-stations`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/ecoflow`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/solar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/bluetti`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/accessories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/support/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/support/manuals`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/support/warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/track-order`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const supabase = createAdminClient()
    const { data: products } = await supabase
      .from('products')
      .select('slug, brand, updated_at')
      .eq('in_stock', true)

    const productPages: MetadataRoute.Sitemap = (products ?? []).map((p: { slug: string; brand: string; updated_at: string }) => ({
      url: `${baseUrl}/${p.brand.toLowerCase()}/${p.slug}`,
      lastModified: new Date(p.updated_at || now),
      changeFrequency: 'weekly' as const,
      priority: p.brand === 'EcoFlow' ? 0.9 : 0.8,
    }))

    return [...staticPages, ...productPages]
  } catch {
    return staticPages
  }
}
