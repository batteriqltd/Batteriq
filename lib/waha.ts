/**
 * Server-only client for the self-hosted WAHA (WhatsApp HTTP API) instance.
 *
 * - Reads WAHA_BASE_URL / WAHA_API_KEY from the server environment only.
 * - Every request sends `X-Api-Key`, has a hard timeout, and throws `WahaError`
 *   whose message NEVER contains the API key or the base URL, so errors are
 *   safe to return to the admin UI and to log.
 *
 * Docs: https://waha.devlike.pro/docs (sessions, events, send-messages, security)
 */
import QRCode from 'qrcode'

export const WAHA_SESSION = 'default'
const DEFAULT_TIMEOUT_MS = 12_000

export type WahaSessionStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'WORKING'
  | 'FAILED'
  | 'PASSKEY_REQUIRED'
  | 'PASSKEY_CONFIRMATION_REQUIRED'

export interface WahaWebhookConfig {
  url: string
  events: string[]
  hmac?: { key: string } | null
  retries?: { policy?: string; delaySeconds?: number; attempts?: number } | null
  customHeaders?: Array<{ name: string; value: string }> | null
}

export interface WahaSessionInfo {
  name: string
  status: WahaSessionStatus
  me?: { id?: string; pushName?: string } | null
  config?: { webhooks?: WahaWebhookConfig[] | null } | null
  engine?: { engine?: string } | null
}

export class WahaError extends Error {
  readonly status: number
  readonly code: 'not_configured' | 'timeout' | 'network' | 'http' | 'bad_response'
  constructor(message: string, code: WahaError['code'], status = 0) {
    super(message)
    this.name = 'WahaError'
    this.code = code
    this.status = status
  }
}

