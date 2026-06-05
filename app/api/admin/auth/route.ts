import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { createSessionToken } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const SESSION_COOKIE = 'batteriq_admin_session'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = rateLimit(`login:${ip}`, 5, 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait 1 minute.' },
      { status: 429 }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data) {
      await new Promise(r => setTimeout(r, 1000))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const { data: verified } = await supabase.rpc('verify_admin_password', {
      input_password: password,
      stored_hash: data.password_hash,
    })

    if (!verified) {
      await new Promise(r => setTimeout(r, 1000))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const sessionToken = createSessionToken({
      id: data.id,
      email: data.email,
      role: data.role,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    })

    const response = NextResponse.json({ success: true, role: data.role })
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    // Task 6: Audit log (non-blocking)
    const adminDb = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(adminDb.from('admin_audit_log') as any).insert({
      admin_id: data.id,
      action: 'login',
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || null,
      details: { email: data.email },
    }).then(() => {}).catch(() => {})

    console.log(`[ADMIN AUTH] ✅ Login: ${data.email}`)
    return response

  } catch (err: unknown) {
    console.error('[ADMIN AUTH] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  return response
}
