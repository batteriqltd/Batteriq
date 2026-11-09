import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'
import { validGtin } from '@/lib/seo'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { price_kes, featured_image, name, in_stock, barcode } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        },
      }
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {}
    if (price_kes !== undefined) updates.price_kes = Number(price_kes)
    if (name !== undefined) updates.name = (name as string).trim()
    if (in_stock !== undefined) updates.in_stock = in_stock

    if (featured_image !== undefined) {
      updates.featured_image = featured_image
      updates.images = [featured_image]
    }

    // Barcode (GTIN) lives in specs.barcode — there is no barcode column, and
    // this way no database migration is needed. Empty string removes it.
    if (barcode !== undefined) {
      const raw = String(barcode ?? '').replace(/\s/g, '')
      if (raw && !validGtin(raw)) {
        return NextResponse.json({ error: 'Barcode must be a valid 8, 12, 13 or 14-digit GTIN (check the last digit).' }, { status: 400 })
      }
      const { data: current, error: readError } = await supabase.from('products').select('specs').eq('id', params.id).single()
      if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
      const specs = { ...((current?.specs as Record<string, unknown>) ?? {}) }
      if (raw) specs.barcode = raw
      else delete specs.barcode
      updates.specs = specs
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', params.id)
      .select('id, name, price_kes')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Always revalidate all product pages after any update
    revalidatePath('/', 'layout')
    revalidatePath('/ecoflow-kenya')
    revalidatePath('/ecoflow')
    revalidatePath('/power-stations')
    revalidatePath('/solar')
    revalidatePath('/bluetti')
    revalidatePath('/accessories')
    revalidatePath('/compare')
    if (params.id) {
      revalidatePath(`/ecoflow/${params.id}`)
      revalidatePath(`/bluetti/${params.id}`)
    }

    // Log price change to audit trail (best effort)
    if (price_kes !== undefined) {
      try {
        await supabase.from('price_audit_log').insert({
          product_id: params.id,
          new_price: Number(price_kes),
          changed_by: 'admin-panel',
        })
      } catch { /* audit log failure is non-critical */ }
    }

    return NextResponse.json({ success: true, product: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
