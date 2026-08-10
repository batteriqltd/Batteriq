import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * Health check for the outside-the-app push pipeline.
 *
 * Every failure mode here is otherwise silent — missing VAPID keys and a
 * missing push_subscriptions table both just mean "no notification ever
 * arrives" with nothing visible in the admin UI. This endpoint turns that into
 * a readable answer.
 */
export async function GET() {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasPublicKey = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const hasPrivateKey = !!process.env.VAPID_PRIVATE_KEY

  let tableReachable = false
  let devices = 0
  let tableError: string | null = null

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from('push_subscriptions') as any)
      .select('endpoint', { count: 'exact', head: true })

    if (error) tableError = error.message
    else {
      tableReachable = true
      devices = count ?? 0
    }
  } catch (err) {
    tableError = err instanceof Error ? err.message : 'unknown error'
  }

  const problems: string[] = []
  if (!hasPublicKey) problems.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set on the server')
  if (!hasPrivateKey) problems.push('VAPID_PRIVATE_KEY is not set on the server')
  if (!tableReachable) problems.push(`push_subscriptions table unreachable — run DATABASE_SETUP.sql (${tableError ?? 'unknown'})`)
  else if (devices === 0) problems.push('No devices registered yet — tap “Notify me” on each phone that should get alerts')

  return NextResponse.json({
    ready: problems.length === 0,
    vapid: { publicKey: hasPublicKey, privateKey: hasPrivateKey },
    table: { reachable: tableReachable, devices, error: tableError },
    problems,
  })
}
