import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Storefront pages that render prices or stock badges from the catalogue. */
function revalidateStorefront(slug?: string | null, brand?: string | null) {
  revalidatePath('/', 'layout')
  revalidatePath('/ecoflow-kenya')
  revalidatePath('/ecoflow')
  revalidatePath('/power-stations')
  revalidatePath('/solar')
  revalidatePath('/bluetti')
  revalidatePath('/accessories')
  revalidatePath('/compare')
  if (slug && brand) revalidatePath(`/${String(brand).toLowerCase()}/${slug}`)
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, brand, category, subcategory, price_kes, compare_price_kes, discount_percent, in_stock, stock_qty, low_stock_threshold, sku, sort_order')
      .order('brand', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Stock fetch error:', error)
      return NextResponse.json({ products: [] })
    }

    // Fallback stock_qty if column doesn't exist yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (data ?? []).map((p: any) => ({
      ...p,
      stock_qty: p.stock_qty ?? (p.in_stock ? 10 : 0),
      low_stock_threshold: p.low_stock_threshold ?? 3,
    }))

    return NextResponse.json({ products })
  } catch (err) {
    console.error('Stock API error:', err)
    return NextResponse.json({ products: [] })
  }
}

/**
 * Updates stock level and/or retail price for one product.
 * Every field is optional so the Stock & Price Control screen can commit a
 * quantity change, a price change, or both in a single round trip.
 */
export async function PATCH(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { productId, stockQty, inStock, priceKes } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const supabase = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}

    if (inStock !== undefined) updateData.in_stock = inStock
    if (stockQty !== undefined) {
      const qty = Number(stockQty)
      if (!Number.isFinite(qty) || qty < 0) {
        return NextResponse.json({ error: 'stockQty must be 0 or greater' }, { status: 400 })
      }
      updateData.stock_qty = Math.round(qty)
    }

    let newPrice: number | null = null
    if (priceKes !== undefined) {
      const price = Number(priceKes)
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'priceKes must be greater than 0' }, { status: 400 })
      }
      newPrice = Math.round(price)
      updateData.price_kes = newPrice
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Read the old price first so the audit trail records what actually moved.
    const { data: before } = await supabase
      .from('products')
      .select('price_kes, slug, brand')
      .eq('id', productId)
      .single()

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) {
      console.error('Stock update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit price movements only — quantity changes are not priced events.
    // price_audit_log.changed_by is a uuid FK to auth.users, and this panel
    // authenticates with its own signed cookie rather than a Supabase user, so
    // the actor goes in the free-text reason instead. Best effort: the price is
    // already saved, and a missing audit row must not fail the request.
    if (newPrice !== null && before && Number(before.price_kes) !== newPrice) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('price_audit_log') as any).insert({
          product_id: productId,
          old_price: before.price_kes,
          new_price: newPrice,
          reason: `stock_screen_edit by ${session.email ?? 'admin'}`,
        })
      } catch (auditErr) {
        console.error('Price audit log failed (price still updated):', auditErr)
      }
    }

    revalidateStorefront(before?.slug, before?.brand)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stock PATCH error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
