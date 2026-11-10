import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { FALLBACK_BLUETTI_PRODUCTS } from '@/lib/bluetti-residential'

const BADGE = 'BLACK NOVEMBER'

/** Black November 2026 Bluetti prices (owner-supplied, matches Sweech). */
const BLACK_NOVEMBER_PRICES: Array<{ slug: string; price: number }> = [
  { slug: 'bluetti-ac70p', price: 55000 },
  { slug: 'bluetti-ac180p', price: 72150 },
  { slug: 'bluetti-premium-30-v2', price: 29900 },
  { slug: 'bluetti-premium-100-v2', price: 63750 },
  { slug: 'bluetti-premium-200-v2', price: 114400 },
  { slug: 'bluetti-pv100', price: 15600 },
  { slug: 'bluetti-ac50p', price: 33750 },
]

function withKes(price: number, text: string | null): string | null {
  if (!text) return text
  return text.replace(/KES [0-9,]+/g, `KES ${price.toLocaleString('en-KE')}`)
}

/**
 * One-click: sets the Black November price on each product, keeps the
 * previous price as the struck-through "was" price and adds the badge.
 * Safe to run twice — the original price is preserved, never overwritten
 * by an already-discounted one.
 */
export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const results: Array<{ slug: string; action: string }> = []

  try {
    for (const { slug, price } of BLACK_NOVEMBER_PRICES) {
      const { data: row } = await supabase
        .from('products')
        .select('id,price_kes,compare_price_kes,meta_title,meta_description')
        .eq('slug', slug)
        .eq('brand', 'Bluetti')
        .maybeSingle()

      if (!row) {
        // Not in the DB yet: insert the code fallback (PV100 already carries
        // the Black November price there).
        const fallback = FALLBACK_BLUETTI_PRODUCTS[slug]
        if (!fallback) {
          results.push({ slug, action: 'skipped: not in DB' })
          continue
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, ...payload } = fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('products') as any).insert(payload)
        results.push({ slug, action: error ? `insert-failed: ${error.message}` : 'inserted' })
        continue
      }

      const r = row as {
        id: string
        price_kes: number
        compare_price_kes: number | null
        meta_title: string | null
        meta_description: string | null
      }
      const original = Math.max(r.compare_price_kes ?? 0, r.price_kes)
      const isCut = original > price

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('products') as any)
        .update({
          price_kes: price,
          compare_price_kes: isCut ? original : null,
          discount_percent: isCut ? Math.round(((original - price) / original) * 100) : null,
          discount_badge: BADGE,
          meta_title: withKes(price, r.meta_title),
          meta_description: withKes(price, r.meta_description),
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)

      results.push({
        slug,
        action: error ? `failed: ${error.message}` : `KES ${original.toLocaleString('en-KE')} → ${price.toLocaleString('en-KE')}`,
      })

      if (!error && r.price_kes !== price) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('price_audit_log') as any).insert({
            product_id: r.id,
            old_price: r.price_kes,
            new_price: price,
            reason: 'Black November 2026',
          })
        } catch { /* non-critical */ }
      }
    }

    // Also remove discontinued EcoFlow PowerKit rows from the database if present
    await supabase
      .from('products')
      .delete()
      .eq('brand', 'EcoFlow')
      .in('slug', ['powerkit-5kwh', 'powerkit-10kwh', 'powerkit-15kwh'])

    revalidatePath('/', 'layout')
    for (const p of ['/bluetti', '/power-stations', '/solar', '/compare', '/ecoflow-kenya']) revalidatePath(p)

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message, results }, { status: 500 })
  }
}
