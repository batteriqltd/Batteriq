import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// No external AI services — every answer below comes from our own catalogue
// (Supabase, with a built-in fallback) plus the rule-based intents above.
type CatalogHit = {
  name: string
  brand: string
  slug: string
  category: string
  price_kes: number
  specs: Record<string, string>
}

const FALLBACK_HITS: CatalogHit[] = [
  {
    name: 'EcoFlow DELTA 3 Max',
    brand: 'EcoFlow',
    slug: 'delta-3-max',
    category: 'Power Stations',
    price_kes: 148199,
    specs: { capacity: '2048Wh', ac_output: '2400W (Surge 5000W)', solar_input: '1000W Max' },
  },
  {
    name: 'EcoFlow DELTA 3 2000 Air',
    brand: 'EcoFlow',
    slug: 'delta-3-2000-air',
    category: 'Power Stations',
    price_kes: 106725,
    specs: { capacity: '1920Wh', ac_output: '1000W (Surge 2000W)', ups_mode: '10ms switchover' },
  },
]

const STOPWORDS = new Set(
  'price,cost,how,much,does,do,what,is,the,for,have,you,got,any,with,need,want,buy,kenya,my,me,i,a,an,in,on,of,to,and,or,hi,hello,hey,kes,shillings,pls,please,there,here,that,this,it'.split(',')
)

function productLink(p: CatalogHit): string {
  const base = p.brand === 'EcoFlow' ? 'ecoflow' : p.brand === 'Bluetti' ? 'bluetti' : 'accessories'
  return `https://batteriq.com/${base}/${p.slug}`
}

function scoreHit(p: CatalogHit, tokens: string[]): number {
  const hay = `${p.brand} ${p.name} ${p.slug} ${p.category} ${Object.values(p.specs ?? {}).join(' ')}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
  const nameHay = `${p.brand} ${p.name} ${p.slug}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  let score = 0
  for (const t of tokens) {
    if (t.length < 2 || STOPWORDS.has(t)) continue
    if (hay.includes(t)) score += t.length >= 4 ? 2 : 1
    if (nameHay.includes(t)) score += 2
  }
  return score
}

async function searchCatalogReply(message: string): Promise<string | null> {
  let catalog: CatalogHit[]
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('name, brand, slug, category, price_kes, specs')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true })
      .limit(100)
    const live = (data ?? []) as unknown as CatalogHit[]
    const seen = new Set(live.map((p) => p.slug))
    catalog = [...live, ...FALLBACK_HITS.filter((p) => !seen.has(p.slug))]
  } catch {
    catalog = FALLBACK_HITS
  }

  if (catalog.length === 0) return null

  const m = message.toLowerCase()
  const tokens = m.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  const scored = catalog
    .map((p) => ({ p, score: scoreHit(p, tokens) }))
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)

  if (scored.length >= 1 && (scored.length === 1 || scored[0].score > scored[1].score + 1)) {
    const p = scored[0].p
    const specs = ['capacity', 'ac_output', 'solar_input']
      .map((k) => p.specs?.[k])
      .filter(Boolean)
      .slice(0, 3)
      .join(', ')
    return `The ${p.name} (${specs}) is KES ${p.price_kes.toLocaleString('en-KE')} — in stock now. See it here: ${productLink(p)} — or reply and I'll help you choose.`
  }

  if (scored.length > 1) {
    const lines = scored
      .slice(0, 4)
      .map((s, i) => `${i + 1}. ${s.p.name} — KES ${s.p.price_kes.toLocaleString('en-KE')}`)
    return `I found a few matches:\n${lines.join('\n')}\nWhich one would you like details on?`
  }

  if (/solar/.test(m)) {
    const panels = catalog.filter((p) => p.category === 'Solar Panels').slice(0, 5)
    if (panels.length > 0) {
      return `Solar panels in stock:\n${panels.map((p) => `- ${p.name} — KES ${p.price_kes.toLocaleString('en-KE')}`).join('\n')}\nWant a recommendation for your power station?`
    }
  }

  return null
}

