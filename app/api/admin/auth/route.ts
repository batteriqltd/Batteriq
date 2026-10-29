import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { createSessionToken } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createOutreachAdminClient,
  resolveOutreachSupabaseCredentials,
} from '@/lib/outreach/supabase'

const SESSION_COOKIE = 'batteriq_admin_session'

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

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

    const normalizedEmail = String(email).toLowerCase().trim()
    const cleanInputPassword = String(password).trim()

    // 1. Dedicated Outreach Agent Admin login via environment variables (never hardcoded)
    const outreachEnvEmail = process.env.OUTREACH_ADMIN_EMAIL?.toLowerCase().trim()
    const outreachEnvPassword = process.env.OUTREACH_ADMIN_PASSWORD?.trim()
    if (
      outreachEnvEmail &&
      outreachEnvPassword &&
      outreachEnvPassword !== 'replace_me' &&
      safeEqualString(normalizedEmail, outreachEnvEmail) &&
      (safeEqualString(String(password), outreachEnvPassword) ||
        safeEqualString(cleanInputPassword, outreachEnvPassword))
    ) {
      const sessionToken = createSessionToken({
        id: 'outreach-admin',
        email: outreachEnvEmail,
        role: 'outreach_admin',
        exp: Date.now() + 8 * 60 * 60 * 1000,
      })

      const response = NextResponse.json({
        success: true,
        role: 'outreach_admin',
        defaultRedirect: '/outreach-admin',
      })
      response.cookies.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
      console.log(`[ADMIN AUTH] ✅ Outreach Admin Login (env): ${outreachEnvEmail}`)
      return response
    }

    // 2. Dedicated 2nd Outreach Supabase `admin_users` (bcrypt via pgcrypto verify_admin_password RPC)
    const outreachCreds = resolveOutreachSupabaseCredentials()
    if (outreachCreds?.isDedicatedProject) {
      try {
        const outreachDb = createOutreachAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: outreachUser } = await (outreachDb.from('admin_users') as any)
          .select('id, email, role, password_hash')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (outreachUser?.password_hash) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let { data: verifiedOutreach } = await (outreachDb as any).rpc('verify_admin_password', {
            input_password: String(password),
            stored_hash: outreachUser.password_hash,
          })
          if (!verifiedOutreach && cleanInputPassword !== String(password)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const retryVerify = await (outreachDb as any).rpc('verify_admin_password', {
              input_password: cleanInputPassword,
              stored_hash: outreachUser.password_hash,
            })
            verifiedOutreach = retryVerify.data
          }

          if (verifiedOutreach) {
            const role = outreachUser.role || 'outreach_admin'
            const sessionToken = createSessionToken({
              id: outreachUser.id,
              email: outreachUser.email,
              role,
              exp: Date.now() + 8 * 60 * 60 * 1000,
            })

            const response = NextResponse.json({
              success: true,
              role,
              defaultRedirect: role === 'outreach_admin' ? '/outreach-admin' : '/admin',
            })
            response.cookies.set(SESSION_COOKIE, sessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
            console.log(`[ADMIN AUTH] ✅ Outreach Admin Login (2nd Supabase): ${outreachUser.email}`)
            return response
          }
        }
      } catch (e) {
        console.warn('[ADMIN AUTH] Outreach DB auth check skipped:', e)
      }
    }

    // 3. Main Store Supabase `admin_users`
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await new Promise(r => setTimeout(r, 1000))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role, password_hash')
      .eq('email', normalizedEmail)
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
      // No maxAge/expires → this is a SESSION cookie. It is cleared when the
      // app/browser session ends, so re-opening the installed PWA requires the
      // password again. The token still carries an 8h absolute expiry as a
      // server-side safety net (see exp above).
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
