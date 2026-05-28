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
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email, name: name ?? null })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already subscribed' })
    }
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  sendNewsletterWelcomeEmail(email, name).catch(() => {})

  return NextResponse.json({ message: 'Subscribed successfully' })
}
