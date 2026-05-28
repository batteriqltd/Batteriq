import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().max(99),
    })
  ),
})

// Validate cart items server-side and return authoritative prices
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = validateCartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { items } = parsed.data
  const supabase = createAdminClient()

  const productIds = items.map((i) => i.productId)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price_kes, brand, slug, images, in_stock')
    .in('id', productIds)

  if (!products) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  const validatedItems = items.map((item) => {
    const product = productMap.get(item.productId)
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product ?? null,
    }
  })

  return NextResponse.json({ items: validatedItems })
}
