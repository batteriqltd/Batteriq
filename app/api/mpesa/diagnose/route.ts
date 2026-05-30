import { NextResponse } from 'next/server'

export async function GET() {
  const consumerKey    = process.env.MPESA_CONSUMER_KEY?.trim() ?? ''
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim() ?? ''
  const shortcode      = process.env.MPESA_BUSINESS_SHORTCODE?.trim() ?? ''
  const passkey        = process.env.MPESA_PASSKEY?.trim() ?? ''
  const environment    = process.env.MPESA_ENVIRONMENT?.trim() ?? 'sandbox'
  const callbackUrl    = process.env.MPESA_CALLBACK_URL?.trim() ?? ''

  const baseUrl = environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

  // Try to get a token
  let tokenStatus = 'FAILED'
  let tokenError  = ''
  let tokenPreview = ''

  try {
    const encoded = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${encoded}` },
    })
    const data = await res.json()
    if (data.access_token) {
      tokenStatus  = 'SUCCESS'
      tokenPreview = data.access_token.slice(0, 10) + '...'
    } else {
      tokenStatus = 'FAILED'
      tokenError  = JSON.stringify(data)
    }
  } catch (e) {
    tokenError = String(e)
  }

  return NextResponse.json({
    environment,
    baseUrl,
    shortcode,
    callbackUrl,
    consumerKeyLength:    consumerKey.length,
    consumerKeyPreview:   consumerKey ? consumerKey.slice(0, 4) + '...' + consumerKey.slice(-4) : 'MISSING',
    consumerSecretLength: consumerSecret.length,
    passkeyLength:        passkey.length,
    tokenStatus,
    tokenError,
    tokenPreview,
  })
}
