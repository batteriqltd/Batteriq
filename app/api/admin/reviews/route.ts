import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('reviews') as any)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    return NextResponse.json({ reviews: data ?? [] })
  } catch {
    return NextResponse.json({ reviews: [] })
  }
}
