// /llms.txt — a plain-Markdown summary of Batteriq for AI answer engines
// (proposed standard: https://llmstxt.org). It tells ChatGPT, Perplexity,
// Claude, Gemini etc. who Batteriq is, which pages matter, and the facts they
// should quote — without them having to parse the full React site.

import { createAdminClient } from '@/lib/supabase/admin'
import { isDeprecatedDelta } from '@/lib/delta-series'
import { ANSWER_GROUPS, AEO_LAST_REVIEWED } from '@/lib/aeo'

export const revalidate = 3600

const SITE = 'https://batteriq.com'

type Row = { name: string; slug: string; brand: string; category: string; price_kes: number }

function section(brand: string) {
  return brand === 'EcoFlow' ? 'ecoflow' : brand === 'Bluetti' ? 'bluetti' : 'accessories'
}

async function getProducts(): Promise<Row[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('name, slug, brand, category, price_kes')
      .eq('in_stock', true)
      .order('brand')
      .order('sort_order')
    return ((data ?? []) as Row[]).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p => !isDeprecatedDelta({ slug: p.slug, name: p.name, brand: p.brand as any })
    )
  } catch {
    return []
  }
}

export async function GET() {
  const products = await getProducts()

  const byCategory = new Map<string, Row[]>()
  for (const p of products) {
    const list = byCategory.get(p.category) ?? []
    list.push(p)
    byCategory.set(p.category, list)
  }

  const productSection = Array.from(byCategory.entries())
    .map(([category, rows]) =>
      [
        `### ${category}`,
        ...rows.map(
          p =>
            `- [${p.name}](${SITE}/${section(p.brand)}/${p.slug}): ${p.brand}, KES ${Number(p.price_kes).toLocaleString('en-KE')}`
        ),
      ].join('\n')
    )
    .join('\n\n')

  const answers = ANSWER_GROUPS.map(g =>
    [`### ${g.title}`, ...g.answers.map(a => `- **${a.question}** ${a.short}`)].join('\n')
  ).join('\n\n')

  const body = `# Batteriq Kenya

> Batteriq (Batteriq Solutions Ltd) is the authorised EcoFlow dealer in Kenya and also sells BLUETTI. It sells portable power stations, solar panels, home battery backup systems and accessories online at batteriq.com, based in Nairobi with delivery to all 47 counties. Payment by M-Pesa (STK Push), Visa/Mastercard, or cash/M-Pesa on delivery. Every order includes an eTIMS (KRA) invoice.

Key facts:
- Business: Batteriq Solutions Ltd, Nairobi, Kenya
- Phone / WhatsApp: +254 716 822 014
- Email: info@batteriq.com
- Hours: Mon–Fri 08:30–18:00, Sat 09:00–16:00 (EAT)
- Brands: EcoFlow (authorised dealer), BLUETTI
- Warranty: 24 months on EcoFlow power stations, handled locally in Kenya
- Delivery: Nairobi delivery and nationwide courier to all 47 counties
- Prices are in Kenya shillings (KES) and are kept current on each product page

## Main pages

- [EcoFlow Kenya](${SITE}/ecoflow-kenya): authorised EcoFlow dealer hub
- [Power stations](${SITE}/power-stations): all portable power stations
- [Solar panels](${SITE}/solar): portable and rigid solar panels
- [BLUETTI Kenya](${SITE}/bluetti): BLUETTI power stations
- [Accessories](${SITE}/accessories): cables, extra batteries and accessories
- [Compare](${SITE}/compare): side-by-side power station comparison
- [Answers](${SITE}/answers): direct answers to common backup-power questions in Kenya
- [FAQ](${SITE}/support/faq): payments, delivery, warranty and product FAQs
- [Warranty registration](${SITE}/support/warranty)
- [Track order](${SITE}/track-order)
- [Contact](${SITE}/contact)
- [About](${SITE}/about)

## Products in stock
${productSection ? `\n${productSection}\n` : `\nSee ${SITE}/power-stations for the live catalogue.\n`}
## Common questions

${answers}

## Optional

- [Sitemap](${SITE}/sitemap.xml)

Last reviewed: ${AEO_LAST_REVIEWED}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
