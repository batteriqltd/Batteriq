import { logOutreachEvent, withRetry } from './logger'
import { LEAD_STATUSES, type LeadStatus, type OutreachLead, type OutreachMessage } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const FALLBACK_GEMINI_MODEL = 'gemini-1.5-flash'
const REQUEST_TIMEOUT_MS = 35_000

export interface CatalogProductSummary {
  name: string
  brand: string
  category: string
  price_kes: number
  slug?: string
}

export interface GeneratedOutreachEmail {
  subject: string
  bodyText: string
  bodyHtmlParagraphs: string[]
  model: string
}

export interface GeneratedWhatsAppDecision {
  reply: string
  newStatus: LeadStatus
  wantsHuman: boolean
  isOptOut: boolean
  reasoning: string
  model: string
}

type ActiveAiConfig =
  | { provider: 'claude'; apiKey: string; model: string }
  | { provider: 'gemini'; apiKey: string; model: string }

function isRealKey(val: string | undefined): val is string {
  if (!val) return false
  const t = val.trim()
  return Boolean(t && t !== 'replace_me')
}

export function resolveOutreachAiConfig(): ActiveAiConfig {
  const forcedProvider = process.env.OUTREACH_AI_PROVIDER?.trim().toLowerCase()
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.OUTREACH_GEMINI_API_KEY || process.env.GEMINI_API_KEY

  if (forcedProvider === 'gemini' && isRealKey(geminiKey)) {
    return {
      provider: 'gemini',
      apiKey: geminiKey.trim(),
      model: process.env.OUTREACH_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    }
  }

  if (isRealKey(anthropicKey)) {
    return {
      provider: 'claude',
      apiKey: anthropicKey.trim(),
      model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
    }
  }

  if (isRealKey(geminiKey)) {
    return {
      provider: 'gemini',
      apiKey: geminiKey.trim(),
      model: process.env.OUTREACH_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    }
  }

  throw new Error(
    'Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured in environment variables'
  )
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFence) as Record<string, unknown>
  } catch {
    const firstBrace = withoutFence.indexOf('{')
    const lastBrace = withoutFence.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    }
    throw new Error('Claude did not return valid JSON output')
  }
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function callGeminiGenerateContent(params: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  fetchImpl?: typeof fetch
}): Promise<{ text: string; model: string }> {
  const fetchFn = params.fetchImpl ?? fetch
  const wantsJson = /JSON/i.test(params.systemPrompt)
  const modelsToTry =
    params.model === FALLBACK_GEMINI_MODEL
      ? [params.model]
      : [params.model, FALLBACK_GEMINI_MODEL]

  let activeModel = modelsToTry[0]

  const responseText = await withRetry(
    async () => {
      for (let i = 0; i < modelsToTry.length; i++) {
        activeModel = modelsToTry[i]
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        try {
          const url = `${GEMINI_API_BASE}/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(params.apiKey)}`
          const res = await fetchFn(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: params.systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: params.userPrompt }],
                },
              ],
              generationConfig: {
                temperature: params.temperature ?? 0.5,
                maxOutputTokens: params.maxTokens ?? 900,
                ...(wantsJson ? { responseMimeType: 'application/json' } : {}),
              },
            }),
            cache: 'no-store',
          })

          if (res.status === 404 && i < modelsToTry.length - 1) {
            continue
          }

          if (!res.ok) {
            const errBody = await res.text().catch(() => '')
            const err = new Error(
              `Gemini API error (HTTP ${res.status}): ${errBody.slice(0, 240)}`
            ) as Error & { status?: number }
            err.status = res.status
            throw err
          }

          const data = (await res.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> }
            }>
          }
          const textBlock = data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim()

          if (!textBlock) {
            throw new Error('Gemini API returned an empty candidate content block')
          }
          return textBlock
        } finally {
          clearTimeout(timer)
        }
      }
      throw new Error('No Gemini model succeeded')
    },
    {
      maxAttempts: 3,
      baseDelayMs: 900,
      onRetry: async (err, attempt, delayMs) => {
        await logOutreachEvent({
          module: 'email_campaign',
          level: 'warn',
          event: 'gemini_retry',
          message: `Retrying Gemini API call (attempt ${attempt}) after ${delayMs}ms`,
          metadata: { error: err instanceof Error ? err.message : String(err) },
        })
      },
    }
  )

  return { text: responseText, model: activeModel }
}

