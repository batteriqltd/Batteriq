import { NextResponse } from 'next/server'
import {
  getWhatsAppConfig,
  verifyWebhookSignature,
  sendWhatsAppText,
  markWhatsAppRead,
} from '@/lib/whatsapp'
import { answerWhatsAppQuestion } from '@/lib/whatsappBrain'

// Never cache: Meta re-verifies, and every message must be answered live.
export const dynamic = 'force-dynamic'

// Meta verification handshake — pierced once when registering the webhook.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  try {
    if (mode === 'subscribe' && token && token === getWhatsAppConfig().verifyToken) {
      return new NextResponse(challenge ?? '', { status: 200 })
    }
  } catch {
    // WhatsApp not configured yet.
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

type IncomingMessage = {
  from?: string
  id?: string
  type?: string
  text?: { body?: string }
}

// Customer messages — answer with the catalog-trained brain.
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    if (
      !verifyWebhookSignature(rawBody, req.headers.get('x-hub-signature-256'))
    ) {
      return NextResponse.json({ error: 'Bad signature' }, { status: 403 })
    }

    const payload = JSON.parse(rawBody) as {
      entry?: Array<{ changes?: Array<{ value?: { messages?: IncomingMessage[] } }> }>
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          if (msg.type !== 'text' || !msg.text?.body || !msg.from) continue

          const reply = await answerWhatsAppQuestion(msg.text.body)

          if (process.env.NODE_ENV !== 'production') {
            console.log(`WhatsApp reply to ${msg.from}: ${reply.slice(0, 160)}`)
          }

          if (msg.id) await markWhatsAppRead(msg.id)
          await sendWhatsAppText(msg.from, reply)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error instanceof Error ? error.message : error)
    // Always 200 so Meta stops retrying a poisoned payload.
    return NextResponse.json({ received: true })
  }
}
