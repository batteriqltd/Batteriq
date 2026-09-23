import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ?q= partial match across name, SKU and brand — so any product can be
  // found without scrolling the full catalogue.
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  try {
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
    let query = supabase.from('products').select('*').order('sort_order').limit(500)
    if (q) {
      // Escape the LIKE wildcards the user may have typed literally.
      const safe = q.replace(/[%_\\]/g, '\\$&')
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,brand.ilike.%${safe}%`)
    }
    const { data, error } = await query
    if (error) return NextResponse.json({ products: [] }, { status: 500 })
    return NextResponse.json({ products: data ?? [] })
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
