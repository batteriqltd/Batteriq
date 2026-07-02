import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { newsletterSchema } from '@/lib/validators'
import { sendNewsletterWelcomeEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { email, name } = parsed.data

  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, name: name ?? null })

    if (error) {
      // Duplicate email — already on the list, treat as a friendly success
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already subscribed' })
      }
      // Surface the real reason in the server logs so it can be diagnosed
      // (e.g. missing newsletter_subscribers table → run DATABASE_SETUP.sql)
      console.error('[newsletter] insert failed:', error.code, error.message)
      return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
    }

    sendNewsletterWelcomeEmail(email, name).catch(() => {})

    return NextResponse.json({ message: 'Subscribed successfully' })
  } catch (err) {
    // Usually a missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL env var
    console.error('[newsletter] fatal error:', err)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
