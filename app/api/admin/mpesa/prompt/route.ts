import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

function normalizePhone(raw: string): string {
  const p = String(raw).replace(/[\s\-\(\)\+]/g, '').trim()
  if (/^2547\d{8}$/.test(p) || /^2541\d{8}$/.test(p)) return p
  if (/^07\d{8}$/.test(p)) return '254' + p.slice(1)
  if (/^01\d{8}$/.test(p)) return '254' + p.slice(1)
  if (/^7\d{8}$/.test(p)) return '254' + p
  if (/^1\d{8}$/.test(p)) return '254' + p
  return p
}

function getTimestamp(): string {
  const d = new Date()
  return d.getFullYear().toString() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0') + String(d.getSeconds()).padStart(2,'0')
}

export async function POST(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => null) as { phoneNumber?: string; amount?: string|number } | null
    if (!body?.phoneNumber || body?.amount === undefined) {
      return NextResponse.json({ error: 'phoneNumber and amount are required' }, { status: 400 })
    }

    const phone = normalizePhone(String(body.phoneNumber))
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: `Invalid phone number: "${phone}". Use 07XXXXXXXX or 2547XXXXXXXX` }, { status: 400 })
    }

    const amountNum = Math.round(Number(body.amount))
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      return NextResponse.json({ error: 'Amount must be a number >= 1' }, { status: 400 })
    }
    if (amountNum > 500000) {
      return NextResponse.json({ error: 'Amount exceeds maximum (500,000)' }, { status: 400 })
    }

    const env = {
      consumerKey: process.env.MPESA_CONSUMER_KEY?.trim() ?? '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET?.trim() ?? '',
      shortcode: process.env.MPESA_BUSINESS_SHORTCODE?.trim() ?? '',
      passkey: process.env.MPESA_PASSKEY?.trim() ?? '',
      callbackUrl: process.env.MPESA_CALLBACK_URL?.trim() ?? '',
      environment: process.env.MPESA_ENVIRONMENT?.trim() ?? 'sandbox',
    }
    const missing = Object.entries(env).filter(([,v]) => !v).map(([k]) => k)
    if (missing.length) return NextResponse.json({ error: `Missing M-Pesa config: ${missing.join(', ')}` }, { status: 500 })

    const baseUrl = env.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

    // Get token
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${Buffer.from(`${env.consumerKey}:${env.consumerSecret}`).toString('base64')}` },
      cache: 'no-store',
    })
    const tokenText = await tokenRes.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tokenJson: any
    try { tokenJson = JSON.parse(tokenText) } catch { return NextResponse.json({ error: 'Token response not JSON', raw: tokenText }, { status: 500 }) }
    if (!tokenRes.ok || !tokenJson.access_token) return NextResponse.json({ error: 'Failed to get access token', details: tokenJson, raw: tokenText }, { status: 500 })
    const token = String(tokenJson.access_token).trim()

    const timestamp = getTimestamp()
    const password = Buffer.from(`${env.shortcode}${env.passkey}${timestamp}`, 'utf8').toString('base64')

    const payload = {
      BusinessShortCode: env.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: amountNum,
      PartyA: phone,
      PartyB: '4575142',
      PhoneNumber: phone,
      CallBackURL: env.callbackUrl,
      AccountReference: 'BATTERIQ',
      TransactionDesc: 'Batteriq Payment Prompt',
    }

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const stkText = await stkRes.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stkData: any
    try { stkData = JSON.parse(stkText) } catch { return NextResponse.json({ error: 'Safaricom returned invalid response', raw: stkText }, { status: 500 }) }

    if (stkData.ResponseCode === '0') {
      return NextResponse.json({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        customerMessage: stkData.CustomerMessage,
        description: stkData.ResponseDescription,
        phone,
        amount: amountNum,
      })
    }

    return NextResponse.json({ error: stkData.errorMessage ?? 'Safaricom rejected the request', errorCode: stkData.errorCode, raw: stkData }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
