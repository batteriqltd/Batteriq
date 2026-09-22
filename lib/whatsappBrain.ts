import { createAdminClient } from '@/lib/supabase/admin'
import { formatKES } from '@/lib/utils'

type CatalogProduct = {
  name: string
  brand: string
  slug: string
  category: string
  price_kes: number
  in_stock: boolean
  specs: Record<string, string>
  description: string | null
}

// Built-in knowledge so the bot answers even if the database is unreachable.
// Source of truth lives in Supabase (DELTA_3_NEW_ARRIVALS.sql) — the live
// catalogue below always wins when a row exists.
const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    name: 'EcoFlow DELTA 3 Max',
    brand: 'EcoFlow',
    slug: 'delta-3-max',
    category: 'Power Stations',
    price_kes: 148199,
    in_stock: true,
    specs: { capacity: '2048Wh', ac_output: '2400W (Surge 5000W)', solar_input: '1000W Max' },
    description: '2048Wh LFP, 2400W AC output, app control.',
  },
  {
    name: 'EcoFlow DELTA 3 2000 Air',
    brand: 'EcoFlow',
    slug: 'delta-3-2000-air',
    category: 'Power Stations',
    price_kes: 106725,
    in_stock: true,
    specs: { capacity: '1920Wh', ac_output: '1000W (Surge 2000W)', ups_mode: '10ms switchover' },
    description: '1920Wh LFP, 1000W output, 10ms UPS.',
  },
]

const STOPWORDS = new Set(
  'price,cost,how,much,does,do,what,is,the,for,have,you,got,any,with,need,want,buy,kenya,my,me,i,a,an,in,on,of,to,and,or,hi,hello,hey,kes,shillings,doesnt,pls,please,there,here,that,this,it,its,does,or'.split(',')
)

async function loadCatalog(): Promise<CatalogProduct[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('name, brand, slug, category, price_kes, in_stock, specs, description')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true })
      .limit(100)
    const live = (data ?? []) as unknown as CatalogProduct[]
    const seen = new Set(live.map((p) => p.slug))
    return [...live, ...FALLBACK_PRODUCTS.filter((p) => !seen.has(p.slug))]
  } catch {
    return FALLBACK_PRODUCTS
  }
}

function productUrl(p: CatalogProduct): string {
  const base = p.brand === 'EcoFlow' ? 'ecoflow' : p.brand === 'Bluetti' ? 'bluetti' : 'accessories'
  return `https://batteriq.com/${base}/${p.slug}`
}

function keySpecs(p: CatalogProduct): string {
  const s = p.specs ?? {}
  const pick = ['capacity', 'ac_output', 'solar_input'].map((k) => s[k]).filter(Boolean)
  return pick.slice(0, 3).join(' · ')
}

function priceCard(p: CatalogProduct): string {
  const specs = keySpecs(p)
  return `*${p.name}*\n${formatKES(p.price_kes)}${specs ? ` — ${specs}` : ''}\n${productUrl(p)}`
}

function scoreProduct(p: CatalogProduct, tokens: string[]): number {
  const hay = `${p.brand} ${p.name} ${p.slug} ${p.category} ${Object.values(p.specs ?? {}).join(' ')}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
  const nameHay = `${p.brand} ${p.name} ${p.slug}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  let score = 0
  for (const t of tokens) {
    if (t.length < 2 || STOPWORDS.has(t)) continue
    if (hay.includes(t)) score += t.length >= 4 ? 2 : 1
    // Name/slug hits mean the customer named the product — weigh them up.
    if (nameHay.includes(t)) score += 2
  }
  return score
}

function listProducts(products: CatalogProduct[], title: string, limit = 6): string {
  const items = products.slice(0, limit)
  if (items.length === 0) return ''
  const lines = items.map((p, i) => `${i + 1}. ${p.name} — ${formatKES(p.price_kes)}`)
  return `${title}\n${lines.join('\n')}\n\nReply with the product name for full details.`
}

const MENU =
  'Welcome to *Batteriq* — Kenya\'s authorised EcoFlow & Bluetti dealer. 🇰🇪\nWhat can I do for you?\n- Ask any product price (e.g. "Delta 3 Max price")\n- "Solar panels" for the solar range\n- "Delivery", "M-Pesa", "Warranty" for the basics\n- "Bulk" for wholesale quotes'

