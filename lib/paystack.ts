// ─────────────────────────────────────────────────────────────────────────────
// Paystack client — Visa / Mastercard hosted checkout.
//
// Completely isolated from lib/mpesa.ts. Nothing here touches the Daraja flow.
// Card details are entered on Paystack's hosted page, so Batteriq never handles
// raw card numbers.
//
// PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET are server-only. Never log
// them, the Authorization header, or anything from the `authorization` object
// beyond the card brand.
//
// Docs: https://paystack.com/docs/api/transaction/
//       https://paystack.com/docs/payments/webhooks/
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'crypto'

const BASE_URL = 'https://api.paystack.co'
const REQUEST_TIMEOUT_MS = 15_000
const SIGNATURE_TOLERANCE_SECONDS = 300

export const PAYSTACK_CURRENCY = 'KES'

/** Paystack references may only contain alphanumerics, `-`, `.` and `=`. */
const REFERENCE_RE = /^[A-Za-z0-9.=-]{1,100}$/
const HEX_SHA512_RE = /^[0-9a-f]{128}$/

/** Thrown for every Paystack failure. The message is safe to log — it never
 *  contains a key or an auth header. */
export class PaystackError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'PaystackError'
    this.code = code
  }
}

export function isValidReference(reference: string): boolean {
  return REFERENCE_RE.test(reference)
}

/** KES → cents. Paystack takes integer subunits (KES x 100). */
export function toSubunits(amountKes: number | string): number {
  return Math.round(Number(amountKes) * 100)
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!secretKey) throw new PaystackError('Paystack is not configured — missing PAYSTACK_SECRET_KEY.')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const body = await res.json().catch(() => null)

  // `body.status` is the outcome of the API call, NOT of the transaction — the
  // transaction's own status is `body.data.status`.
  if (!res.ok || !body?.status) {
    throw new PaystackError(
      body?.message || `Paystack request failed (HTTP ${res.status}).`,
      typeof body?.code === 'string' ? body.code : undefined
    )
  }
  return body.data as T
}

// ── Initialize ───────────────────────────────────────────────────────────────
export type InitializeInput = {
  email: string
  /** Integer cents. */
  amountSubunits: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

export async function initializeTransaction(
  input: InitializeInput
): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  const data = await paystackRequest<{ authorization_url?: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountSubunits,
        currency: PAYSTACK_CURRENCY,
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ['card'],
        metadata: input.metadata,
      }),
    }
  )
  if (!data?.authorization_url) throw new PaystackError('Paystack did not return a payment link.')
  return { ...data, authorization_url: data.authorization_url }
}

// ── Verify ───────────────────────────────────────────────────────────────────
export type PaystackTransaction = {
  id?: number | string
  status?: string
  reference?: string
  amount?: number
  currency?: string
  gateway_response?: string | null
  /** Paystack may hand metadata back as an object or a JSON string. */
  metadata?: unknown
  authorization?: { brand?: string | null; card_type?: string | null } | null
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  if (!isValidReference(reference)) {
    throw new PaystackError('Invalid transaction reference.', 'transaction_not_found')
  }
  try {
    return await paystackRequest<PaystackTransaction>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: 'GET' }
    )
  } catch (err) {
    if (err instanceof PaystackError && /not found/i.test(err.message)) {
      throw new PaystackError(err.message, 'transaction_not_found')
    }
    throw err
  }
}

export function readMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object') return metadata as Record<string, unknown>
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Not JSON — treated as no metadata.
    }
  }
  return {}
}

export type PaymentAssessment = 'paid' | 'failed' | 'refunded' | 'pending' | 'mismatch'

/**
 * Decides what a verified transaction means for the order it belongs to. An
 * order is only ever `paid` when status, reference, currency AND the exact amount
 * in cents all agree with what we stored.
 *
 * `abandoned` stays pending: Paystack also reports it while the customer is still
 * on the payment page, so treating it as a failure would kill live payments.
 */
export function assessTransaction(
  transaction: PaystackTransaction,
  expected: { reference: string; amountSubunits: number }
): PaymentAssessment {
  switch (transaction.status) {
    case 'success': {
      const matches =
        expected.amountSubunits > 0 &&
        transaction.reference === expected.reference &&
        transaction.currency === PAYSTACK_CURRENCY &&
        transaction.amount === expected.amountSubunits
      return matches ? 'paid' : 'mismatch'
    }
    case 'failed':
      return 'failed'
    case 'reversed':
      return 'refunded'
    default:
      return 'pending'
  }
}

// ── Webhook signatures ───────────────────────────────────────────────────────
function hexMatches(expected: Buffer, candidateHex: string): boolean {
  if (!HEX_SHA512_RE.test(candidateHex)) return false
  const candidate = Buffer.from(candidateHex, 'hex')
  return candidate.length === expected.length && timingSafeEqual(expected, candidate)
}

/** `Paystack-Signature: t=<unix seconds>,v1=<key id>:<hex>` — signed with the
 *  whsec_ secret over `t.rawBody`. Carries two v1 values during a rotation. */
function verifySignedHeader(rawBody: string, header: string, secret: string, nowSeconds: number): boolean {
  const parts = header.split(',').map(p => p.trim())
  const t = parts.find(p => p.startsWith('t='))?.slice(2)
  if (!t || !/^\d+$/.test(t)) return false
  if (Math.abs(nowSeconds - Number(t)) > SIGNATURE_TOLERANCE_SECONDS) return false

  const expected = createHmac('sha512', secret).update(`${t}.`).update(rawBody).digest()
  return parts
    .filter(p => p.startsWith('v1='))
    .map(p => p.slice(3))
    .some(value => hexMatches(expected, value.slice(value.indexOf(':') + 1)))
}

/**
 * True when the event genuinely came from Paystack. Paystack documents two
 * headers and an account may send either or both:
 *
 *  - `Paystack-Signature`  — timestamped, signed with PAYSTACK_WEBHOOK_SECRET
 *  - `x-paystack-signature` — HMAC SHA512 of the raw body, signed with the secret
 *    key per the docs. PAYSTACK_WEBHOOK_SECRET is tried first, then the secret key.
 *
 * `rawBody` must be the untouched request text: re-serialising parsed JSON breaks
 * the signature.
 */
export function verifyWebhookSignature(params: {
  rawBody: string
  signedHeader: string | null
  legacyHeader: string | null
  webhookSecret?: string | null
  secretKey?: string | null
  nowSeconds?: number
}): boolean {
  const { rawBody, signedHeader, legacyHeader } = params
  const webhookSecret = params.webhookSecret?.trim()
  const secretKey = params.secretKey?.trim()
  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000)

  if (signedHeader && webhookSecret && verifySignedHeader(rawBody, signedHeader, webhookSecret, nowSeconds)) {
    return true
  }

  if (legacyHeader) {
    for (const secret of [webhookSecret, secretKey]) {
      if (!secret) continue
      const expected = createHmac('sha512', secret).update(rawBody).digest()
      if (hexMatches(expected, legacyHeader.trim())) return true
    }
  }

  return false
}
