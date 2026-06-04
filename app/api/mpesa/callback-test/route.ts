import { NextRequest, NextResponse } from 'next/server'

// This endpoint lets Safaricom verify the callback URL is reachable
// Share this URL with Bill Graham: https://batteriq.com/api/mpesa/callback-test

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Batteriq M-Pesa callback endpoint is reachable',
    callbackUrl: 'https://batteriq.com/api/mpesa/callback',
    timestamp: new Date().toISOString(),
    server: 'Vercel — Johannesburg (jnb1)',
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  console.log('[Callback Test] Received POST:', JSON.stringify(body))
  return NextResponse.json({
    status: 'ok',
    received: body,
    timestamp: new Date().toISOString(),
  })
}
