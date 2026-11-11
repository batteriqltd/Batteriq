/**
 * Provider-agnostic WhatsApp helpers.
 *
 * When WAHA is configured (WAHA_BASE_URL + WAHA_API_KEY) it is the active
 * provider; otherwise we fall back to the Meta Cloud API implementation in
 * ./whatsapp.ts so existing behaviour (and tests) are unchanged.
 */
import crypto from 'crypto'
import { isWahaConfigured, sendWahaText, setWahaTyping } from '@/lib/waha'
import { sendWhatsAppCloudText } from './whatsapp'

export type WhatsAppProvider = 'waha' | 'meta'

export function activeWhatsAppProvider(): WhatsAppProvider {
  return isWahaConfigured() ? 'waha' : 'meta'
}

// ── Phone / chat id normalisation ───────────────────────────────────────────

/**
 * Normalises a user-entered phone number to international digits (no '+').
 * Kenyan local formats are expanded: 0712345678 / 712345678 → 254712345678.
 */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (/@(c\.us|s\.whatsapp\.net)$/.test(trimmed)) {
    return toWhatsAppDigits(trimmed.split('@')[0])
  }
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10 && digits.startsWith('0')) digits = `254${digits.slice(1)}`
  else if (digits.length === 9 && /^[17]/.test(digits)) digits = `254${digits}`
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

/** `+254712345678` / `0712 345 678` → `254712345678@c.us` */
export function toWhatsAppChatId(raw: string | null | undefined): string | null {
  const digits = toWhatsAppDigits(raw)
  return digits ? `${digits}@c.us` : null
}

/** `254712345678@c.us` (or @s.whatsapp.net) → `+254712345678`; null for @lid / groups. */
export function chatIdToPhoneE164(chatId: string | null | undefined): string | null {
  if (!chatId) return null
  const m = /^(\d{10,15})@(c\.us|s\.whatsapp\.net)$/.exec(chatId.trim())
  return m ? `+${m[1]}` : null
}

// ── Webhook HMAC (WAHA: X-Webhook-Hmac = hex HMAC-SHA512 of the raw body) ───

export function verifyWahaWebhookHmac(
  rawBody: string,
  hmacHeader: string | null,
  algorithmHeader: string | null,
  secret: string | undefined
): boolean {
  const key = secret?.trim()
  if (!key || !hmacHeader) return false
  if (algorithmHeader && algorithmHeader.toLowerCase() !== 'sha512') return false
  const expected = crypto.createHmac('sha512', key).update(rawBody, 'utf8').digest('hex')
  const provided = hmacHeader.trim().toLowerCase()
  if (provided.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Sending ─────────────────────────────────────────────────────────────────

export function randomBetween(minMs: number, maxMs: number): number {
  return Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs))
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sends a free-form text over the active provider.
 * `humanize` shows "typing…" and waits a short randomized delay first (WAHA only).
 */
export async function sendWhatsAppText(params: {
  toPhoneE164: string
  chatId?: string | null
  body: string
  humanize?: boolean
  fetchImpl?: typeof fetch
}): Promise<{ waMessageId: string | null; provider: WhatsAppProvider }> {
  if (activeWhatsAppProvider() === 'meta') {
    const { waMessageId } = await sendWhatsAppCloudText({
      toPhoneE164: params.toPhoneE164,
      body: params.body,
      fetchImpl: params.fetchImpl,
    })
    return { waMessageId, provider: 'meta' }
  }

  const chatId = params.chatId || toWhatsAppChatId(params.toPhoneE164)
  if (!chatId) throw new Error('Invalid WhatsApp number')

  if (params.humanize) {
    await setWahaTyping(chatId, true)
    // ~1.2–4s depending on reply length, randomized
    const base = Math.min(2_500, params.body.length * 18)
    await sleepMs(1_200 + randomBetween(0, 1_500) + base * 0.4)
    await setWahaTyping(chatId, false)
  }

  const { messageId } = await sendWahaText({ chatId, text: params.body })
  return { waMessageId: messageId, provider: 'waha' }
}

// ── Serverless-safe "after response" work ───────────────────────────────────

/**
 * Runs `task` after the HTTP response using Vercel's request-context waitUntil
 * (the same hook @vercel/functions uses). When that hook is unavailable
 * (local dev / tests) it returns the promise so the caller can await it inline.
 * Work stays bounded by the route's maxDuration either way.
 */
export function runAfterResponse(task: () => Promise<void>): Promise<void> | null {
  const promise = task().catch((err) => {
    console.error('[whatsapp] background task failed:', err instanceof Error ? err.message : err)
  })
  const ctx = (
    globalThis as unknown as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } }>
  )[Symbol.for('@vercel/request-context')]?.get?.()
  if (ctx?.waitUntil) {
    ctx.waitUntil(promise)
    return null
  }
  return promise
}
