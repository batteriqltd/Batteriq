// Live price figures read from the products table, for copy and JSON-LD that
// would otherwise hard-code a price ("from KES 27,259", priceRange).

import { createAdminClient } from '@/lib/supabase/admin'
import { isDeprecatedDelta } from '@/lib/delta-series'

export type CatalogPriceStats = {
  /** Cheapest published product, KES. */
  minKes: number | null
  /** Most expensive published product, KES. */
  maxKes: number | null
  /** Cheapest in-stock power station, KES — the "starting price" shoppers mean. */
  powerStationMinKes: number | null
}

/** KES 0–1 is a placeholder, not a real price. */
const isRealPrice = (n: unknown) => Number(n) > 1

/**
 * A power station has a battery capacity. This keeps a mis-categorised row (a
 * cable saved under Power Stations) from becoming the "starting price".
 */
export const hasCapacity = (specs: unknown) =>
  !!specs && typeof specs === 'object' && typeof (specs as Record<string, unknown>).capacity === 'string'

export async function getCatalogPriceStats(): Promise<CatalogPriceStats> {
  try {
    const { data, error } = await createAdminClient().from('products').select('slug, name, brand, price_kes, category, in_stock, specs')
    if (error || !data) return { minKes: null, maxKes: null, powerStationMinKes: null }
    const rows = (data as { slug: string; name: string; brand: 'EcoFlow' | 'Bluetti'; price_kes: number; category: string; in_stock: boolean; specs: Record<string, unknown> | null }[])
      .filter((r) => !isDeprecatedDelta({ slug: r.slug ?? '', name: r.name ?? '', brand: r.brand }))
    const prices = rows.filter((r) => isRealPrice(r.price_kes)).map((r) => Number(r.price_kes))
    const stations = rows
      .filter((r) => r.category === 'Power Stations' && r.in_stock && isRealPrice(r.price_kes) && hasCapacity(r.specs))
      .map((r) => Number(r.price_kes))
    return {
      minKes: prices.length ? Math.min(...prices) : null,
      maxKes: prices.length ? Math.max(...prices) : null,
      powerStationMinKes: stations.length ? Math.min(...stations) : null,
    }
  } catch {
    return { minKes: null, maxKes: null, powerStationMinKes: null }
  }
}

export function formatKesRange(min: number | null, max: number | null): string | null {
  if (min == null || max == null) return null
  const f = (n: number) => `KES ${n.toLocaleString('en-KE')}`
  return min === max ? f(min) : `${f(min)} – ${f(max)}`
}

export type ListingStats = {
  /** Products listed (real price; with capacity when required). */
  count: number
  /** Cheapest and dearest in-stock listed product, KES. */
  minKes: number | null
  maxKes: number | null
  /** Smallest and largest in-stock panel wattage (solar panels only). */
  minWatts: number | null
  maxWatts: number | null
}

const EMPTY_LISTING: ListingStats = { count: 0, minKes: null, maxKes: null, minWatts: null, maxWatts: null }

/** Leading watt figure of "125W x2" or "400W", or null. */
const watts = (v: unknown) => {
  const m = typeof v === 'string' ? v.match(/(\d+(?:\.\d+)?)\s*W\b/i) : null
  return m ? Number(m[1]) : null
}

/**
 * Live figures for a listing's title and meta description ("KES {min}–{max}",
 * "{count} power stations"), so no price is ever written into page metadata.
 */
export async function getListingStats(opts: { categories: string[]; brand?: string; needsCapacity?: boolean }): Promise<ListingStats> {
  try {
    let q = createAdminClient().from('products').select('slug, name, brand, price_kes, in_stock, specs').in('category', opts.categories)
    if (opts.brand) q = q.eq('brand', opts.brand)
    const { data, error } = await q
    if (error || !data) return EMPTY_LISTING
    const rows = (data as { slug: string; name: string; brand: 'EcoFlow' | 'Bluetti'; price_kes: number; in_stock: boolean; specs: Record<string, unknown> | null }[])
      .filter((r) => !isDeprecatedDelta({ slug: r.slug ?? '', name: r.name ?? '', brand: r.brand }) && isRealPrice(r.price_kes) && (!opts.needsCapacity || hasCapacity(r.specs)))
    const live = rows.filter((r) => r.in_stock)
    const prices = live.map((r) => Number(r.price_kes))
    const w = live.map((r) => watts(r.specs?.power ?? r.specs?.wattage)).filter((n): n is number => n != null)
    return {
      count: rows.length,
      minKes: prices.length ? Math.min(...prices) : null,
      maxKes: prices.length ? Math.max(...prices) : null,
      minWatts: w.length ? Math.min(...w) : null,
      maxWatts: w.length ? Math.max(...w) : null,
    }
  } catch {
    return EMPTY_LISTING
  }
}

export const kesText = (n: number) => `KES ${n.toLocaleString('en-KE')}`
