import { NextRequest, NextResponse } from 'next/server'

function getTimestamp(): string {
  const d = new Date()
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0')
  )
}

async function getDarajaToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const raw = `${consumerKey}:${consumerSecret}`
  const encoded = Buffer.from(raw).toString('base64')
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${encoded}` },
  })
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const { checkoutRequestId } = await request.json()
    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'checkoutRequestId is required' }, { status: 400 })
    }

    const consumerKey    = process.env.MPESA_CONSUMER_KEY?.trim() ?? ''
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim() ?? ''
    const shortcode      = process.env.MPESA_BUSINESS_SHORTCODE?.trim() ?? ''
    const passkey        = process.env.MPESA_PASSKEY?.trim() ?? ''
    const environment    = process.env.MPESA_ENVIRONMENT?.trim() ?? 'sandbox'

    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    const token     = await getDarajaToken(baseUrl, consumerKey, consumerSecret)
    const timestamp = getTimestamp()
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

    const res = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    })

    const data = await res.json()
    console.log('[STKQuery] Result:', JSON.stringify(data))

    // ResultCode 0 = paid, 1032 = cancelled, 1037 = timeout, others = failed
    return NextResponse.json({
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
    })
  } catch (err) {
    console.error('[STKQuery] Error:', err)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}
