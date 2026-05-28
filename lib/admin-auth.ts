import { cookies } from 'next/headers'

const SESSION_COOKIE = 'batteriq_admin_session'

export function getAdminSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

    if (Date.now() > decoded.exp) return null

    return decoded as { id: string; email: string; role: string; exp: number }
  } catch {
    return null
  }
}

export function requireAdminSession() {
  const session = getAdminSession()
  if (!session) return null
  return session
}
