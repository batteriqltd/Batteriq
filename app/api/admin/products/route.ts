import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order')
      .limit(200)
    if (error) return NextResponse.json({ products: [] }, { status: 500 })
    return NextResponse.json({ products: data ?? [] })
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
