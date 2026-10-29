import { logOutreachEvent, withRetry } from './logger'
import { LEAD_STATUSES, type LeadStatus, type OutreachLead, type OutreachMessage } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash'
const FALLBACK_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
]
const REQUEST_TIMEOUT_MS = 35_000

export interface CatalogProductSummary {
  name: string
  brand: string
  category: string
  price_kes: number
  slug?: string
}

export interface ProformaPromptContext {
  proformaNumber: string
  systemTitle: string
  totalKes: number
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
    'Neither ANTHROPIC_API_KEY nor OUTREACH_GEMINI_API_KEY / GEMINI_API_KEY is configured in environment variables'
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
    throw new Error('AI model did not return valid JSON output')
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
  const modelsToTry = Array.from(new Set([params.model, ...FALLBACK_GEMINI_MODELS]))

  let activeModel = modelsToTry[0]

  const responseText = await withRetry(
    async () => {
      for (let i = 0; i < modelsToTry.length; i++) {
        activeModel = modelsToTry[i]
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        const supportsZeroThinkingBudget =
          /^gemini-3/i.test(activeModel) && !activeModel.toLowerCase().includes('lite')

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
                maxOutputTokens: Math.max(1200, params.maxTokens ?? 1200),
                ...(wantsJson ? { responseMimeType: 'application/json' } : {}),
                ...(supportsZeroThinkingBudget
                  ? { thinkingConfig: { thinkingBudget: 0 } }
                  : {}),
              },
            }),
            cache: 'no-store',
          })

          if ((res.status === 404 || res.status === 400) && i < modelsToTry.length - 1) {
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
              content?: { parts?: Array<{ text?: string; thought?: boolean }> }
            }>
          }
          const textBlock = data.candidates?.[0]?.content?.parts
            ?.filter((p) => !p.thought)
            .map((p) => p.text || '')
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
      '- EcoFlow RIVER 2 Pro / DELTA 2 (1024Wh LiFePO4, 1800W AC): Silent instant <20ms UPS backup for retail shops, baby shops, POS tills, Wi-Fi, lighting & CCTV',
      '- EcoFlow DELTA 2 Max (2048Wh expandable to 6kWh, 2400W AC): Ideal for schools, NGO offices, clinics, pharmacies & server rooms',
      '- EcoFlow DELTA Pro (3600Wh expandable to 25kWh, 3600W AC): Institutional whole-facility backup & solar hybrid for hospitals, parastatals, universities & hotels',
      '- BLUETTI AC200L / Commercial Backup Series + Solar Panels: Heavy-duty lithium power stations with official Kenya warranty & KRA eTIMS VAT invoicing',
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