function getRuleBasedResponse(message: string): string | null {
  const m = message.toLowerCase().trim()

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy|hiya|sup)\b/.test(m)) {
    return "Hi there! 👋 I'm the Batteriq AI assistant. I can help you find the right EcoFlow or Bluetti power station, answer questions about M-Pesa payment, delivery, or warranty. What are you looking for today?"
  }

  if (/delta pro\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'The EcoFlow DELTA Pro (3600Wh, 3600W) is KES 291,399, and the DELTA Pro 3 (4096Wh, 4000W) is KES 461,799. Both include the official 24-month EcoFlow warranty. Would you like more specs or to add one to your cart?'
  }

  if (/delta 2\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'The EcoFlow DELTA 2 (1024Wh, 1800W) starts from KES 85,539, and the DELTA 2 Max (2048Wh, 2400W) is KES 157,799. Both support fast solar charging. Want me to compare them for you?'
  }

  if (/river\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'EcoFlow RIVER 2 starts from KES 27,259 — perfect for laptops, phones, and small appliances. The RIVER 2 Pro (768Wh) is KES 59,049. Great for camping or as a laptop power bank. Want the full RIVER range?'
  }

  if (/mpesa|m-pesa|mpesa|pay|payment|checkout/.test(m)) {
    return 'Yes! Batteriq supports instant M-Pesa STK Push checkout. At checkout, enter your Safaricom number and you\'ll receive a payment prompt on your phone — confirm with your PIN and payment is instant. We also offer Cash on Delivery and M-Pesa on Delivery.'
  }

  if (/deliver|shipping|nairobi|ship|how long/.test(m)) {
    return 'We offer same-day and next-day delivery within Nairobi for orders placed before 12pm. Nationwide shipping across Kenya typically takes 2–5 business days. Delivery is FREE on orders over KES 50,000.'
  }

  if (/warranty|guarantee|genuine|fake|original/.test(m)) {
    return 'All EcoFlow products from Batteriq come with the official manufacturer warranty — 24 months for power stations and 12 months for accessories. Batteriq is EcoFlow\'s authorised distributor in Kenya, so every product is 100% genuine.'
  }

  if (/solar panel|solar/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'EcoFlow solar panels start from KES 7,599 for the 45W portable panel, up to KES 71,240 for the 400W portable panel. All panels are IP68 waterproof and compatible with any EcoFlow power station. Want a recommendation based on your power needs?'
  }

  if (/bluetti/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'Bluetti AC180P (1440Wh, 1800W) is KES 76,000, and the AC200PL (2304Wh, 2400W) is KES 127,500. Great alternatives to EcoFlow for home backup. Want a comparison with EcoFlow models?'
  }

  if (/bulk|wholesale|reseller|dealer price|retail price|best price|quotation|quote/.test(m)) {
    return 'Yes! For bulk, wholesale, or reseller pricing, chat to us directly on WhatsApp and we\'ll send our best quote: https://wa.me/254716822014 — just send the models and quantities you need. We reply within business hours (Mon–Sat, 8am–6pm EAT).'
  }

  if (/recommend|best|which one|suggest|advise|help me choose/.test(m)) {
    return 'Happy to help! Could you tell me: (1) what you want to power (fridge, TV, laptop?), (2) how many hours of backup you need, and (3) your rough budget? That way I can recommend the perfect power station for you.'
  }

  if (/contact|whatsapp|call|phone|reach you/.test(m)) {
    return 'You can reach the Batteriq team via WhatsApp (0716822014), email (info@batteriq.com), or our contact page at batteriq.com/contact. We typically respond within a few hours during business hours (Mon–Sat, 8am–6pm EAT).'
  }

  if (/track|order status|where is my order/.test(m)) {
    return 'You can track your order at batteriq.com/track-order — just enter your order number and email address. If you need urgent help, WhatsApp us directly and we\'ll check your order status immediately.'
  }

  return null
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ reply: 'Please type a message.' }, { status: 400 })
    }

    const ruleReply = getRuleBasedResponse(message)
    if (ruleReply) {
      return NextResponse.json({ reply: ruleReply })
    }

    const catalogReply = await searchCatalogReply(message)
    if (catalogReply) {
      return NextResponse.json({ reply: catalogReply })
    }

    return NextResponse.json({
      reply: 'I can help with product prices and specs, M-Pesa payment, delivery, warranty, order tracking, or bulk quotes — what are you looking for? You can also WhatsApp us on 0716822014 for instant help.',
    })
  } catch {
    return NextResponse.json({
      reply: 'I had a hiccup. Try asking again or WhatsApp us directly on 0716822014 for help.',
    })
  }
}
