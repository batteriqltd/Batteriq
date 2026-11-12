import type { Product } from '@/lib/supabase/types'

/**
 * Hardcoded EcoFlow products that do not have a Supabase row yet.
 * Same pattern as lib/delta-series.ts: the storefront merges these with the
 * DB so they always render. If a DB row with the same slug is added later,
 * the price set here still wins (FIXED price), stock comes from the DB.
 */

const STAMP = '2026-11-12T00:00:00.000Z'

export const ECOFLOW_EXTRA_PRODUCTS: Record<string, Product> = {
  'alternator-charger-1000w': {
    id: 'fallback-alternator-charger-1000w',
    sku: 'EF-ALTERNATOR-CHARGER-1000W',
    brand: 'EcoFlow',
    category: 'Accessories',
    subcategory: 'Car Charging',
    name: 'EcoFlow Alternator Charger 1000W',
    slug: 'alternator-charger-1000w',
    description:
      'The EcoFlow Alternator Charger 1000W gives 10× faster on-the-go charging, charging 1kWh in about 1 hour while you drive, so there is no need to bring your power station home to recharge. Solar input is available, with up to 1000W of combined alternator + solar input. It is not only a charger but also a battery maintainer and jump starter that keeps your car battery in mint condition. Manage charging with smart control via Apple CarPlay or the EcoFlow app. Recommended power station bundles: EcoFlow DELTA 2 and DELTA 3 Plus.',
    specs: {
      charging_power: '1000W',
      charge_speed: '1kWh in ~1 hour (10× faster)',
      solar_input: 'Supported — up to 1000W alternator + solar combined',
      functions: 'Charger, battery maintainer, jump starter',
      control: 'Apple CarPlay / EcoFlow App',
      compatible: 'EcoFlow DELTA 2, DELTA 3 Plus',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/alternator-charger-800w.jpg'],
    price_kes: 58114,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: 'NEW',
    in_stock: true,
    stock_qty: 5,
    featured: false,
    sort_order: 60,
    meta_title: 'EcoFlow Alternator Charger 1000W Kenya — KES 58,114 | Batteriq',
    meta_description:
      'Buy the EcoFlow Alternator Charger 1000W in Kenya for KES 58,114. Charge 1kWh in 1 hour while driving, solar input, battery maintainer + jump starter. Authorised EcoFlow dealer. M-Pesa.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  } as Product,
}

export const ECOFLOW_EXTRA_SLUGS = Object.keys(ECOFLOW_EXTRA_PRODUCTS)

/** Merge DB rows with the hardcoded extras: fills missing rows, pins the price. */
export function withEcoFlowExtras(dbProducts: Product[], categories?: readonly string[]): Product[] {
  const list = dbProducts ?? []
  const bySlug = new Map(list.map((p) => [p.slug, p]))
  const merged = list.map((p) => {
    const extra = ECOFLOW_EXTRA_PRODUCTS[p.slug]
    if (!extra) return p
    return { ...extra, id: p.id, in_stock: p.in_stock ?? true, stock_qty: p.stock_qty ?? extra.stock_qty }
  })
  for (const slug of ECOFLOW_EXTRA_SLUGS) {
    const extra = ECOFLOW_EXTRA_PRODUCTS[slug]
    if (bySlug.has(slug)) continue
    if (categories && !categories.includes(extra.category)) continue
    merged.push(extra)
  }
  return merged.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}
