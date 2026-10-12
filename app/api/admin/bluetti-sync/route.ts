import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'
import {
  BLUETTI_NEW_SLUGS,
  FALLBACK_BLUETTI_PRODUCTS,
} from '@/lib/bluetti-residential'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Full payload derived from the code fallback (no id/timestamps). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fallbackPayload(slug: string): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, updated_at, ...rest } = FALLBACK_BLUETTI_PRODUCTS[slug]
  return rest
}

function withKes(price: number, text: string | null): string | null {
  if (!text) return text
  return text.replace(/KES [0-9,]+/g, `KES ${price.toLocaleString('en-KE')}`)
}

/**
 * Sept 2026 distributor price corrections for rows that already exist.
 * Customer price = RRP / Level C. B300K is out of stock on this list.
 */
const PRICE_SYNC: Array<{
  slug: string
  price: number
  in_stock: boolean
  specsPatch?: Record<string, string>
}> = [
  { slug: 'bluetti-ac300', price: 72500, in_stock: true },
  { slug: 'bluetti-ac500', price: 89500, in_stock: true },
  { slug: 'bluetti-b300k', price: 124500, in_stock: false, specsPatch: { capacity: '2764Wh' } },
  { slug: 'bluetti-ep760', price: 119000, in_stock: true },
  { slug: 'bluetti-b500', price: 145000, in_stock: true },
]

/** Read-only status: every Sept-2026-list Bluetti row currently in the DB. */
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('products')
      .select('slug,name,price_kes,in_stock,stock_qty,sort_order')
      .eq('brand', 'Bluetti')
      .order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const have = new Set((data ?? []).map((p) => (p as { slug: string }).slug))
    const missing = (BLUETTI_NEW_SLUGS as readonly string[]).filter((s) => !have.has(s))
    return NextResponse.json({ products: data ?? [], missing })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * One-click sync: inserts the 8 missing Sept-2026 rows and corrects the 5
 * existing residential prices (B300K also goes out of stock). Sku-safe:
 * existing rows are matched by slug and sku is never rewritten.
 */
export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const results: Array<Record<string, unknown>> = []

  try {
    // 1) Insert (or refresh) the 8 new rows.
    for (const slug of BLUETTI_NEW_SLUGS) {
      const payload = fallbackPayload(slug as string)
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .eq('brand', 'Bluetti')
        .maybeSingle()

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sku: _sku, ...updatable } = payload
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated, error } = await (supabase.from('products') as any)
          .update({ ...updatable, updated_at: new Date().toISOString() })
          .eq('id', (existing as { id: string }).id)
          .select('id')
        results.push({ slug, action: error ? `update-failed: ${error.message}` : updated && updated.length > 0 ? 'updated' : 'update-no-row' })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('products') as any).insert(payload)
        results.push({ slug, action: error ? `insert-failed: ${error.message}` : 'inserted' })
      }
    }

    // 2) Correct prices/stock (and B300K capacity) on existing rows.
    for (const fix of PRICE_SYNC) {
      const { data: row } = await supabase
        .from('products')
        .select('id,price_kes,stock_qty,specs,meta_title,meta_description')
        .eq('slug', fix.slug)
        .eq('brand', 'Bluetti')
        .maybeSingle()
      if (!row) {
        results.push({ slug: fix.slug, action: 'price-skip: not in DB' })
        continue
      }
      const r = row as {
        id: string
        price_kes: number
        stock_qty: number
        specs: Record<string, string> | null
        meta_title: string | null
        meta_description: string | null
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('products') as any)
        .update({
          price_kes: fix.price,
          in_stock: fix.in_stock,
          stock_qty: fix.in_stock ? Math.max(r.stock_qty ?? 0, 1) : 0,
          ...(fix.specsPatch ? { specs: { ...(r.specs ?? {}), ...fix.specsPatch } } : {}),
          meta_title: withKes(fix.price, r.meta_title),
          meta_description: withKes(fix.price, r.meta_description),
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)
        .select('id')
      results.push({ slug: fix.slug, action: error ? `price-failed: ${error.message}` : `price → KES ${fix.price.toLocaleString('en-KE')}${fix.in_stock ? '' : ' (out of stock)'}` })
      try {
        if (r.price_kes !== fix.price) {
          await supabase.from('price_audit_log').insert({
            product_id: r.id,
            old_price: r.price_kes,
            new_price: fix.price,
            reason: 'Admin one-click Bluetti Sept-2026 sync',
          })
        }
      } catch { /* non-critical */ }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/bluetti', 'page')

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message, results }, { status: 500 })
  }
}
