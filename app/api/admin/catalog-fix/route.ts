import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APPROVED = [
  {
    sku: '5025901009',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Classic',
    slug: 'delta-3-classic',
    description:
      'The EcoFlow DELTA 3 Classic is EcoFlow’s best-value 1kWh portable power station for Kenyan homes, outdoor work and everyday backup. With 1024Wh LiFePO4 capacity and 1800W AC output (3600W surge, X-Boost to 2400W), it powers essentials like lights, Wi‑Fi, TVs, fridges and power tools. Charges 0–80% in 45 mins via 1400W AC, 500W solar max, 10ms UPS switchover, 5 outlets, whisper-quiet 30dB operation.',
    specs: {
      capacity: '1024Wh',
      ac_output: '1800W (Surge 3600W)',
      x_boost: '2400W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '500W Max',
      ac_charging: '1400W (0-80% in 45 mins)',
      ups_mode: 'Yes (10ms switchover)',
      outlets: '5',
      weight: '12.1kg',
      dimensions: '398 x 200 x 283mm',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-classic.png'],
    price_kes: 84379,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 10,
    meta_title: 'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
  },
  {
    sku: '5024201005',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Ultra',
    slug: 'delta-3-ultra',
    description:
      'The EcoFlow DELTA 3 Ultra is the 3072Wh whole-home backup station for bigger Kenyan homes and businesses. With 3600W AC output (7200W surge, X-Boost to 4600W), 10ms UPS auto-switch, 4 charging methods (0-80% in 89 mins via AC), whisper-quiet 25dB operation and OASIS app control with Storm Guard, it keeps fridges, microwaves, office loads and essentials running through long outages.',
    specs: {
      capacity: '3072Wh',
      ac_output: '3600W (Surge 7200W)',
      x_boost: '4600W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '1600W Max',
      ac_charging: '0-80% in 89 mins',
      ups_mode: 'Yes (10ms switchover)',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-ultra-plus.png'],
    price_kes: 250799,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 11,
    meta_title: 'EcoFlow DELTA 3 Ultra Kenya — 3072Wh KES 250,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3072Wh LFP, 3600W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
  },
  {
    sku: '5004501016',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro',
    slug: 'delta-pro',
    description:
      'The EcoFlow DELTA Pro is a serious home backup battery for Kenyan homes, offices and light commercial setups. With 3600Wh of LiFePO4 storage and 3600W AC output, it runs major appliances during outages, recharges fast, and can be expanded with additional batteries for longer runtime.',
    specs: {
      capacity: '3600Wh',
      ac_output: '3600W (Surge 7200W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '1600W Max',
      ports: '13',
      weight: '45kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro.jpg'],
    price_kes: 291399,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 12,
    meta_title: 'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
  },
  {
    sku: '5013701013',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro 3',
    slug: 'delta-pro-3',
    description:
      'The EcoFlow DELTA Pro 3 is the premium DELTA model built for demanding backup applications. Its 4096Wh LiFePO4 battery and 4000W AC output make it a strong fit for heavy-duty household backup, offices and small commercial sites that need dependable power when the grid fails.',
    specs: {
      capacity: '4096Wh',
      ac_output: '4000W (Surge 8000W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '2000W Max',
      ports: '12',
      weight: '51.5kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro-3.jpg'],
    price_kes: 461799,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 13,
    meta_title: 'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
  },
]

/** Read-only status: which EcoFlow power-station slugs are currently in the DB. */
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('products')
      .select('slug,name,price_kes,in_stock,stock_qty')
      .eq('brand', 'EcoFlow')
      .eq('category', 'Power Stations')
      .order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** One-click fix: upsert the 4 approved DELTA products, delete the 3 deprecated variants. */
export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const results: Array<Record<string, unknown>> = []

  try {
    for (const p of APPROVED) {
      // Try update by slug first (slug is the storefront identity).
      const { data: existing } = await supabase
        .from('products')
        .select('id, price_kes')
        .eq('slug', p.slug)
        .eq('brand', 'EcoFlow')
        .maybeSingle()

      if (existing) {
        // Update everything EXCEPT sku (another row may own that sku value —
        // changing it could violate the unique constraint; slug is the identity).
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sku: _sku, ...updatable } = p
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated, error } = await (supabase.from('products') as any)
          .update({ ...updatable, updated_at: new Date().toISOString() })
          .eq('id', (existing as { id: string }).id)
          .select('id')
        results.push({ slug: p.slug, action: error ? `update-failed: ${error.message}` : (updated && updated.length > 0 ? 'updated' : 'update-no-row') })
        // Best-effort price audit
        try {
          if ((existing as { price_kes: number }).price_kes !== p.price_kes) {
            await supabase.from('price_audit_log').insert({
              product_id: (existing as { id: string }).id,
              old_price: (existing as { price_kes: number }).price_kes,
              new_price: p.price_kes,
              reason: 'Admin one-click DELTA catalog fix',
            })
          }
        } catch { /* non-critical */ }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('products') as any).insert(p)
        results.push({ slug: p.slug, action: error ? `insert-failed: ${error.message}` : 'inserted' })
      }
    }

    // Delete deprecated variants in two steps (select ids, then delete by id —
    // more reliable than a single filtered delete). Approved slugs are excluded.
    const APPROVED_SLUGS = ['delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3']
    const { data: candidates, error: findError } = await supabase
      .from('products')
      .select('id,slug,name')
      .eq('brand', 'EcoFlow')
      .or('slug.ilike.%100-air%,slug.ilike.%max-plus%,slug.ilike.%ultra-plus%,name.ilike.%100 Air%,name.ilike.%Max Plus%,name.ilike.%Ultra Plus%')

    if (findError) {
      results.push({ action: `delete-failed: ${findError.message}` })
    } else {
      const toDelete = (candidates ?? []).filter(
        (c) => !APPROVED_SLUGS.includes((c as { slug: string }).slug)
      )
      if (toDelete.length === 0) {
        results.push({ action: 'deleted-deprecated', count: 0, items: [] })
      } else {
        const { data: deleted, error: delError } = await supabase
          .from('products')
          .delete()
          .in('id', toDelete.map((c) => (c as { id: string }).id))
          .select('slug,name')
        if (delError) {
          results.push({ action: `delete-failed: ${delError.message}` })
        } else {
          results.push({ action: 'deleted-deprecated', count: (deleted ?? []).length, items: deleted ?? [] })
        }
      }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/ecoflow')
    revalidatePath('/power-stations')

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message, results }, { status: 500 })
  }
}
