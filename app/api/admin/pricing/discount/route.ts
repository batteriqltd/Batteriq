import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { productId, discountPercent, discountLabel, discountEnd } = await req.json()
    if (!productId || !discountPercent || discountPercent <= 0 || discountPercent >= 100) {
      return NextResponse.json({ error: 'Invalid discount params' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { data: product } = await supabase
      .from('products')
      .select('price_kes, compare_price_kes')
      .eq('id', productId)
      .single()

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // If already discounted, preserve the original price; otherwise set it
    const originalPrice = product.compare_price_kes ?? product.price_kes
    const newPrice = Math.round(originalPrice * (1 - discountPercent / 100))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('products') as any).update({
      price_kes: newPrice,
      compare_price_kes: originalPrice,
      discount_percent: discountPercent,
      discount_badge: discountLabel || `-${discountPercent}%`,
      discount_label: discountLabel || null,
      discount_start: new Date().toISOString(),
      discount_end: discountEnd || null,
    }).eq('id', productId)

    return NextResponse.json({ success: true, newPrice, originalPrice })
  } catch {
    return NextResponse.json({ error: 'Failed to apply discount' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { productId } = await req.json()
    if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: product } = await supabase
      .from('products')
      .select('compare_price_kes')
      .eq('id', productId)
      .single()

    const restorePrice = product?.compare_price_kes ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('products') as any).update({
      ...(restorePrice ? { price_kes: restorePrice } : {}),
      compare_price_kes: null,
      discount_percent: null,
      discount_badge: null,
      discount_label: null,
      discount_start: null,
      discount_end: null,
    }).eq('id', productId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove discount' }, { status: 500 })
  }
}
