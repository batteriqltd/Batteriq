import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailContactFormSubmission } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, inquiryType, message } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('contact_submissions') as any).insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      inquiry_type: inquiryType || null,
      message: message.trim(),
    })

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
