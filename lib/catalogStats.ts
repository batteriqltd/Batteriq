// Live price figures read from the products table, for copy and JSON-LD that
// would otherwise hard-code a price ("from KES 27,259", priceRange).

import { createAdminClient } from '@/lib/supabase/admin'

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
    const { data, error } = await createAdminClient().from('products').select('price_kes, category, in_stock, specs')
    if (error || !data) return { minKes: null, maxKes: null, powerStationMinKes: null }
    const rows = data as { price_kes: number; category: string; in_stock: boolean; specs: Record<string, unknown> | null }[]
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
