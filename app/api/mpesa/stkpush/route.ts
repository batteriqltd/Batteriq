import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Phone normalisation ───────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  const p = String(raw).replace(/[\s\-\(\)\+]/g, '').trim()
  if (/^2547\d{8}$/.test(p) || /^2541\d{8}$/.test(p)) return p
  if (/^07\d{8}$/.test(p)) return '254' + p.slice(1)
  if (/^01\d{8}$/.test(p)) return '254' + p.slice(1)
  if (/^7\d{8}$/.test(p))  return '254' + p
  if (/^1\d{8}$/.test(p))  return '254' + p
  return p
}

// ─── Timestamp ─────────────────────────────────────────────────────────────
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

// ─── Get Daraja Access Token ────────────────────────────────────────────────
async function getDarajaToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const raw = `${consumerKey}:${consumerSecret}`
  const encoded = Buffer.from(raw, 'utf8').toString('base64')

  console.log('[MPESA] Requesting token from:', `${baseUrl}/oauth/v1/generate`)
  console.log('[MPESA] Credentials length:', raw.length)

  const res = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      cache: 'no-store',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — Next.js fetch extension
      next: { revalidate: 0 },
    }
  )

  const responseText = await res.text()
  console.log('[MPESA] Token response status:', res.status)
  console.log('[MPESA] Token response body:', responseText)

  if (!res.ok) {
    throw new Error(`Token request failed with HTTP ${res.status}: ${responseText}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(`Token response is not JSON: ${responseText}`)
  }

  if (!data.access_token) {
    throw new Error(`No access_token in response: ${responseText}`)
  }

  const token = String(data.access_token).trim()
  console.log('[MPESA] Token obtained. Length:', token.length)
  return token
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  console.log('\n==========================================')
  console.log('[MPESA] STK PUSH REQUEST RECEIVED')
  console.log('==========================================')

  try {
    // ── 1. Read and validate environment variables ──
    const env = {
      consumerKey:    process.env.MPESA_CONSUMER_KEY?.trim() ?? '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET?.trim() ?? '',
      shortcode:      process.env.MPESA_BUSINESS_SHORTCODE?.trim() ?? '',
      passkey:        process.env.MPESA_PASSKEY?.trim() ?? '',
      callbackUrl:    process.env.MPESA_CALLBACK_URL?.trim() ?? '',
      environment:    process.env.MPESA_ENVIRONMENT?.trim() ?? 'sandbox',
    }

    const maskKey = (k: string) => k.length > 8 ? `${k.slice(0, 4)}...${k.slice(-4)}` : '(too short)'
    console.log('[MPESA] ENV vars loaded:')
    console.log('  consumerKey present:', !!env.consumerKey, '| length:', env.consumerKey.length, '| preview:', maskKey(env.consumerKey))
    console.log('  consumerSecret present:', !!env.consumerSecret, '| length:', env.consumerSecret.length, '| preview:', maskKey(env.consumerSecret))
    console.log('  shortcode:', env.shortcode)
    console.log('  passkey length:', env.passkey.length, '| passkey preview:', maskKey(env.passkey))
    console.log('  callbackUrl:', env.callbackUrl)
    console.log('  environment:', env.environment)
    console.log('  ⚠️  callbackUrl must be a PUBLIC HTTPS URL (not localhost) for Safaricom to reach it')

    const missing = Object.entries(env)
      .filter(([, v]) => !v)
      .map(([k]) => k)

    if (missing.length > 0) {
      console.error('[MPESA] MISSING ENV VARS:', missing)
      return NextResponse.json({
        error: `Missing M-Pesa config: ${missing.join(', ')}`,
        fix: 'Check your .env.local file has all MPESA_ variables set',
      }, { status: 500 })
    }

    // ── 2. Read request body ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { phoneNumber, amount, orderId } = body as {
      phoneNumber?: string
      amount?: number | string
      orderId?: string
    }
    console.log('[MPESA] Request:', { phoneNumber, amount, orderId })

    if (!phoneNumber || !amount) {
      return NextResponse.json({
        error: 'phoneNumber and amount are required',
      }, { status: 400 })
    }

    // ── 3. Normalise phone ──
    const phone = normalizePhone(String(phoneNumber))
    const mpesaAmount = Math.max(1, Math.round(Number(amount) || 1))

    console.log('[MPESA] Normalised phone:', phone)
    console.log('[MPESA] Amount:', mpesaAmount)

    if (!/^254[17]\d{8}$/.test(phone)) {
      console.error('[MPESA] Invalid phone format:', phone)
      return NextResponse.json({
        error: `Invalid phone number: "${phone}". Use format 07XXXXXXXX or 254 7XXXXXXXX`,
      }, { status: 400 })
    }

    // ── 4. Set base URL ──
    const baseUrl = env.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    console.log('[MPESA] Using base URL:', baseUrl)

    // ── 5. Get access token ──
    const token = await getDarajaToken(baseUrl, env.consumerKey, env.consumerSecret)

    // ── 6. Build STK push payload ──
    const timestamp = getTimestamp()
    const password = Buffer.from(
      `${env.shortcode}${env.passkey}${timestamp}`,
      'utf8'
    ).toString('base64')

    const accountRef = orderId
      ? `BQ${String(orderId).slice(-8).toUpperCase().replace(/-/g, '')}`
      : 'BATTERIQ'

    const payload = {
      BusinessShortCode: env.shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerBuyGoodsOnline',
      Amount:            mpesaAmount,
      PartyA:            phone,
      PartyB:            env.shortcode,
      PhoneNumber:       phone,
      CallBackURL:       env.callbackUrl,
      AccountReference:  accountRef,
      TransactionDesc:   'Batteriq Order Payment',
    }

    console.log('[MPESA] STK payload:', { ...payload, Password: '[HIDDEN]' })
    console.log('[MPESA] Timestamp:', timestamp)
    console.log('[MPESA] AccountReference:', accountRef)

    // ── 7. Send STK push ──
    console.log('[MPESA] Sending STK push to Safaricom...')

    const stkRes = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
          'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        },
        body: JSON.stringify(payload),
      }
    )

    const stkText = await stkRes.text()
    console.log('[MPESA] STK HTTP status:', stkRes.status)
    console.log('[MPESA] STK raw response:', stkText)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stkData: any
    try {
      stkData = JSON.parse(stkText)
    } catch {
      console.error('[MPESA] STK response is not valid JSON')
      return NextResponse.json({
        error: 'Safaricom returned invalid response',
        raw:   stkText,
      }, { status: 500 })
    }

    // ── 8. Handle success ──
    if (stkData.ResponseCode === '0') {
      console.log('[MPESA] ✅ STK PUSH ACCEPTED BY SAFARICOM')
      console.log('[MPESA] CheckoutRequestID:', stkData.CheckoutRequestID)
      console.log('[MPESA] CustomerMessage:', stkData.CustomerMessage)

      if (orderId) {
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          const { error: dbError } = await supabase
            .from('orders')
            .update({ mpesa_checkout_request_id: stkData.CheckoutRequestID })
            .eq('id', orderId)

          if (dbError) {
            console.error('[MPESA] DB update error (non-fatal):', dbError)
          } else {
            console.log('[MPESA] CheckoutRequestID saved to order')
          }
        } catch (dbErr) {
          console.error('[MPESA] DB exception (non-fatal):', dbErr)
        }
      }

      return NextResponse.json({
        success:           true,
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        customerMessage:   stkData.CustomerMessage,
        description:       stkData.ResponseDescription,
      })
    }

    // ── 9. Handle Safaricom rejection ──
    console.error('[MPESA] ❌ STK PUSH REJECTED')
    console.error('[MPESA] Error code:', stkData.errorCode)
    console.error('[MPESA] Error message:', stkData.errorMessage)
    console.error('[MPESA] Full response:', stkData)

    const errorGuide: Record<string, string> = {
      '404.001.03': 'Invalid Access Token — your consumer key/secret do not match the shortcode, or the token expired. Check .env.local credentials.',
      '400.002.02': 'Bad credentials — consumer key or consumer secret is wrong.',
      '400.002.05': 'Invalid shortcode — MPESA_BUSINESS_SHORTCODE is wrong for this environment.',
      '400.002.10': 'Invalid parameters — check phone number format and amount.',
      '404.001.04': 'Invalid callback URL — must be a publicly reachable HTTPS URL.',
      '400.002.01': 'Missing parameters in the STK push request.',
    }

    const guide = errorGuide[stkData.errorCode as string] ?? 'Unknown Safaricom error'

    return NextResponse.json({
      error:     stkData.errorMessage ?? 'Safaricom rejected the request',
      errorCode: stkData.errorCode,
      guide,
      raw:       stkData,
    }, { status: 400 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing M-Pesa request'
    const stack   = err instanceof Error ? err.stack : undefined
    console.error('[MPESA] ❌ EXCEPTION:', message)
    if (stack) console.error('[MPESA] Stack:', stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