function buildSmartTailoredOutreachEmail(params: {
  lead: Pick<
    OutreachLead,
    'business_name' | 'category' | 'city' | 'address' | 'website_url' | 'business_summary'
  >
  products?: CatalogProductSummary[]
  senderName: string
  proforma?: ProformaPromptContext | null
}): GeneratedOutreachEmail {
  const { lead, products = [], senderName, proforma } = params
  const city = lead.city || 'Kenya'
  const featured =
    products.find((p) => /delta\s*(pro|3\s*max|3\s*ultra|2\s*max)|ac200/i.test(p.name)) ||
    products[0]
  const featuredLine = featured
    ? `${featured.name} (KES ${Number(featured.price_kes).toLocaleString('en-KE')})`
    : 'EcoFlow DELTA & BLUETTI commercial LiFePO4 backup series'

  const sectorInfo: Record<string, { noun: string; benefit: string }> = {
    hotel: {
      noun: 'hotels, lodges, and conference venues',
      benefit:
        'keep guest rooms, reception, Wi-Fi, security, and conference halls running silently during KPLC outages — with zero diesel fumes, zero generator noise, and <20ms automatic switchover',
    },
    school: {
      noun: 'schools, colleges, and universities',
      benefit:
        'keep ICT labs, smart classrooms, administration servers, Wi-Fi, and CCTV online continuously during KPLC outages — silently and with zero fuel maintenance',
    },
    ngo: {
      noun: 'NGOs, foundations, and humanitarian programmes',
      benefit:
        'keep field offices, communications routers, laptops, cold-chain units, and operations running reliably with portable solar-ready LiFePO4 backup and zero diesel logistics',
    },
    government: {
      noun: 'government agencies, county offices, and parastatals',
      benefit:
        'maintain uninterrupted public service delivery across ICT registries, servers, customer desks, and security systems with <20ms UPS switchover, LPO/procurement documentation, and KRA eTIMS VAT compliance',
    },
    hospital: {
      noun: 'hospitals, medical clinics, and pharmacies',
      benefit:
        'protect vaccine and medicine cold-chain fridges, diagnostic lab equipment, patient monitors, lighting, and HMIS computers with instant zero-fume lithium backup',
    },
    retail: {
      noun: 'retail stores, baby shops, boutiques, and commercial outlets',
      benefit:
        'keep your POS terminals, M-Pesa tills, warm store lighting, barcode scanners, and CCTV online without interruption so customers continue shopping comfortably even during KPLC blackouts',
    },
    shop: {
      noun: 'retailers, stores, and commercial shops',
      benefit:
        'keep your POS terminals, M-Pesa tills, store lighting, CCTV, and display equipment online seamlessly whenever KPLC power drops',
    },
  }

  const chosen = sectorInfo[lead.category] || {
    noun: 'Kenyan organizations and institutions',
    benefit:
      'protect servers, routers, workstations, and critical facility equipment with silent <20ms automatic UPS switchover and zero diesel maintenance',
  }

  const subject = proforma
    ? `Backup Power Proposal & Proforma (${proforma.proformaNumber}) — ${lead.business_name}`.slice(0, 78)
    : `Silent backup power for ${lead.business_name}`.slice(0, 68)

  const proformaParagraph = proforma
    ? `For your convenience, we have attached a tailored Proforma Invoice (${proforma.proformaNumber}) for our recommended ${proforma.systemTitle} package (KES ${proforma.totalKes.toLocaleString('en-KE')} inclusive of 24-month local warranty and KRA eTIMS VAT invoice), which we can adjust to match your exact load requirements.`
    : `Many Kenyan institutions start with our ${featuredLine}, backed by an official 24-month local manufacturer warranty, full KRA eTIMS VAT tax invoicing, and fast nationwide delivery.`

  const paragraphs = [
    `Hello ${lead.business_name} Team,`,
    `We noticed your work in ${city} and wanted to share how Batteriq Kenya — Kenya's official authorised EcoFlow & BLUETTI commercial power partner — helps ${chosen.noun} ${chosen.benefit}.`,
    proformaParagraph,
    `Would you like us to customize the unit quantities, arrange a quick load-sizing check, or process an LPO / corporate order for ${lead.business_name}? Simply reply directly to this email and our commercial team will assist right away.`,
    `Warm regards,\n${senderName}`,
  ]

  return {
    subject,
    bodyText: paragraphs.join('\n\n'),
    bodyHtmlParagraphs: paragraphs.map((p) => escapeHtml(p).replace(/\n/g, '<br/>')),
    model: 'batteriq-smart-b2b-copywriter',
  }
}

/**
 * Uses Google Gemini 3.5 Flash (or Claude) to write a bespoke outreach email for any Kenyan
 * institution or business — schools, NGOs, government parastatals, hospitals, retail/baby shops,
 * hotels, and corporate organizations — optionally referencing an attached KES Proforma Invoice.
 */
