// One-time Pesapal IPN registration, kept as code so it is repeatable per
// environment instead of a manual dashboard step.
//
//   GET  /api/pesapal/register-ipn  → list the IPN URLs already registered
//   POST /api/pesapal/register-ipn  → register this site's IPN URL, returns ipn_id
//
// Save the returned ipn_id as PESAPAL_IPN_ID. Do NOT call this on every
// request — one registration per environment + URL is all Pesapal needs.
// Admin session required: this touches merchant configuration.

import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getPesapalConfig, registerIpnUrl, listRegisteredIpns, PesapalError } from '@/lib/pesapal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function defaultIpnUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const base = configured && /^https?:\/\//.test(configured) ? configured : new URL(requestUrl).origin
  return `${base}/api/pesapal/ipn`
}

export async function GET(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { environment } = getPesapalConfig()
    const registered = await listRegisteredIpns()
    return NextResponse.json({
      environment,
      suggestedUrl: defaultIpnUrl(req.url),
      currentIpnId: process.env.PESAPAL_IPN_ID?.trim() || null,
      registered,
    })
  } catch (err) {
    const message = err instanceof PesapalError ? err.message : 'Could not list Pesapal IPN URLs.'
    console.error('[PESAPAL] IPN list failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const url = typeof body?.url === 'string' && body.url.trim() ? body.url.trim() : defaultIpnUrl(req.url)

    if (!/^https:\/\//.test(url)) {
      return NextResponse.json(
        { error: 'Pesapal requires a public HTTPS IPN URL. Deploy first, or pass { "url": "https://..." }.' },
        { status: 400 }
      )
    }

    const { environment } = getPesapalConfig()
    const result = await registerIpnUrl(url, 'POST')

    // Surfaced in the response and the server log so the id is easy to copy.
    console.log(`[PESAPAL] Registered IPN (${environment}): ${url} → PESAPAL_IPN_ID=${result.ipn_id}`)

    return NextResponse.json({
      environment,
      url,
      ipn_id: result.ipn_id,
      next_step: `Set PESAPAL_IPN_ID=${result.ipn_id} in your environment, then redeploy.`,
      raw: result,
    })
  } catch (err) {
    const message = err instanceof PesapalError ? err.message : 'Could not register the Pesapal IPN URL.'
    console.error('[PESAPAL] IPN registration failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
