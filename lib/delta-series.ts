import type { Product } from '@/lib/supabase/types'

/**
 * Single source of truth for the approved EcoFlow DELTA range.
 *
 * The storefront merges these code-level fallbacks with Supabase rows so the
 * four approved products ALWAYS show with correct specs/descriptions/images —
 * no SQL Editor or admin action required. Live DB price/stock win when the
 * row exists; everything else comes from here.
 */

export const APPROVED_DELTA_SLUGS = [
  'delta-3-classic',
  'delta-3-ultra',
  'delta-pro',
  'delta-pro-3',
] as const

const STAMP = '2026-10-02T00:00:00.000Z'

export const FALLBACK_DELTA_PRODUCTS: Record<string, Product> = {
  'delta-3-classic': {
    id: 'fallback-delta-3-classic',
    sku: '5025901009',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Classic',
    slug: 'delta-3-classic',
    description:
      'The EcoFlow DELTA 3 Classic is EcoFlow’s best-value 1kWh portable power station for Kenyan homes, outdoor work and everyday backup. With 1024Wh LiFePO4 capacity and 1800W AC output (3600W surge, X-Boost to 2400W), it powers essentials like lights, Wi‑Fi, TVs, fridges and power tools. Charges 0–80% in 45 mins via 1400W AC, 500W solar max, 10ms UPS switchover, 5 outlets, whisper-quiet 30dB operation.',
    specs: {
      capacity: '1024Wh',
      ac_output: '1800W (Surge 3600W)',
      x_boost: '2400W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '500W Max',
      ac_charging: '1400W (0-80% in 45 mins)',
      ups_mode: 'Yes (10ms switchover)',
      outlets: '5',
      weight: '12.1kg',
      dimensions: '398 x 200 x 283mm',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-classic.png'],
    price_kes: 84379,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 10,
    meta_title: 'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'delta-3-ultra': {
    id: 'fallback-delta-3-ultra',
    sku: '5024201005',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Ultra',
    slug: 'delta-3-ultra',
    description:
      'The EcoFlow DELTA 3 Ultra is the 3072Wh whole-home backup station for bigger Kenyan homes and businesses. With 3600W AC output (7200W surge, X-Boost to 4600W), 10ms UPS auto-switch, 4 charging methods (0-80% in 89 mins via AC), whisper-quiet 25dB operation and OASIS app control with Storm Guard, it keeps fridges, microwaves, office loads and essentials running through long outages.',
    specs: {
      capacity: '3072Wh',
      ac_output: '3600W (Surge 7200W)',
      x_boost: '4600W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '1600W Max',
      ac_charging: '0-80% in 89 mins',
      ups_mode: 'Yes (10ms switchover)',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-ultra-plus.png'],
    price_kes: 250799,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 11,
    meta_title: 'EcoFlow DELTA 3 Ultra Kenya — 3072Wh KES 250,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3072Wh LFP, 3600W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'delta-pro': {
    id: 'fallback-delta-pro',
    sku: '5004501016',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro',
    slug: 'delta-pro',
    description:
      'The EcoFlow DELTA Pro is a serious home backup battery for Kenyan homes, offices and light commercial setups. With 3600Wh of LiFePO4 storage and 3600W AC output, it runs major appliances during outages, recharges fast, and can be expanded with additional batteries for longer runtime.',
    specs: {
      capacity: '3600Wh',
      ac_output: '3600W (Surge 7200W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '1600W Max',
      ports: '13',
      weight: '45kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro.jpg'],
    price_kes: 291399,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 12,
    meta_title: 'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'delta-pro-3': {
    id: 'fallback-delta-pro-3',
    sku: '5013701013',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro 3',
    slug: 'delta-pro-3',
    description:
      'The EcoFlow DELTA Pro 3 is the flagship DELTA model for demanding backup needs, combining 4096Wh of LiFePO4 capacity with 4000W AC output and deep-coverage port selection. It is designed for larger homes, offices, server rooms and backup-heavy environments that need serious reliability during outages.',
    specs: {
      capacity: '4096Wh',
      ac_output: '4000W (Surge 8000W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '2000W Max',
      ports: '12',
      weight: '51.5kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro-3.jpg'],
    price_kes: 461799,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 13,
    meta_title: 'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  },
}

/**
 * Merge DB rows with the code fallbacks. Fallback specs/descriptions/images
 * always win (they are the corrected data); live DB price/stock win when the
 * row exists. Missing rows are filled from fallback so all 4 always render.
 */
export function withDeltaFallback(dbProducts: Product[]): Product[] {
  const bySlug = new Map((dbProducts ?? []).map((p) => [p.slug, p]))
  return (APPROVED_DELTA_SLUGS as readonly string[]).map((slug) => {
    const fallback = FALLBACK_DELTA_PRODUCTS[slug]
    const live = bySlug.get(slug)
    if (!live) return fallback
    return {
      ...fallback,
      id: live.id,
      price_kes: live.price_kes ?? fallback.price_kes,
      compare_price_kes: live.compare_price_kes ?? null,
      discount_percent: live.discount_percent ?? null,
      discount_badge: live.discount_badge ?? null,
      in_stock: live.in_stock ?? true,
      stock_qty: live.stock_qty ?? fallback.stock_qty,
    }
  })
}

/** Deprecated DELTA variants hidden from the storefront in code (DB untouched). */
export function isDeprecatedDelta(product: Pick<Product, 'slug' | 'name' | 'brand'>): boolean {
  if (product.brand !== 'EcoFlow') return false
  if ((APPROVED_DELTA_SLUGS as readonly string[]).includes(product.slug)) return false
  const hay = `${product.slug} ${product.name}`.toLowerCase()
  return (
    hay.includes('100-air') ||
    hay.includes('100 air') ||
    hay.includes('max-plus') ||
    hay.includes('max plus') ||
    hay.includes('ultra-plus') ||
    hay.includes('ultra plus')
  )
}

export function withoutDeprecatedDelta<T extends Pick<Product, 'slug' | 'name' | 'brand'>>(
  products: T[]
): T[] {
  return (products ?? []).filter((p) => !isDeprecatedDelta(p))
}
