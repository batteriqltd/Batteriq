import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDeprecatedDelta } from '@/lib/delta-series'
import { SITE_URL } from '@/lib/business'

// Re-read products at most hourly, so lastmod tracks real price/stock edits.
export const revalidate = 3600

type ProductRow = {
  slug: string
  brand: string
  name: string | null
  category: string | null
  price_kes: number | null
  updated_at: string | null
}

/**
 * Pages whose content is written in code. lastmod is the date that content last
 * changed (from git history), not the date of the request. Update the date when
 * you change what a page says.
 */
const STATIC_PAGES: { path: string; lastModified: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/compare', lastModified: '2026-11-02', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/contact', lastModified: '2026-10-29', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', lastModified: '2026-08-20', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/support', lastModified: '2026-11-02', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/answers', lastModified: '2026-11-02', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/support/faq', lastModified: '2026-11-09', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/support/manuals', lastModified: '2026-11-02', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/support/warranty', lastModified: '2026-08-20', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', lastModified: '2026-11-02', changeFrequency: 'monthly', priority: 0.3 },
]

/** Same rule as ProductCard: EcoFlow → /ecoflow, Bluetti → /bluetti, the rest → /accessories. */
function productPath(p: ProductRow) {
  const section = p.brand === 'EcoFlow' ? 'ecoflow' : p.brand === 'Bluetti' ? 'bluetti' : 'accessories'
  return `/${section}/${p.slug}`
}

function latest(rows: ProductRow[], fallback: string): Date {
  const times = rows.map((r) => Date.parse(r.updated_at ?? '')).filter(Number.isFinite)
  return new Date(times.length ? Math.max(...times) : Date.parse(fallback))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(p.lastModified),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

  let products: ProductRow[] = []
  try {
    const { data } = await createAdminClient()
      .from('products')
      .select('slug, brand, name, category, price_kes, updated_at')
    products = ((data ?? []) as ProductRow[]).filter(
      (p) =>
        p.slug &&
        // Placeholder prices (KES 0–1) mark products that are not really for sale.
        Number(p.price_kes) > 1 &&
        // /accessories/[slug] only resolves Accessories-category rows.
        (p.brand === 'EcoFlow' || p.brand === 'Bluetti' || p.category === 'Accessories') &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !isDeprecatedDelta({ slug: p.slug, name: p.name ?? p.slug, brand: p.brand as any })
    )
  } catch {
    return staticEntries
  }

  // Listing pages change when the products on them change.
  const ecoflow = products.filter((p) => p.brand === 'EcoFlow')
  const bluetti = products.filter((p) => p.brand === 'Bluetti')
  const listings: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: latest(products, '2026-11-09'), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/ecoflow-kenya`, lastModified: latest(ecoflow, '2026-11-09'), changeFrequency: 'daily', priority: 1.0 },
    {
      url: `${SITE_URL}/power-stations`,
      lastModified: latest(products.filter((p) => p.category === 'Power Stations' || p.category === 'Solar Home Systems'), '2026-11-09'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/solar`,
      lastModified: latest(products.filter((p) => p.category === 'Solar Panels'), '2026-11-09'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    { url: `${SITE_URL}/bluetti`, lastModified: latest(bluetti, '2026-11-09'), changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${SITE_URL}/accessories`,
      lastModified: latest(products.filter((p) => p.category === 'Accessories'), '2026-11-09'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Out-of-stock products stay listed: the page still exists and ranks.
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}${productPath(p)}`,
    lastModified: latest([p], '2026-11-09'),
    changeFrequency: 'weekly' as const,
    priority: p.brand === 'EcoFlow' ? 0.9 : 0.8,
  }))

  return [...listings, ...staticEntries, ...productEntries]
}
