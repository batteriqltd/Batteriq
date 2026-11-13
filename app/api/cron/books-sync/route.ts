import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { verifyCronOrAdminAuth } from '@/lib/outreach/compliance'
import { syncPaidOrdersToBooks } from '@/lib/books'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Pushes every paid order that Books does not have yet.
// Callers: the daily Vercel cron, the "Sync orders now" button on /admin/books
// (admin session), or an ops call with BOOKS_SYNC_TOKEN as a bearer token.
function hasSyncToken(req: Request): boolean {
  const expected = process.env.BOOKS_SYNC_TOKEN
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!expected || !given || expected.length !== given.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given))
}

async function run(req: Request) {
  if (!hasSyncToken(req) && !verifyCronOrAdminAuth(req).authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await syncPaidOrdersToBooks()
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Books sync failed'
    console.error('[Books] backfill failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET = run
export const POST = run
