// ─────────────────────────────────────────────────────────────────────────────
// Pesapal API 3.0 client — Visa / Mastercard hosted checkout.
//
// Completely isolated from lib/mpesa.ts. Nothing here touches the Daraja flow.
// Card details are entered on the Pesapal hosted page, so Batteriq never
// handles raw card numbers and stays out of PCI-DSS scope.
//
// Docs: https://developer.pesapal.com/how-to-integrate/api-30-json/api-reference
// ─────────────────────────────────────────────────────────────────────────────

export type PesapalEnvironment = 'sandbox' | 'live'

const BASE_URLS: Record<PesapalEnvironment, string> = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3/api',
  live: 'https://pay.pesapal.com/v3/api',
}

export type PesapalConfig = {
  environment: PesapalEnvironment
  baseUrl: string
  consumerKey: string
  consumerSecret: string
  ipnId: string | null
}

/** Thrown for every Pesapal failure. The message is safe to log — it never
 *  contains the consumer key or secret. */
export class PesapalError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'PesapalError'
    this.code = code
  }
}

/** Reads and validates Pesapal env vars. ipnId is optional so the one-time IPN
 *  registration endpoint can run before PESAPAL_IPN_ID exists. */
export function getPesapalConfig(): PesapalConfig {
  const environment: PesapalEnvironment =
    process.env.PESAPAL_ENVIRONMENT?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox'

  const consumerKey = process.env.PESAPAL_CONSUMER_KEY?.trim() ?? ''
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET?.trim() ?? ''
  const ipnId = process.env.PESAPAL_IPN_ID?.trim() || null

  const missing: string[] = []
  if (!consumerKey) missing.push('PESAPAL_CONSUMER_KEY')
  if (!consumerSecret) missing.push('PESAPAL_CONSUMER_SECRET')
  if (missing.length) {
    throw new PesapalError(`Pesapal is not configured — missing ${missing.join(', ')}.`)
  }

  return { environment, baseUrl: BASE_URLS[environment], consumerKey, consumerSecret, ipnId }
}

// ── Auth token ───────────────────────────────────────────────────────────────
// Pesapal tokens live about 5 minutes. Cache per warm lambda and refresh 60s
// early rather than assuming a long life.
let cachedToken: { token: string; expiresAt: number; environment: PesapalEnvironment } | null = null

async function getAccessToken(config: PesapalConfig): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.environment === config.environment && cachedToken.expiresAt > now) {
    return cachedToken.token
  }

  const res = await fetch(`${config.baseUrl}/Auth/RequestToken`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer_key: config.consumerKey, consumer_secret: config.consumerSecret }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => null)

  if (!res.ok || !data?.token) {
    const code = data?.error?.code
    throw new PesapalError(
      code === 'invalid_consumer_key_or_secret_provided'
        ? `Pesapal rejected the ${config.environment} credentials. Check that PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET match PESAPAL_ENVIRONMENT.`
        : data?.error?.message || data?.message || `Pesapal authentication failed (HTTP ${res.status}).`,
      code
    )
  }

  const expiry = Date.parse(data.expiryDate ?? '')
  const expiresAt = Number.isFinite(expiry) ? expiry - 60_000 : now + 4 * 60_000
  cachedToken = { token: data.token as string, expiresAt, environment: config.environment }
  return cachedToken.token
}

/**
 * Pesapal returns an `error` envelope on EVERY response, including successful
 * ones, where all its fields are null:
 *
 *   "error": { "error_type": null, "code": null, "message": null }
 *
 * A truthiness check on `data.error` therefore treats every success as a
 * failure. Only a populated envelope is a real error.
 */
export function extractApiError(
  data: unknown
): { code: string | null; message: string | null; type: string | null } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const raw = (data as { error?: unknown }).error
  if (!raw || typeof raw !== 'object') return null

  const e = raw as { code?: unknown; message?: unknown; error_type?: unknown }
  const code = typeof e.code === 'string' && e.code ? e.code : null
  const message = typeof e.message === 'string' && e.message ? e.message : null
  const type = typeof e.error_type === 'string' && e.error_type ? e.error_type : null

  if (!code && !message && !type) return null
  return { code, message, type }
}

async function pesapalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getPesapalConfig()
  const token = await getAccessToken(config)

  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => null)
  const apiError = extractApiError(data)

  if (!res.ok || apiError) {
    throw new PesapalError(
      apiError?.message || data?.message || `Pesapal request failed (HTTP ${res.status}).`,
      apiError?.code ?? undefined
    )
  }
  return data as T
}

