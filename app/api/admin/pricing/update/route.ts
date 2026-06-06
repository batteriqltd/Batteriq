import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: Request) {
  try {
    const { productId, newPrice } = await req.json()
    if (!productId || typeof newPrice !== 'number' || newPrice <= 0) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { data: product } = await supabase
      .from('products')
      .select('price_kes')
      .eq('id', productId)
      .single()

    await supabase.from('products').update({ price_kes: newPrice }).eq('id', productId)

    if (product) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('price_audit_log') as any).insert({
        product_id: productId,
        old_price: product.price_kes,
        new_price: newPrice,
        reason: 'manual_edit',
      })
    }

    
    // Revalidate all frontend pages so price changes reflect immediately
    revalidatePath('/', 'layout')
    revalidatePath('/ecoflow-kenya')
    revalidatePath('/ecoflow')
    revalidatePath('/power-stations')
    revalidatePath('/solar')
    revalidatePath('/bluetti')
    revalidatePath('/accessories')
    revalidatePath('/compare')
    return NextResponse.json({ success: true, newPrice })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