export async function callClaudeMessages(params: {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  fetchImpl?: typeof fetch
}): Promise<{ text: string; model: string }> {
  const aiConfig = resolveOutreachAiConfig()
  if (aiConfig.provider === 'gemini') {
    return callGeminiGenerateContent({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      ...params,
    })
  }

  const { apiKey, model } = aiConfig
  const fetchFn = params.fetchImpl ?? fetch

  const responseText = await withRetry(
    async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const res = await fetchFn(ANTHROPIC_API_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: params.maxTokens ?? 900,
            temperature: params.temperature ?? 0.5,
            system: params.systemPrompt,
            messages: [{ role: 'user', content: params.userPrompt }],
          }),
          cache: 'no-store',
        })

        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          const err = new Error(
            `Claude API error (HTTP ${res.status}): ${errBody.slice(0, 240)}`
          ) as Error & { status?: number }
          err.status = res.status
          throw err
        }

        const data = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>
        }
        const textBlock = data.content?.find((c) => c.type === 'text')?.text?.trim()
        if (!textBlock) {
          throw new Error('Claude API returned an empty message content block')
        }
        return textBlock
      } finally {
        clearTimeout(timer)
      }
    },
    {
      maxAttempts: 3,
      baseDelayMs: 900,
      onRetry: async (err, attempt, delayMs) => {
        await logOutreachEvent({
          module: 'email_campaign',
          level: 'warn',
          event: 'claude_retry',
          message: `Retrying Claude API call (attempt ${attempt}) after ${delayMs}ms`,
          metadata: { error: err instanceof Error ? err.message : String(err) },
        })
      },
    }
  )

  return { text: responseText, model }
}

function buildBatteriqCatalogSnippet(products: CatalogProductSummary[]): string {
  if (!products.length) {
    return [
      '- EcoFlow DELTA 2 (1024Wh LiFePO4, 1800W AC): Silent instant UPS backup for offices, Wi-Fi, POS, lighting & computers',
      '- EcoFlow DELTA 2 Max (2048Wh expandable to 6kWh, 2400W AC): Ideal for hotels, clinics, schools & server rooms',
      '- EcoFlow DELTA Pro (3600Wh expandable to 25kWh, 3600W AC): Commercial whole-facility backup & solar hybrid',
      '- BLUETTI AC200L / Commercial Backup Series: Heavy-duty lithium power stations + foldable/rooftop solar panels',
    ].join('\n')
  }

  return products
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.name} (${p.brand}, ${p.category}): KES ${Number(p.price_kes).toLocaleString('en-KE')}`
    )
    .join('\n')
}

/**
 * Uses Claude to write a bespoke B2B outreach email for a Kenyan business lead.
 */
export async function generateOutreachEmailWithClaude(params: {
  lead: Pick<
    OutreachLead,
    'business_name' | 'category' | 'city' | 'address' | 'website_url' | 'business_summary'
  >
  products?: CatalogProductSummary[]
  senderName: string
  fetchImpl?: typeof fetch
}): Promise<GeneratedOutreachEmail> {
  const { lead, products = [], senderName, fetchImpl } = params
  const catalogText = buildBatteriqCatalogSnippet(products)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com'

  const systemPrompt = `You are a senior B2B energy consultant at Batteriq Kenya (${siteUrl}) — Kenya's official authorised EcoFlow & BLUETTI commercial power backup and solar distributor based in Nairobi.
Tagline: "Guarantee your Uptime."

WHAT BATTERIQ DOES FOR KENYAN BUSINESSES:
- Eliminates KPLC blackout downtime silently, with zero diesel fumes, zero fuel theft, and <20ms automatic EPS/UPS switchover.
- Official 24-month to 5-year manufacturer warranty in Kenya, full KRA eTIMS VAT tax invoices for businesses, corporate M-Pesa / bank / card payment, and fast delivery across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret & nationwide.
- Category value propositions:
  * Hotels / Lodges / Resorts: Keep guest room power, Wi-Fi, reception, security & conference halls running silently without disturbing guests with noisy generators.
  * Schools / Colleges: Keep computer labs, smart boards, administration servers, CCTV & exam prep uninterrupted.
  * Organizations / Clinics / Offices / NGOs: Protect routers, servers, cold-chain equipment & workstations with instant switchover.
  * Shops / Supermarkets / Pharmacies: Keep POS systems, M-Pesa tills, lighting, CCTV & chillers online so you never lose a customer during an outage.

