import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const slug = body.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const { data, error } = await supabase
      .from('products')
      .insert({
        brand: body.brand,
        category: body.category,
        name: body.name,
        sku: body.sku || `SKU-${Date.now()}`,
        slug: slug,
        description: body.description || null,
        price_kes: Number(body.price_kes),
        compare_price_kes: body.compare_price_kes ? Number(body.compare_price_kes) : null,
        discount_badge: body.discount_badge || null,
        discount_percent: body.compare_price_kes ? Math.round(((Number(body.compare_price_kes) - Number(body.price_kes)) / Number(body.compare_price_kes)) * 100) : null,
        in_stock: body.in_stock ?? true,
        featured: body.featured ?? false,
        specs: body.specs || {},
        images: [],
        stock_qty: 999,
        sort_order: 0,
        schema_rating: 4.8,
        schema_review_count: 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath('/')
    revalidatePath('/ecoflow-kenya')
    revalidatePath('/power-stations')
    revalidatePath('/solar')
    revalidatePath('/accessories')

    return NextResponse.json({ success: true, product: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