export async function answerWhatsAppQuestion(rawMessage: string): Promise<string> {
  const m = rawMessage.toLowerCase().trim()
  if (!m) return MENU

  if (/human|agent|real person|someone|call me|talk to|customer care|support/i.test(rawMessage)) {
    return 'A teammate will pick this chat up shortly. 🙏 Meanwhile, tell me what you need — I can share prices, specs, delivery and payment info right away.'
  }

  if (/deliver|shipping|ship\b|nairobi|how long|arrive|dispatch|county|counties/i.test(rawMessage)) {
    return 'We deliver *same-day in Nairobi* (order before 12pm) and *2–5 days nationwide* across all 47 counties. Delivery is *FREE* on orders over KES 50,000.'
  }

  if (/mpesa|m-pesa|m pesa|pay|payment|checkout|card\b|visa|cash on delivery|\bcod\b/i.test(rawMessage)) {
    return 'Pay your way: *M-Pesa STK Push* (instant prompt on your phone), *Visa/Mastercard* via Pesapal, or *Cash/M-Pesa on Delivery*. Every order gets an official eTIMS invoice.'
  }

  if (/warranty|guarantee|genuine|original|fake|authorised|authorized/i.test(rawMessage)) {
    return 'Every unit is *100% genuine* with the official manufacturer warranty — *24 months* on power stations. Batteriq is the authorised EcoFlow & Bluetti distributor in Kenya.'
  }

  if (/track|order status|where.*order|order number|\bBQ-/i.test(rawMessage)) {
    return 'Track your order here: https://batteriq.com/track-order — enter your order number and email. For urgent help, just send your order number in this chat.'
  }

  if (/bulk|wholesale|reseller|dealer|quotation|\bquote\b/i.test(rawMessage)) {
    return 'You\'re in the right place. 👌 Send the *models + quantities* you need right here in this chat and we\'ll reply with our best bulk quote (Mon–Sat, 8am–6pm).'
  }

  const catalog = await loadCatalog()

  const tokens = m.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  const scored = catalog
    .map((p) => ({ p, score: scoreProduct(p, tokens) }))
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
  const clearWinner = scored.length >= 1 && (scored.length === 1 || scored[0].score > scored[1].score + 1)

  // The customer named a specific product — answer with its price card.
  if (clearWinner) {
    const p = scored[0].p
    return `${priceCard(p)}\n\nIn stock now. Reply *ORDER* and a teammate will confirm payment (M-Pesa, card or cash on delivery).`
  }

  if (/solar/.test(m)) {
    const panels = catalog.filter((p) => p.category === 'Solar Panels')
    if (panels.length > 0) return listProducts(panels, '*☀️ Solar panels in stock:*')
  }

  if (/bluetti/.test(m) && !/ecoflow/.test(m)) {
    const items = catalog.filter((p) => p.brand === 'Bluetti')
    if (items.length > 0) return listProducts(items, '*Bluetti range:*')
  }

  if (/power station|power backup|generator|delta\b|river\b|pro\b|max\b|ultra|plus|classic|air\b|list|catalog|all products|what.*(have|sell|stock)|range/i.test(rawMessage)) {
    const stations = catalog.filter((p) => p.category === 'Power Stations')
    if (stations.length > 0) return listProducts(stations, '*⚡ Power stations in stock:*')
  }

  if (scored.length > 1 && !clearWinner) {
    return listProducts(
      scored.map((s) => s.p),
      '*I found a few matches — which one?*',
      4
    )
  }

  if (/price|cost|how much|bei|worth|pesa/i.test(m)) {
    return 'Tell me the model name (e.g. *"Delta 3 Max price"* or *"River 2 Pro"*), or reply *LIST* and I\'ll show what\'s in stock with prices.'
  }

  if (/^(hi|hello|hey|habari|niaje|good (morning|afternoon|evening)|start|menu)\b/.test(m)) {
    return MENU
  }

  if (/thank|asante|sawa|ok\b|okay|great|perfect/i.test(m)) {
    return 'Karibu sana! 🙏 Anything else — prices, delivery, or M-Pesa help?'
  }

  return `${MENU}`
}