FEATURED IN-STOCK SOLUTIONS:
${catalogText}

WRITING RULES:
1. Write a warm, respectful, non-spammy B2B email specifically tailored to this Kenyan business's name, city, category, and website summary.
2. Keep it concise: 110–170 words total across 3–4 short paragraphs.
3. Recommend 1 or 2 relevant EcoFlow/BLUETTI models for their specific use case.
4. Invite them to reply directly to this email or ask for a tailored B2B quote / free load sizing call.
5. Sign off with "${senderName}". Do NOT add an unsubscribe link yourself (the system appends the compliant footer & one-click unsubscribe link automatically).
6. Return STRICT JSON ONLY with keys:
{
  "subject": "clear, natural B2B subject line under 65 chars (no ALL CAPS or spam emojis)",
  "paragraphs": ["Greeting + personalized opener...", "Specific backup value + model...", "CTA...", "Sign-off"]
}`

  const userPrompt = `Write a personalized outreach email for this Kenyan business:
- Business Name: ${lead.business_name}
- Category: ${lead.category}
- City / Location: ${lead.city || lead.address || 'Kenya'}
- Website: ${lead.website_url || 'N/A'}
- Website Summary: ${lead.business_summary || 'Kenyan business operating locally'}`

  const { text, model } = await callClaudeMessages({
    systemPrompt,
    userPrompt,
    maxTokens: 700,
    temperature: 0.6,
    fetchImpl,
  })

  const parsed = extractJsonObject(text)
  const subject = String(parsed.subject || '').trim()
  const rawParagraphs = Array.isArray(parsed.paragraphs)
    ? parsed.paragraphs.map((p) => String(p).trim()).filter(Boolean)
    : String(parsed.body || '')
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)

  if (!subject || rawParagraphs.length === 0) {
    throw new Error('Claude returned incomplete email subject or paragraphs')
  }

  return {
    subject: subject.slice(0, 140),
    bodyText: rawParagraphs.join('\n\n'),
    bodyHtmlParagraphs: rawParagraphs.map((p) => escapeHtml(p).replace(/\n/g, '<br/>')),
    model,
  }
}

/**
 * Deterministic safety signals for human escalation and opt-out detection.
 */
const HUMAN_REQUEST_RE =
  /\b(speak\s+to\s+(a\s+)?(human|person|agent|manager|someone|staff|rep|representative)|real\s+person|human\s+agent|talk\s+to\s+(a\s+)?person|call\s+me|can\s+someone\s+call|transfer\s+me)\b/i

const OPT_OUT_KEYWORD_RE =
  /^\s*(stop|unsubscribe|opt\s*out|remove\s+me|do\s+not\s+contact|don'?t\s+message)\s*[.!]?\s*$/i

export function detectDeterministicOptOut(message: string): boolean {
  if (OPT_OUT_KEYWORD_RE.test(message)) return true
  return /\b(stop\s+messaging\s+me|remove\s+my\s+number|unsubscribe\s+me|opt\s+me\s+out)\b/i.test(
    message
  )
}

export function detectDeterministicHumanRequest(message: string): boolean {
  return HUMAN_REQUEST_RE.test(message)
}

/**
 * Uses Claude to reply to an inbound WhatsApp message in AI Takeover mode,
 * classify updated lead status, and detect hot leads / human handoff requests.
 */
export async function generateWhatsAppAiReplyWithClaude(params: {
  lead: Partial<OutreachLead> | null
  history: Pick<OutreachMessage, 'direction' | 'sender_type' | 'body' | 'created_at'>[]
  inboundMessage: string
  products?: CatalogProductSummary[]
  fetchImpl?: typeof fetch
}): Promise<GeneratedWhatsAppDecision> {
  const { lead, history, inboundMessage, products = [], fetchImpl } = params
  const catalogText = buildBatteriqCatalogSnippet(products)

  const deterministicOptOut = detectDeterministicOptOut(inboundMessage)
  if (deterministicOptOut) {
    return {
      reply:
        'You have been unsubscribed from Batteriq messages and your contact has been added to our permanent opt-out list. Thank you.',
      newStatus: 'opted_out',
      wantsHuman: false,
      isOptOut: true,
      reasoning: 'Customer sent explicit opt-out keyword',
      model: 'deterministic-dpa-guard',
    }
  }

  const deterministicHuman = detectDeterministicHumanRequest(inboundMessage)

  const transcript = history
    .slice(-14)
    .map((m) => {
      const speaker =
        m.direction === 'inbound' ? 'Customer' : m.sender_type === 'human' ? 'Batteriq Staff' : 'Batteriq AI'
      return `${speaker}: ${m.body}`
    })
    .join('\n')

  const systemPrompt = `You are Batteriq Kenya's AI WhatsApp Sales & Support Specialist (batteriq.com — authorised EcoFlow & BLUETTI distributor in Nairobi, Kenya).

