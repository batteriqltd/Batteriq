import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminPricingSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()
  const { data: adminUser } = await adminDb
    .from('admin_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = adminPricingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { brand, productId, adjustmentType, adjustmentValue, reason } = parsed.data

  // Fetch products to update
  let query = adminDb.from('products').select('id, price_kes')
  if (productId) {
    query = query.eq('id', productId) as typeof query
  } else if (brand) {
    query = query.eq('brand', brand) as typeof query
  } else {
    return NextResponse.json({ error: 'Provide brand or productId' }, { status: 400 })
  }

  const { data: rawProducts, error: fetchError } = await query
  if (fetchError || !rawProducts) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
  const products = rawProducts as unknown as Array<{ id: string; price_kes: number }>

  // Apply updates and log each
  const auditLogs = []
  const updates = []

  for (const product of products) {
    const oldPrice = product.price_kes
    const newPrice =
      adjustmentType === 'percent'
        ? Math.round(oldPrice * (1 + adjustmentValue / 100))
        : Math.round(oldPrice + adjustmentValue)

    if (newPrice <= 0) continue

    updates.push({ id: product.id, price_kes: newPrice })
    auditLogs.push({
      product_id: product.id,
      old_price: oldPrice,
      new_price: newPrice,
      changed_by: user.id,
      reason,
    })
  }

  // Apply price updates
  for (const update of updates) {
    await adminDb.from('products').update({ price_kes: update.price_kes }).eq('id', update.id)
  }

  // Log all changes
  if (auditLogs.length > 0) {
    await adminDb.from('price_audit_log').insert(auditLogs)
  }

  return NextResponse.json({ updated: updates.length, message: `${updates.length} product(s) updated` })
}
