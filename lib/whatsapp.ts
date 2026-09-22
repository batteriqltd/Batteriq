import { createHmac, timingSafeEqual } from 'node:crypto'

const GRAPH_VERSION = 'v21.0'

export type WhatsAppConfig = {
  verifyToken: string
  accessToken: string
  phoneNumberId: string
  appSecret?: string
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!verifyToken || !accessToken || !phoneNumberId) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.'
    )
  }

  return {
    verifyToken,
    accessToken,
    phoneNumberId,
    appSecret: process.env.WHATSAPP_APP_SECRET || undefined,
  }
}

/** Verify Meta's X-Hub-Signature-256 header. Skipped when no app secret is set (dev). */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { appSecret } = getWhatsAppConfig()
  if (!appSecret) return true
  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = createHmac('sha256', appSecret).update(rawBody).digest()
  const received = Buffer.from(signatureHeader.slice('sha256='.length), 'hex')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  try {
    const { accessToken, phoneNumberId } = getWhatsAppConfig()
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: body.slice(0, 4000) },
      }),
    })
    if (!res.ok) {
      console.error('WhatsApp send failed:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('WhatsApp send error:', error instanceof Error ? error.message : error)
    return false
  }
}

export async function markWhatsAppRead(messageId: string): Promise<void> {
  try {
    const { accessToken, phoneNumberId } = getWhatsAppConfig()
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch {
    // Read receipts are best-effort only.
  }
}