AVAILABLE PRODUCTS & PRICING (KES):
${catalogText}

KEY FACTS:
- KRA eTIMS VAT invoices provided for all business & personal purchases.
- Payment via M-Pesa, Visa/Mastercard, or corporate invoice/bank transfer.
- Same-day delivery in Nairobi; 24–48hr insured delivery across Kenya.
- Official 24-month+ manufacturer warranty.

LEAD STATUS DEFINITIONS (pick the most accurate status based on the conversation):
- "new": No meaningful engagement yet
- "contacted": Outreach sent, no real reply yet
- "replied": Customer replied with general acknowledgment or basic question
- "interested": Customer is asking about products, specs, sizing, or use-case fit
- "hot": High buying intent — asking for formal quote/proforma invoice, bulk pricing, payment steps, site visit, delivery timeline to buy, or ready to order!
- "customer": Already confirmed purchase
- "opted_out": Asked to stop messages / unsubscribe / not be contacted again

ESCALATION RULES:
- Set "wantsHuman": true if the customer asks to speak to a human/person/agent/manager, asks for a phone call, or has a complex custom negotiation.
- If "newStatus" is "hot" OR "wantsHuman" is true, write a warm, helpful reply that answers their immediate question AND lets them know you are connecting a senior Batteriq specialist to assist them directly right now.
- Keep WhatsApp replies natural, friendly, concise (under 95 words), formatted cleanly for WhatsApp.

Return STRICT JSON ONLY:
{
  "reply": "WhatsApp reply text",
  "newStatus": "replied" | "interested" | "hot" | "customer" | "opted_out",
  "wantsHuman": boolean,
  "isOptOut": boolean,
  "reasoning": "1 short sentence explaining status choice"
}`

  const userPrompt = `LEAD CONTEXT:
- Business: ${lead?.business_name || 'WhatsApp Contact'}
- Category: ${lead?.category || 'unknown'}
- City: ${lead?.city || 'Kenya'}
- Current Lead Status: ${lead?.status || 'replied'}
- Summary: ${lead?.business_summary || 'N/A'}

RECENT CONVERSATION HISTORY:
${transcript || '(Start of conversation)'}

LATEST INBOUND CUSTOMER MESSAGE:
Customer: ${inboundMessage}`

  const { text, model } = await callClaudeMessages({
    systemPrompt,
    userPrompt,
    maxTokens: 550,
    temperature: 0.4,
    fetchImpl,
  })

  const parsed = extractJsonObject(text)
  const reply =
    String(parsed.reply || '').trim() ||
    'Thank you for messaging Batteriq Kenya! A member of our team is reviewing your inquiry and will assist you shortly.'

  const rawStatus = String(parsed.newStatus || 'replied')
    .trim()
    .toLowerCase() as LeadStatus

  let newStatus: LeadStatus = (LEAD_STATUSES as readonly string[]).includes(rawStatus)
    ? rawStatus
    : 'replied'

  const isOptOut = Boolean(parsed.isOptOut) || newStatus === 'opted_out'
  if (isOptOut) {
    newStatus = 'opted_out'
  } else if (lead?.status === 'customer') {
    // Never downgrade an existing paying customer
    newStatus = 'customer'
  }

  const wantsHuman = Boolean(parsed.wantsHuman) || deterministicHuman

  return {
    reply,
    newStatus,
    wantsHuman,
    isOptOut,
    reasoning: String(parsed.reasoning || '').slice(0, 300),
    model,
  }
}
