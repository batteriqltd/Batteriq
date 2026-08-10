import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailContactFormSubmission } from '@/lib/email'
import { sendAdminPush } from '@/lib/push'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Spam bots fill fields with random mixed-case strings like "RGPZRSKyrvQtcrsBBwEI".
// Real names never have 3+ uppercase letters after the first character of a word.
function looksRandomName(s: string): boolean {
  return String(s).trim().split(/\s+/).some(
    (w) => (w.slice(1).match(/[A-Z]/g)?.length ?? 0) >= 3
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, inquiryType, message, company, elapsedMs } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Silently drop bot submissions — return success so bots don't adapt:
    // honeypot field filled, letters in the phone number, gibberish names,
    // or the form submitted faster than a human can type.
    const isSpam =
      (typeof company === 'string' && company.trim() !== '') ||
      (phone && /[A-Za-z]/.test(String(phone))) ||
      looksRandomName(firstName) ||
      looksRandomName(lastName) ||
      (typeof elapsedMs === 'number' && elapsedMs >= 0 && elapsedMs < 2000)

    if (isSpam) {
      console.warn('[CONTACT] Spam submission dropped:', { firstName, email })
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submission } = await (supabase.from('contact_submissions') as any)
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        inquiry_type: inquiryType || null,
        message: message.trim(),
      })
      .select('id')
      .single()

    // Instant push alert to admin devices — fire-and-forget
    sendAdminPush({
      title: `💬 New Question from ${firstName} ${lastName}`.trim(),
      body: String(message).trim().slice(0, 60),
      tag: 'message',
      id: submission?.id ? String(submission.id) : undefined,
      url: '/admin/messages',
    }).catch(() => {})

    // Fire-and-forget emails — don't fail the submission if email fails
    emailContactFormSubmission({ firstName, lastName, email, phone, inquiryType, message }).catch((e) =>
      console.error('Contact email error:', e)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact submission error:', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
