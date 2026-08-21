import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

export async function POST(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { productIds, adjustPct } = await req.json()
    if (!Array.isArray(productIds) || productIds.length === 0 || typeof adjustPct !== 'number') {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { data: products } = await supabase
      .from('products')
      .select('id, price_kes')
      .in('id', productIds)

    if (!products) return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })

    let updated = 0
    for (const p of products) {
      const newPrice = Math.round(Number(p.price_kes) * (1 + adjustPct / 100))
      if (newPrice > 0) {
        await supabase.from('products').update({ price_kes: newPrice }).eq('id', p.id)
        updated++
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch {
    return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
  }
}
