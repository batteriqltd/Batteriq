import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDeprecatedDelta } from '@/lib/delta-series'

export const runtime = 'edge'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Permanently removed products never resolve, even if a stale DB row remains.
  if (isDeprecatedDelta({ slug: data.slug, name: data.name, brand: data.brand })) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}
