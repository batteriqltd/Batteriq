import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, category, price_kes, in_stock, stock_qty, low_stock_threshold, sku, sort_order')
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

export async function PATCH(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { productId, stockQty, inStock } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const supabase = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      in_stock: inStock,
      stock_qty: stockQty,
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) {
      console.error('Stock update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stock PATCH error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
