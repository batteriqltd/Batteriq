import { NextResponse } from 'next/server'

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

export async function GET() {
  const consumerKey    = process.env.MPESA_CONSUMER_KEY?.trim() ?? ''
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim() ?? ''
  const passkey        = process.env.MPESA_PASSKEY?.trim() ?? ''
  const environment    = process.env.MPESA_ENVIRONMENT?.trim() ?? 'sandbox'
  const shortcode      = process.env.MPESA_BUSINESS_SHORTCODE?.trim() ?? ''

  const baseUrl = environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

  // Step 1: Get token
  let token = ''
  let tokenStatus = 'FAILED'
  let tokenError = ''
  try {
    const encoded = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${encoded}` },
    })
    const text = await res.text()
    const data = JSON.parse(text)
    if (data.access_token) {
      token = data.access_token
      tokenStatus = 'SUCCESS'
    } else {
      tokenError = text
    }
  } catch (e) { tokenError = String(e) }

  // Step 2: Test STK push with dummy number (won't actually send — just shows Safaricom's response)
  let stkStatus = 'SKIPPED'
  let stkError = ''
  let stkRaw = ''
  if (token) {
    try {
      const timestamp = getTimestamp()
      const password = Buffer.from(`303030${passkey}${timestamp}`).toString('base64')
      const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: '303030',
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: 1,
          PartyA: '254708374149',
          PartyB: '303030',
          PhoneNumber: '254708374149',
          CallBackURL: 'https://batteriq.com/api/mpesa/callback',
          AccountReference: '3753#',
          TransactionDesc: 'Test',
        }),
      })
      stkRaw = await res.text()
      const stkData = JSON.parse(stkRaw)
      stkStatus = stkData.ResponseCode === '0' ? 'SUCCESS' : 'FAILED'
      stkError = stkRaw
    } catch (e) { stkError = String(e) }
  }

  return NextResponse.json({
    environment,
    baseUrl,
    shortcode,
    consumerKeyPreview: consumerKey ? consumerKey.slice(0, 4) + '...' + consumerKey.slice(-4) : 'MISSING',
    consumerKeyLength: consumerKey.length,
    consumerSecretLength: consumerSecret.length,
    passkeyLength: passkey.length,
    tokenStatus,
    tokenError,
    stkStatus,
    stkRaw,
    stkError,
  })
}
