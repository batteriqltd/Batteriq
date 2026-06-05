import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'batteriq_admin_session'
const SECRET = process.env.ADMIN_SESSION_SECRET || 'batteriq-fallback-2026'

export function createSessionToken(payload: { id: string; email: string; role: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64')
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySessionToken(token: string): { id: string; email: string; role: string; exp: number } | null {
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return null
    const data = token.slice(0, dotIdx)
    const sig = token.slice(dotIdx + 1)
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    if (sig !== expected) return null
    const decoded = JSON.parse(Buffer.from(data, 'base64').toString())
    if (Date.now() > decoded.exp) return null
    return decoded as { id: string; email: string; role: string; exp: number }
  } catch { return null }
}

export function getAdminSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    return verifySessionToken(token)
  } catch { return null }
}

export function requireAdminSession() {
  return getAdminSession()
}