// ── IPN registration (one-time per environment + URL) ────────────────────────
export type RegisteredIpn = {
  url: string
  created_date?: string
  ipn_id: string
  ipn_status?: number
  ipn_status_description?: string
  ipn_notification_type_description?: string
}

export async function registerIpnUrl(url: string, notificationType: 'GET' | 'POST' = 'POST') {
  return pesapalRequest<RegisteredIpn>('/URLSetup/RegisterIPN', {
    method: 'POST',
    body: JSON.stringify({ url, ipn_notification_type: notificationType }),
  })
}

export async function listRegisteredIpns() {
  return pesapalRequest<RegisteredIpn[]>('/URLSetup/GetIpnList', { method: 'GET' })
}

// ── Submit order ─────────────────────────────────────────────────────────────
export type SubmitOrderInput = {
  /** Our own unique merchant reference for this payment attempt. */
  merchantReference: string
  amountKes: number
  description: string
  callbackUrl: string
  cancellationUrl: string
  customer: {
    name: string
    email: string
    phone: string
    street?: string
    city?: string
    county?: string
  }
}

export type SubmitOrderResponse = {
  order_tracking_id: string
  merchant_reference: string
  redirect_url: string
  status?: string
}

export async function submitOrderRequest(input: SubmitOrderInput): Promise<SubmitOrderResponse> {
  const { ipnId } = getPesapalConfig()
  if (!ipnId) {
    throw new PesapalError(
      'PESAPAL_IPN_ID is not set. Register the IPN URL once (POST /api/pesapal/register-ipn) and save the returned id.'
    )
  }

  const [firstName, ...rest] = input.customer.name.trim().split(/\s+/)

  const response = await pesapalRequest<SubmitOrderResponse>('/Transactions/SubmitOrderRequest', {
    method: 'POST',
    body: JSON.stringify({
      id: input.merchantReference,
      currency: 'KES',
      // Pesapal charges to the cent — never send more precision than that.
      amount: Math.round(input.amountKes * 100) / 100,
      description: input.description.slice(0, 100),
      callback_url: input.callbackUrl,
      cancellation_url: input.cancellationUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: input.customer.email,
        phone_number: input.customer.phone,
        country_code: 'KE',
        first_name: firstName || 'Customer',
        middle_name: '',
        last_name: rest.join(' ') || '',
        line_1: input.customer.street || '',
        line_2: '',
        city: input.customer.city || '',
        state: input.customer.county || '',
        postal_code: '',
        zip_code: '',
      },
    }),
  })

  if (!response?.redirect_url || !response?.order_tracking_id) {
    throw new PesapalError('Pesapal did not return a payment link.')
  }
  return response
}

// ── Transaction status ───────────────────────────────────────────────────────
export type PesapalTransactionStatus = {
  payment_method?: string | null
  amount?: number
  created_date?: string
  confirmation_code?: string | null
  payment_status_description?: string | null
  description?: string | null
  message?: string
  payment_account?: string | null
  status_code?: number
  merchant_reference?: string
  currency?: string
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  try {
    return await pesapalRequest<PesapalTransactionStatus>(
      `/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      { method: 'GET' }
    )
  } catch (err) {
    // Pesapal answers a not-yet-completed payment with an error envelope rather
    // than a status. That is a legitimate "still pending", not a fault — if we
    // threw, the IPN would return 500 and Pesapal would retry it forever.
    if (err instanceof PesapalError && err.code === 'payment_details_not_found') {
      return { status_code: 0, payment_status_description: 'Pending Payment' }
    }
    throw err
  }
}

/**
 * Maps the Pesapal status_code onto our existing orders.payment_status values.
 *
 * 1 COMPLETED -> paid · 2 FAILED -> failed · 3 REVERSED -> refunded
 * 0 INVALID   -> pending. Pesapal also returns 0 for a transaction the customer
 *               has not finished paying yet, so treating it as a failure would
 *               wrongly kill live orders. Leaving it pending is the safe call —
 *               a later IPN or the callback page resolves it.
 */
export function mapPesapalStatus(
  status: PesapalTransactionStatus
): 'paid' | 'failed' | 'refunded' | 'pending' {
  switch (Number(status?.status_code)) {
    case 1: return 'paid'
    case 2: return 'failed'
    case 3: return 'refunded'
    default: return 'pending'
  }
}