export async function generateOutreachEmailWithClaude(params: {
  lead: Pick<
    OutreachLead,
    'business_name' | 'category' | 'city' | 'address' | 'website_url' | 'business_summary'
  >
  products?: CatalogProductSummary[]
  senderName: string
  proforma?: ProformaPromptContext | null
  fetchImpl?: typeof fetch
}): Promise<GeneratedOutreachEmail> {
  const { lead, products = [], senderName, proforma, fetchImpl } = params
  const catalogText = buildBatteriqCatalogSnippet(products)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com'

  const systemPrompt = `You are a senior B2B & Institutional Energy Consultant at Batteriq Kenya (${siteUrl}) — Kenya's official authorised EcoFlow & BLUETTI commercial power backup and solar distributor based in Nairobi.
Tagline: "Guarantee your Uptime."

WHAT BATTERIQ DOES FOR KENYAN ORGANIZATIONS & SHOPS:
- Eliminates KPLC blackout downtime silently, with zero diesel fumes, zero generator noise, zero fuel theft, and <20ms automatic EPS/UPS switchover.
- Official 24-month to 5-year manufacturer warranty in Kenya, full KRA eTIMS VAT tax invoices, LPO / institutional procurement support, M-Pesa / bank / card payment, and fast delivery across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret & nationwide.
- Sector-specific value propositions:
  * Schools / Colleges / Universities: Keep ICT labs, smart classrooms, administration servers, Wi-Fi, CCTV & exam preparation uninterrupted.
  * NGOs / Foundations / Humanitarian Agencies: Reliable clean LiFePO4 + solar backup for headquarters & field offices, routers, laptops & cold-chain without diesel logistics.
  * Government Ministries / Parastatals (.go.ke) / County Offices: Keep citizen service desks, ICT registries, servers & security systems running with full KRA eTIMS tax compliance and formal proforma/LPO documentation.
  * Hospitals / Clinics / Pharmacies: Protect vaccine & medicine cold-chain fridges, lab diagnostics, patient monitors & HMIS workstations with zero fumes.
  * Retail & Everyday Shops (e.g. Baby Shops like Nila Baby Shop, Boutiques, Supermarkets, Electronics, Hardware): Keep POS tills, M-Pesa payments, warm inviting shop lighting, barcode scanners & CCTV running so parents and shoppers never walk out during a blackout.
  * Hotels / Lodges / Resorts: Keep guest rooms, Wi-Fi, reception & conference halls powered silently without noisy generators.

FEATURED IN-STOCK SOLUTIONS:
${catalogText}

WRITING RULES:
1. Write a warm, respectful, executive outreach email specifically tailored to this Kenyan entity's name, sector, city, and website summary.
2. Keep it concise: 115–175 words total across 3–4 short paragraphs.
3. ${
    proforma
      ? `Explicitly mention that we have attached a tailored Batteriq Proforma Quotation (${proforma.proformaNumber}) for the ${proforma.systemTitle} (KES ${proforma.totalKes.toLocaleString('en-KE')}) matched to their operations, and let them know we can adjust quantities or capacity anytime.`
      : 'Recommend 1 or 2 relevant EcoFlow/BLUETTI models for their specific sector use case.'
  }
4. Invite them to reply directly to confirm, request adjustments to the proforma/LPO, or book a free 5-minute load-sizing check.
5. Sign off with "${senderName}". Do NOT add an unsubscribe link yourself (the system appends the compliant footer & one-click unsubscribe link automatically).
6. Return STRICT JSON ONLY with keys:
{
  "subject": "clear, natural B2B subject line under 72 chars (no ALL CAPS or spam emojis)",
  "paragraphs": ["Greeting + personalized opener...", "Specific backup value + proforma/model...", "CTA...", "Sign-off"]
}`

  const userPrompt = `Write a personalized outreach email for this Kenyan client:
- Entity Name: ${lead.business_name}
- Sector / Category: ${lead.category}
- City / Location: ${lead.city || lead.address || 'Kenya'}
- Website: ${lead.website_url || 'N/A'}
- Website Summary: ${lead.business_summary || 'Operating in Kenya'}${
    proforma
      ? `\n- Attached Proforma Invoice: #${proforma.proformaNumber} — ${proforma.systemTitle} — Total KES ${proforma.totalKes.toLocaleString('en-KE')}`
      : ''
  }`

  try {
    const { text, model } = await callClaudeMessages({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.55,
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
      throw new Error('AI returned incomplete email subject or paragraphs')
    }

    return {
      subject: subject.slice(0, 140),
      bodyText: rawParagraphs.join('\n\n'),
      bodyHtmlParagraphs: rawParagraphs.map((p) => escapeHtml(p).replace(/\n/g, '<br/>')),
      model,
    }
  } catch (err) {
    if (fetchImpl) throw err
    await logOutreachEvent({
      module: 'email_campaign',
      level: 'warn',
      event: 'ai_fallback_copywriter_used',
      message: `Used smart B2B copywriter fallback because external AI API returned: ${
        err instanceof Error ? err.message : String(err)
      }`,
    }).catch(() => {})
    return buildSmartTailoredOutreachEmail({ lead, products, senderName, proforma })
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
 * Uses Gemini 3.5 Flash / Claude to reply to an inbound WhatsApp message in AI Takeover mode,
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

  const systemPrompt = `You are Batteriq Kenya's AI WhatsApp Sales & Institutional Specialist (batteriq.com — authorised EcoFlow & BLUETTI distributor in Nairobi, Kenya).

