import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

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

    const sessionToken = Buffer.from(
      JSON.stringify({
        id: data.id,
        email: data.email,
        role: data.role,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      })
    ).toString('base64')

    const response = NextResponse.json({ success: true, role: data.role })
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    console.log(`[ADMIN AUTH] ✅ Login: ${data.email}`)
    return response

  } catch (err: any) {
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
