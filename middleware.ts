import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'batteriq_admin_session'
const SECRET = process.env.ADMIN_SESSION_SECRET || 'batteriq-fallback-2026'
const SECRET_LOGIN_PATH = '/admin/secure-bq9x2026'

// Task 5: In-memory rate limiter for admin API routes (per Edge instance)
const apiRateMap = new Map<string, { count: number; resetAt: number }>()

function checkApiRateLimit(ip: string): boolean {
  const key = `admin-api:${ip}`
  const now = Date.now()
  const entry = apiRateMap.get(key)
  if (!entry || now > entry.resetAt) {
    apiRateMap.set(key, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

// Task 2: Verify HMAC-signed session token using Web Crypto (Edge-compatible)
async function verifyHmacToken(token: string): Promise<{ id: string; email: string; role: string; exp: number } | null> {
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return null
    const data = token.slice(0, dotIdx)
    const sig = token.slice(dotIdx + 1)

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert base64url sig to bytes
    const b64 = sig.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data))
    if (!valid) return null

    const decoded = JSON.parse(atob(data))
    if (Date.now() > decoded.exp) return null
    return decoded
  } catch { return null }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Task 5: Rate limit admin API routes (excluding auth)
  if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/auth') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkApiRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Task 1: Allow the secret login page through without session check
  if (pathname === SECRET_LOGIN_PATH) return NextResponse.next()

  // Task 1: Old login URL → rewrite to 404 (security through obscurity)
  if (pathname === '/admin/login') {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // Verify session for all other /admin/* routes
  const session = request.cookies.get(SESSION_COOKIE)?.value

  if (!session) {
    const loginUrl = new URL('/admin/secure-bq9x2026', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const decoded = await verifyHmacToken(session)
  if (!decoded) {
    const loginUrl = new URL('/admin/secure-bq9x2026', request.url)
    loginUrl.searchParams.set('reason', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set('batteriq_admin_session', '', { maxAge: 0, path: '/' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
