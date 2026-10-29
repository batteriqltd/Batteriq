import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailContactFormSubmission } from '@/lib/email'
import { sendAdminPush } from '@/lib/push'
import { isSuppressed, recordConsent } from '@/lib/outreach/compliance'
import { createOutreachAdminClient, hasOutreachSupabaseConfig } from '@/lib/outreach/supabase'
import { normalizeKenyanPhone } from '@/lib/outreach/validators'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const WHATSAPP_CONSENT_TEXT =
  'I consent to receive follow-up messages from Batteriq Kenya via WhatsApp regarding my inquiry (you can reply STOP anytime to opt out).'

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
    const {
      firstName,
      lastName,
      email,
      phone,
      inquiryType,
      message,
      whatsappConsent,
      company,
      elapsedMs,
    } = body

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
    const consented = whatsappConsent === true
    const nowIso = new Date().toISOString()
    const normalizedPhone = phone
      ? normalizeKenyanPhone(String(phone), { source: 'form_or_whatsapp' })
      : null
    const storedPhone = normalizedPhone || phone?.trim() || null
    const cleanEmail = email.trim().toLowerCase()
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    // Insert with Kenya DPA WhatsApp consent fields (falls back cleanly if migration 006 is not applied yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: submission, error: insertErr } = await (supabase.from('contact_submissions') as any)
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: cleanEmail,
        phone: storedPhone,
        inquiry_type: inquiryType || null,
        message: message.trim(),
        whatsapp_consent: consented,
        consent_recorded_at: consented ? nowIso : null,
        consent_text: consented ? WHATSAPP_CONSENT_TEXT : null,
      })
      .select('id')
      .single()

    if (insertErr) {
      // Fallback insert without migration 006 columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const retryRes = await (supabase.from('contact_submissions') as any)
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: cleanEmail,
          phone: storedPhone,
          inquiry_type: inquiryType || null,
          message: message.trim(),
        })
        .select('id')
        .single()
      submission = retryRes.data
    }

    // Register website lead + immutable Kenya DPA consent record in Outreach Supabase (supports separate 2nd Supabase project)
    if (normalizedPhone && hasOutreachSupabaseConfig()) {
      ;(async () => {
        const outreachDb = createOutreachAdminClient()
        const suppressed = await isSuppressed(outreachDb, {
          email: cleanEmail,
          phoneE164: normalizedPhone,
        })
        if (suppressed) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingLead } = await (outreachDb.from('outreach_leads') as any)
          .select('id, whatsapp_opted_in')
          .eq('phone_e164', normalizedPhone)
          .maybeSingle()

        let leadId: string | null = existingLead?.id || null
        if (!leadId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: created } = await (outreachDb.from('outreach_leads') as any)
            .insert({
              business_name: fullName,
              category: 'website_inquiry',
              email: cleanEmail,
              phone_e164: normalizedPhone,
              source: 'website_form',
              source_details: {
                contact_submission_id: submission?.id || null,
                inquiry_type: inquiryType || null,
              },
              status: 'new',
              business_summary: message.trim().slice(0, 400),
              whatsapp_opted_in: consented,
            })
            .select('id')
            .single()
          leadId = created?.id || null
        } else if (consented && !existingLead.whatsapp_opted_in) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (outreachDb.from('outreach_leads') as any)
            .update({ whatsapp_opted_in: true })
            .eq('id', leadId)
        }

        if (consented) {
          await recordConsent(outreachDb, {
            leadId,
            contactSubmissionId: submission?.id || null,
            email: cleanEmail,
            phoneE164: normalizedPhone,
            channel: 'whatsapp',
            action: 'opt_in',
            legalBasis: 'explicit_website_form_consent_kenya_dpa_2019',
            consentText: WHATSAPP_CONSENT_TEXT,
            source: 'batteriq_contact_form',
          })
        }
      })().catch((e) => console.error('[CONTACT] Outreach lead sync error:', e))
    }

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
