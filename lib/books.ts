// ─────────────────────────────────────────────────────────────────────────────
// Batteriq Books sync — records every PAID website order in the accounting app
// (Akaunting on Railway, see infra/akaunting/README.md) as an income
// transaction: customer, amount, date, order number, and the account the money
// landed in (M-Pesa / Card / Cash on Delivery).
//
// Design rules:
//  - Never throws into a payment flow. The *Safe helpers swallow every error.
//  - Idempotent. The order number is the transaction number, which Books
//    enforces as unique, so syncing the same order twice is a no-op.
//  - Server only. Credentials come from BOOKS_API_* env vars.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'

const COMPANY_ID = process.env.BOOKS_COMPANY_ID || '1'
const REQUEST_TIMEOUT_MS = 12_000

export type BooksOrder = {
  id: string
  order_number: string
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  items?: unknown
  total_kes: number | string
  payment_method: string
  payment_status?: string | null
  mpesa_transaction_code?: string | null
  pesapal_merchant_reference?: string | null
  pesapal_confirmation_code?: string | null
  created_at: string
}

export type BooksSyncResult = 'created' | 'exists' | 'skipped'

export function booksConfigured(): boolean {
  return Boolean(
    process.env.BOOKS_API_URL && process.env.BOOKS_API_EMAIL && process.env.BOOKS_API_PASSWORD
  )
}

type ApiResult = { ok: boolean; status: number; json: any } // eslint-disable-line @typescript-eslint/no-explicit-any

async function api(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const base = (process.env.BOOKS_API_URL || '').replace(/\/+$/, '')
  const auth = Buffer.from(
    `${process.env.BOOKS_API_EMAIL}:${process.env.BOOKS_API_PASSWORD}`
  ).toString('base64')

  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'X-Company': COMPANY_ID,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* empty body (e.g. 204) */
  }
  return { ok: res.ok, status: res.status, json }
}

// ── Reference data (account + category ids), looked up by name once ─────────

type Refs = { accounts: Record<string, number>; salesCategoryId: number }
let refsCache: { at: number; refs: Refs } | null = null

async function getRefs(): Promise<Refs> {
  if (refsCache && Date.now() - refsCache.at < 10 * 60_000) return refsCache.refs

  const [acc, cat] = await Promise.all([
    api('GET', '/accounts?limit=100'),
    api('GET', '/categories?limit=100'),
  ])
  if (!acc.ok || !cat.ok) throw new Error(`Books reference lookup failed (${acc.status}/${cat.status})`)

  const accounts: Record<string, number> = {}
  for (const a of acc.json?.data ?? []) accounts[String(a.name).toLowerCase()] = a.id

  const sales = (cat.json?.data ?? []).find(
    (c: { type: string; name: string }) => c.type === 'income' && c.name.toLowerCase() === 'sales'
  )
  if (!sales) throw new Error('Books has no "Sales" income category')

  const refs = { accounts, salesCategoryId: sales.id as number }
  refsCache = { at: Date.now(), refs }
  return refs
}

function accountFor(order: BooksOrder, refs: Refs): number {
  const pick = (name: string) => refs.accounts[name.toLowerCase()]
  const fallback = pick('M-Pesa') ?? Object.values(refs.accounts)[0]
  switch (order.payment_method) {
    case 'pesapal_card':
      return pick('Card (Paystack)') ?? fallback
    case 'cod_cash':
      return pick('Cash on Delivery') ?? fallback
    default:
      // mpesa_now, cod_mpesa, sales_confirmation
      return fallback
  }
}

// ── Customers ───────────────────────────────────────────────────────────────

async function findCustomer(field: 'email' | 'phone', value: string): Promise<number | null> {
  const q = encodeURIComponent(`type:customer ${field}:${value}`)
  const res = await api('GET', `/contacts?search=${q}&limit=1`)
  return res.ok && res.json?.data?.[0]?.id ? (res.json.data[0].id as number) : null
}

async function findOrCreateCustomer(order: BooksOrder): Promise<number | null> {
  const name = (order.guest_name || '').trim() || 'Website Customer'
  const email = (order.guest_email || '').trim().toLowerCase()
  const phone = (order.guest_phone || '').replace(/\s+/g, '')

  if (email) {
    const id = await findCustomer('email', email)
    if (id) return id
  }
  if (phone) {
    const id = await findCustomer('phone', phone)
    if (id) return id
  }

  const base = { type: 'customer', name, currency_code: 'KES', enabled: 1, ...(phone ? { phone } : {}) }
  const path = `/contacts?search=${encodeURIComponent('type:customer')}`

  if (email) {
    const withEmail = await api('POST', path, { ...base, email })
    if (withEmail.ok) return withEmail.json?.data?.id ?? null
    // Books rejects emails whose domain has no DNS record — retry without it.
  }
  const plain = await api('POST', path, base)
  return plain.ok ? (plain.json?.data?.id ?? null) : null
}

