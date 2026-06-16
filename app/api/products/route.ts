import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const brand = searchParams.get('brand')
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const featured = searchParams.get('featured')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const supabase = createAdminClient()
  let query = supabase
    .from('products')
    .select('*')
    .eq('in_stock', true)
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (brand) query = query.eq('brand', brand)
  if (category) query = query.eq('category', category)
  if (featured === 'true') query = query.eq('featured', true)
  if (q) {
    // Search across name, brand, category, and description
    query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}