AVAILABLE PRODUCTS & PRICING (KES):
${catalogText}

KEY FACTS:
- Official KRA eTIMS VAT invoices & Proforma Invoices / LPO support provided for all businesses, schools, NGOs, parastatals, clinics & retail shops.
- Payment via M-Pesa, Visa/Mastercard, or corporate invoice/bank transfer.
- Same-day delivery in Nairobi; 24–48hr insured delivery across Kenya.
- Official 24-month+ manufacturer warranty.

LEAD STATUS DEFINITIONS (pick the most accurate status based on the conversation):
- "new": No meaningful engagement yet
- "contacted": Outreach sent, no real reply yet
- "replied": Customer replied with general acknowledgment or basic question
- "interested": Customer is asking about products, specs, sizing, or use-case fit
- "hot": High buying intent — asking for formal quote/proforma invoice, LPO, bulk pricing, payment steps, site visit, delivery timeline to buy, or ready to order!
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

  try {
    const { text, model } = await callClaudeMessages({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
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
  } catch (err) {
    if (fetchImpl) throw err

    const isHotIntent =
      /\b(quote|quotation|proforma|invoice|lpo|buy|order|purchase|bulk|units?|price\s+list|pay|mpesa|m-pesa|site\s+visit|deliver)\b/i.test(
        inboundMessage
      )
    const isProductQuestion =
      /\b(delta|ecoflow|bluetti|solar|backup|kwh|watt|price|cost|how\s+much|spec|warranty)\b/i.test(
        inboundMessage
      )
    let fallbackStatus: LeadStatus = isHotIntent
      ? 'hot'
      : isProductQuestion
        ? 'interested'
        : 'replied'
    if (lead?.status === 'customer') fallbackStatus = 'customer'

    const reply =
      deterministicHuman || isHotIntent
        ? `Thank you for reaching out to Batteriq Kenya! We provide authorised EcoFlow & BLUETTI commercial backup systems with full KRA eTIMS VAT invoicing and 24-month local warranty. I am connecting a senior Batteriq specialist to assist you with your request right now.`
        : `Hello from Batteriq Kenya! Our commercial EcoFlow DELTA & BLUETTI LiFePO4 backup systems eliminate KPLC outage downtime silently (<20ms switchover, 24-month warranty, KRA eTIMS VAT invoice). Tell us which equipment or rooms you want to back up—or reply QUOTE to connect with a specialist.`

    return {
      reply,
      newStatus: fallbackStatus,
      wantsHuman: deterministicHuman || isHotIntent,
      isOptOut: false,
      reasoning: 'Smart fallback WhatsApp classifier used while external AI key is inactive',
      model: 'batteriq-smart-wa-assistant',
    }
  }
}