// ── Orders → income transactions ────────────────────────────────────────────

/** Books wants "Y-m-d H:i:s"; we record Nairobi time (UTC+3). */
function nairobiDateTime(iso: string): string {
  const d = new Date(iso)
  const t = Number.isNaN(d.getTime()) ? new Date() : d
  return new Date(t.getTime() + 3 * 3_600_000).toISOString().slice(0, 19).replace('T', ' ')
}

function describe(order: BooksOrder): string {
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : []
  const lines = items
    .map(i => `${Number(i.quantity) || 1} x ${String(i.name ?? 'Item')}`)
    .join(', ')
  return `Website order ${order.order_number}${lines ? `: ${lines}` : ''}`.slice(0, 480)
}

export async function syncOrderToBooks(order: BooksOrder): Promise<BooksSyncResult> {
  if (!booksConfigured()) return 'skipped'
  const amount = Number(order.total_kes) || 0
  if (amount <= 0 || !order.order_number) return 'skipped'

  const refs = await getRefs()
  const contactId = await findOrCreateCustomer(order)

  const reference =
    order.mpesa_transaction_code ||
    order.pesapal_confirmation_code ||
    order.pesapal_merchant_reference ||
    null

  const res = await api('POST', '/transactions', {
    type: 'income',
    number: order.order_number,
    account_id: accountFor(order, refs),
    paid_at: nairobiDateTime(order.created_at),
    amount,
    currency_code: 'KES',
    currency_rate: 1,
    category_id: refs.salesCategoryId,
    payment_method:
      order.payment_method === 'cod_cash'
        ? 'offline-payments.cash.1'
        : 'offline-payments.bank_transfer.2',
    description: describe(order),
    ...(contactId ? { contact_id: contactId } : {}),
    ...(reference ? { reference } : {}),
  })

  if (res.ok) return 'created'
  if (res.status === 422 && res.json?.errors?.number) return 'exists'
  throw new Error(`Books rejected order ${order.order_number}: ${res.status} ${res.json?.message ?? ''}`)
}

/**
 * Sync one order by id if (and only if) it is paid. Never throws and never
 * takes longer than ~9s, so it is safe to await inside payment callbacks.
 */
export async function syncOrderIdToBooksSafe(orderId: string): Promise<void> {
  if (!booksConfigured() || !orderId) return
  const work = (async () => {
    const supabase = createAdminClient()
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = order as any
    if (!o || o.payment_status !== 'paid') return
    const result = await syncOrderToBooks(o as BooksOrder)
    console.log('[Books] order', o.order_number, result)
  })()
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 9_000))
  try {
    await Promise.race([work, timeout])
  } catch (e) {
    console.error('[Books] sync failed (will be retried by the daily sync):', e)
  }
}

// ── Backfill / reconciliation ───────────────────────────────────────────────

async function listSyncedNumbers(): Promise<Set<string>> {
  const numbers = new Set<string>()
  for (let page = 1; page <= 200; page++) {
    const res = await api('GET', `/transactions?limit=100&page=${page}`)
    if (!res.ok) throw new Error(`Books transaction list failed (${res.status})`)
    for (const t of res.json?.data ?? []) numbers.add(String(t.number))
    if (page >= (res.json?.meta?.last_page ?? 1)) break
  }
  return numbers
}

export type BooksBackfillSummary = {
  configured: boolean
  paidOrders: number
  alreadyInBooks: number
  created: number
  failed: number
  remaining: number
  errors: string[]
}

/** Push every paid order that Books does not have yet. Stops before `budgetMs`. */
export async function syncPaidOrdersToBooks(budgetMs = 45_000): Promise<BooksBackfillSummary> {
  const summary: BooksBackfillSummary = {
    configured: booksConfigured(),
    paidOrders: 0,
    alreadyInBooks: 0,
    created: 0,
    failed: 0,
    remaining: 0,
    errors: [],
  }
  if (!summary.configured) return summary

  const started = Date.now()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) throw new Error(`Could not read orders: ${error.message}`)

  const orders = (data ?? []) as unknown as BooksOrder[]
  summary.paidOrders = orders.length

  const synced = await listSyncedNumbers()
  const missing = orders.filter(o => !synced.has(String(o.order_number)))
  summary.alreadyInBooks = orders.length - missing.length

  for (let i = 0; i < missing.length; i++) {
    if (Date.now() - started > budgetMs) {
      summary.remaining = missing.length - i
      break
    }
    try {
      const result = await syncOrderToBooks(missing[i])
      if (result === 'created') summary.created++
      else if (result === 'exists') summary.alreadyInBooks++
    } catch (e) {
      summary.failed++
      if (summary.errors.length < 5) summary.errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  return summary
}