function readEnv(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.WAHA_BASE_URL?.trim().replace(/\/+$/, '') || ''
  const apiKey = process.env.WAHA_API_KEY?.trim() || ''
  if (!baseUrl || !apiKey || baseUrl.includes('PASTE_') || apiKey === 'replace_me') return null
  if (!/^https?:\/\//i.test(baseUrl)) return null
  return { baseUrl, apiKey }
}

export function isWahaConfigured(): boolean {
  return readEnv() !== null
}

/** Removes any accidental echo of secrets from upstream error text. */
function scrub(text: string): string {
  const env = readEnv()
  let out = text.slice(0, 300)
  if (env) {
    out = out.split(env.apiKey).join('[redacted]').split(env.baseUrl).join('[waha]')
  }
  const hookSecret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim()
  if (hookSecret) out = out.split(hookSecret).join('[redacted]')
  return out
}

interface WahaRawResponse {
  status: number
  contentType: string
  json: unknown
  bytes: ArrayBuffer | null
}

async function wahaFetch(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: {
    body?: unknown
    timeoutMs?: number
    accept?: string
    /** HTTP statuses that should be returned instead of thrown. */
    allowStatus?: number[]
    binary?: boolean
  } = {}
): Promise<WahaRawResponse> {
  const env = readEnv()
  if (!env) {
    throw new WahaError('WhatsApp (WAHA) is not configured on the server.', 'not_configured')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  // Path template for error messages — never includes host or key.
  const label = `${method} ${path.split('?')[0]}`

  let res: Response
  try {
    res = await fetch(`${env.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': env.apiKey,
        Accept: options.accept || 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new WahaError(`WAHA did not respond in time (${label}).`, 'timeout')
    }
    throw new WahaError(`Could not reach WAHA (${label}).`, 'network')
  }

  try {
    const contentType = res.headers.get('content-type') || ''
    let json: unknown = null
    let bytes: ArrayBuffer | null = null
    if (options.binary && !contentType.includes('json')) {
      bytes = await res.arrayBuffer()
    } else {
      const text = await res.text()
      if (text) {
        try {
          json = JSON.parse(text)
        } catch {
          json = text
        }
      }
    }

    if (!res.ok && !(options.allowStatus || []).includes(res.status)) {
      const detail =
        json && typeof json === 'object'
          ? String(
              (json as { message?: unknown; error?: unknown }).message ??
                (json as { error?: unknown }).error ??
                ''
            )
          : typeof json === 'string'
            ? json
            : ''
      throw new WahaError(
        `WAHA error HTTP ${res.status} (${label})${detail ? `: ${scrub(detail)}` : ''}`,
        'http',
        res.status
      )
    }

    return { status: res.status, contentType, json, bytes }
  } finally {
    clearTimeout(timer)
  }
}

// ── Health ──────────────────────────────────────────────────────────────────

export async function pingWaha(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now()
  try {
    await wahaFetch('GET', '/ping', { timeoutMs: 6_000 })
    return { ok: true, latencyMs: Date.now() - started }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'ping failed',
    }
  }
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function getWahaSession(): Promise<WahaSessionInfo | null> {
  const res = await wahaFetch('GET', `/api/sessions/${WAHA_SESSION}`, { allowStatus: [404] })
  if (res.status === 404 || !res.json || typeof res.json !== 'object') return null
  return res.json as WahaSessionInfo
}

export function buildWebhookConfig(webhookUrl: string, hmacKey: string): WahaWebhookConfig {
  return {
    url: webhookUrl,
    // message.any = inbound + messages typed by staff on the phone (fromMe, source=app)
    events: ['message.any', 'message.ack', 'session.status'],
    hmac: { key: hmacKey },
    retries: { policy: 'constant', delaySeconds: 3, attempts: 5 },
  }
}

/**
 * Creates the `default` session if missing, (re)applies the webhook config when
 * needed, and starts it. Safe to call repeatedly.
 */
export async function ensureWahaSessionStarted(params: {
  webhookUrl: string
  hmacKey: string
  forceConfigUpdate?: boolean
}): Promise<WahaSessionInfo | null> {
  const webhook = buildWebhookConfig(params.webhookUrl, params.hmacKey)
  const config = { webhooks: [webhook] }
  const existing = await getWahaSession()

  if (!existing) {
    await wahaFetch('POST', '/api/sessions', {
      body: { name: WAHA_SESSION, start: true, config },
      timeoutMs: 20_000,
    })
    return getWahaSession()
  }

  const hasOurHook = (existing.config?.webhooks || []).some(
    (w) => w?.url === params.webhookUrl && (w.events || []).includes('message.any')
  )
  const idle = existing.status === 'STOPPED' || existing.status === 'FAILED'

  if (!hasOurHook || params.forceConfigUpdate || idle) {
    // PUT replaces the whole config; it may restart a running session.
    await wahaFetch('PUT', `/api/sessions/${WAHA_SESSION}`, {
      body: { name: WAHA_SESSION, config },
      timeoutMs: 20_000,
    })
  }

  const after = await getWahaSession()
  if (!after || after.status === 'STOPPED' || after.status === 'FAILED') {
    await wahaFetch('POST', `/api/sessions/${WAHA_SESSION}/start`, { timeoutMs: 20_000 })
  }
  return getWahaSession()
}

export async function stopWahaSession(): Promise<void> {
  await wahaFetch('POST', `/api/sessions/${WAHA_SESSION}/stop`, { timeoutMs: 20_000 })
}

export async function logoutWahaSession(): Promise<void> {
  await wahaFetch('POST', `/api/sessions/${WAHA_SESSION}/logout`, { timeoutMs: 20_000 })
}

// ── Auth (QR / pairing code) ────────────────────────────────────────────────

/** Returns the current QR as a PNG data URL, or null if no QR is available. */
export async function getWahaQrDataUrl(): Promise<string | null> {
  const res = await wahaFetch('GET', `/api/${WAHA_SESSION}/auth/qr?format=image`, {
    accept: 'image/png, application/json',
    binary: true,
    allowStatus: [404, 422],
  })
  if (res.status === 404 || res.status === 422) return null

  if (res.bytes && res.contentType.startsWith('image/')) {
    const b64 = Buffer.from(res.bytes).toString('base64')
    return `data:${res.contentType.split(';')[0]};base64,${b64}`
  }

  const j = res.json as { mimetype?: string; data?: string; value?: string } | null
  if (j?.data) return `data:${j.mimetype || 'image/png'};base64,${j.data}`
  if (j?.value) return QRCode.toDataURL(j.value, { margin: 1, width: 320 })
  return null
}

export async function requestWahaPairingCode(phoneDigits: string): Promise<string> {
  const res = await wahaFetch('POST', `/api/${WAHA_SESSION}/auth/request-code`, {
    body: { phoneNumber: phoneDigits },
    timeoutMs: 20_000,
  })
  const j = res.json as { code?: string } | string | null
  const code = typeof j === 'string' ? j : j?.code
  if (!code) throw new WahaError('WAHA did not return a pairing code.', 'bad_response')
  return code
}

// ── Contacts ────────────────────────────────────────────────────────────────

export async function checkWahaNumberExists(
  phoneDigits: string
): Promise<{ exists: boolean; chatId: string | null }> {
  const res = await wahaFetch(
    'GET',
    `/api/contacts/check-exists?phone=${encodeURIComponent(phoneDigits)}&session=${WAHA_SESSION}`
  )
  const j = (res.json || {}) as { numberExists?: boolean; chatId?: string | null }
  return { exists: Boolean(j.numberExists), chatId: j.chatId || null }
}

/** Maps a hidden `xxx@lid` id to a phone-number chat id (`2547…@c.us`), if WAHA knows it. */
export async function resolveWahaLid(lid: string): Promise<string | null> {
  try {
    const res = await wahaFetch('GET', `/api/${WAHA_SESSION}/lids/${encodeURIComponent(lid)}`, {
      allowStatus: [404],
      timeoutMs: 5_000,
    })
    const j = (res.json || {}) as { pn?: string | null }
    return j.pn || null
  } catch {
    return null
  }
}

// ── Messaging ───────────────────────────────────────────────────────────────

function extractMessageId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const id = d.id
  if (typeof id === 'string' && id) return id
  if (id && typeof id === 'object') {
    const ser = (id as { _serialized?: unknown; id?: unknown })._serialized
    if (typeof ser === 'string') return ser
  }
  const key = d.key as { id?: unknown } | undefined
  if (key && typeof key.id === 'string') return key.id
  const inner = d._data as { id?: unknown } | undefined
  if (inner) return extractMessageId(inner)
  return null
}

export async function sendWahaText(params: {
  chatId: string
  text: string
  replyTo?: string | null
}): Promise<{ messageId: string | null }> {
  const res = await wahaFetch('POST', '/api/sendText', {
    body: {
      session: WAHA_SESSION,
      chatId: params.chatId,
      text: params.text.slice(0, 4096),
      linkPreview: false,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    },
    timeoutMs: 20_000,
  })
  return { messageId: extractMessageId(res.json) }
}

/** Sends a document (e.g. a PDF proforma) with an optional caption. */
export async function sendWahaFile(params: {
  chatId: string
  filename: string
  mimetype: string
  base64: string
  caption?: string
}): Promise<{ messageId: string | null }> {
  const res = await wahaFetch('POST', '/api/sendFile', {
    body: {
      session: WAHA_SESSION,
      chatId: params.chatId,
      file: { mimetype: params.mimetype, filename: params.filename, data: params.base64 },
      ...(params.caption ? { caption: params.caption.slice(0, 1024) } : {}),
    },
    timeoutMs: 30_000,
  })
  return { messageId: extractMessageId(res.json) }
}

export async function setWahaTyping(chatId: string, typing: boolean): Promise<void> {
  try {
    await wahaFetch('POST', typing ? '/api/startTyping' : '/api/stopTyping', {
      body: { session: WAHA_SESSION, chatId },
      timeoutMs: 5_000,
    })
  } catch {
    // cosmetic only
  }
}

export async function sendWahaSeen(chatId: string, messageIds: string[]): Promise<void> {
  try {
    await wahaFetch('POST', '/api/sendSeen', {
      body: { session: WAHA_SESSION, chatId, messageIds },
      timeoutMs: 5_000,
    })
  } catch {
    // cosmetic only
  }
}
