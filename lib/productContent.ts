// ─────────────────────────────────────────────────────────────────────────────
// Product-page content built only from database specs: the Full Specifications
// rows, the Overview text and the two product-specific FAQs.
//
// Nothing here invents a spec. When the data a sentence needs is missing, the
// sentence is left out; when a product lacks the core data (capacity for a
// battery product, wattage for a panel) it gets no Overview at all.
// ─────────────────────────────────────────────────────────────────────────────

import type { Product } from '@/lib/supabase/types'
import { BUSINESS } from '@/lib/business'
import { formatSpecLabel } from '@/lib/utils'
import { manufacturerPartNumber, productDisplayName } from '@/lib/seo'

export type SpecRow = { label: string; value: string }
/** A run of text, optionally a link. Rendered by ProductOverview. */
export type Segment = string | { text: string; href: string }
export type Paragraph = Segment[]

type Specs = Record<string, unknown>

const str = (v: unknown) => ((typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v).trim() : null)
const pick = (specs: Specs, ...keys: string[]) => {
  for (const k of keys) {
    const v = str(specs[k])
    if (v) return v
  }
  return null
}

const TYPE_BY_CATEGORY: Record<string, string> = {
  'Power Stations': 'Portable power station',
  'Solar Panels': 'Solar panel',
  Batteries: 'Extra battery',
  'Solar Home Systems': 'Solar home system',
  'Power Banks': 'Power bank',
  Appliances: 'Appliance',
}
const TYPE_BY_SUBCATEGORY: Record<string, string> = {
  'in ear': 'Wireless earbuds', 'over ear': 'Headphones', 'portable speaker': 'Bluetooth speaker', 'wall charger': 'Wall charger',
  powerbank: 'Power bank', cable: 'Cable', camera: 'Security camera', car: 'Car charger', hub: 'USB-C hub', scale: 'Smart scale',
  tracker: 'Tracker', projector: 'Projector', 'robotic vacuum': 'Robot vacuum', vacuum: 'Vacuum', adaptor: 'Adapter',
  alarm: 'Sensor', 'baby monitor': 'Baby monitor', case: 'Phone case', doorbell: 'Video doorbell', 'home base': 'Security hub',
}

export function productType(product: Pick<Product, 'category' | 'specs' | 'name'>): string | null {
  const specs = (product.specs ?? {}) as Specs
  if (/charger/i.test(product.name)) return /\bcar\b/i.test(product.name) ? 'Car charger' : 'Charger'
  const sub = str(specs.source_subcategory)?.toLowerCase()
  return (sub && TYPE_BY_SUBCATEGORY[sub]) || TYPE_BY_CATEGORY[product.category] || null
}

/** Spec keys shown under a nicer label, in this order. Each key is used once. */
const ORDERED: { label: string; keys: string[] }[] = [
  { label: 'Capacity', keys: ['capacity'] },
  { label: 'AC output (surge)', keys: ['ac_output', 'power_output'] },
  { label: 'Battery chemistry', keys: ['battery_type', 'chemistry'] },
  { label: 'Cycle life', keys: ['cycle_life'] },
  { label: 'Solar input', keys: ['solar_input'] },
  { label: 'AC charging time', keys: ['ac_charging'] },
  { label: 'UPS switch-over time', keys: ['ups_mode'] },
  { label: 'Expandable to', keys: ['expandable'] },
  { label: 'Weight', keys: ['weight'] },
  { label: 'Dimensions', keys: ['dimensions'] },
  { label: 'Cell type', keys: ['type'] },
]
const PORT_KEYS = ['ac_outlets', 'usb_c', 'usb_a', 'car_port']
const BOX_KEYS = ['in_the_box', 'whats_in_the_box', 'box_contents']
/** Bookkeeping fields from the supplier import: shown as Product type instead. */
const HIDDEN = /^(source_category|source_subcategory|mpn)$/i

/**
 * The Full Specifications rows: the named rows first (only when the data
 * exists), then every other spec the product has, with readable labels.
 */
export function buildSpecRows(product: Product): SpecRow[] {
  const specs = (product.specs ?? {}) as Specs
  const used = new Set<string>()
  const rows: SpecRow[] = []
  const push = (label: string, value: string | null, keys: string[] = []) => {
    keys.forEach((k) => used.add(k))
    if (value) rows.push({ label, value })
  }

  push('Product type', productType(product))
  push('Model code (manufacturer)', manufacturerPartNumber(product), ['mpn'])
  for (const { label, keys } of ORDERED) {
    const key = keys.find((k) => str(specs[k]))
    push(label, key ? str(specs[key]) : null, keys)
  }
  const ports = PORT_KEYS.map((k) => str(specs[k])).filter(Boolean)
  push('Ports', ports.length ? ports.join(' · ') : null, PORT_KEYS)
  push("What's in the box", pick(specs, ...BOX_KEYS), BOX_KEYS)
  push('Warranty', pick(specs, 'warranty') ?? `${BUSINESS.warrantyMonths} months`, ['warranty'])

  for (const [key, value] of Object.entries(specs)) {
    if (used.has(key) || HIDDEN.test(key)) continue
    const v = str(value)
    if (v) rows.push({ label: formatSpecLabel(key), value: v })
  }
  return rows
}

// ── Numbers parsed from spec strings ─────────────────────────────────────────

/** "4096Wh", "1,024 Wh", "3.01kWh", "5kWh" → watt-hours. */
export function parseWh(value: string | null): number | null {
  if (!value) return null
  const m = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(kWh|Wh)\b/i)
  if (!m) return null
  const n = parseFloat(m[1]) * (/^k/i.test(m[2]) ? 1000 : 1)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** First wattage in a string: "4000W (Surge 8000W)" → 4000, "2600W Max (...)" → 2600. */
export function parseWatts(value: string | null): number | null {
  if (!value) return null
  const m = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(kW|W)\b/)
  if (!m) return null
  const n = parseFloat(m[1]) * (m[2] === 'kW' ? 1000 : 1)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** Usable share of the rated capacity after inverter losses. */
const USABLE = 0.85
export const BLACKOUT_LOADS = [
  { name: 'a fridge', watts: 150 },
  { name: 'a TV', watts: 100 },
  { name: 'a Wi-Fi router', watts: 15 },
  { name: 'lights', watts: 50 },
] as const

/** capacity (Wh) × 0.85 ÷ load (W), rounded to a sensible step. */
export function runtimeHours(wh: number, watts: number): number {
  const h = (wh * USABLE) / watts
  return h >= 10 ? Math.round(h) : Math.round(h * 2) / 2
}

function hoursText(h: number): string {
  if (h < 1) return `about ${Math.max(5, Math.round((h * 60) / 5) * 5)} minutes`
  return `approximately ${h.toLocaleString('en-KE')} hour${h === 1 ? '' : 's'}`
}

function listJoin(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

export function productHref(p: Pick<Product, 'brand' | 'slug'>) {
  return p.brand === 'EcoFlow' ? `/ecoflow/${p.slug}` : p.brand === 'Bluetti' ? `/bluetti/${p.slug}` : `/accessories/${p.slug}`
}

const BATTERY_CATEGORIES = ['Power Stations', 'Batteries', 'Solar Home Systems']

/** Who a given capacity suits — sizing guidance, not a product claim. */
function suits(wh: number): string {
  if (wh < 500) return 'phones, laptops, a Wi-Fi router and LED lights — handy for small flats, students, remote work and camping'
  if (wh < 1500) return 'the essentials in a one- or two-bedroom home: lights, Wi-Fi, a TV and a fridge through a typical KPLC outage'
  if (wh < 4000) return 'a family home that wants the fridge, TV, Wi-Fi and lights covered through longer outages'
  return 'whole-home backup, including longer outages and larger appliances within its AC output'
}

/**
 * Panels we sell that list this product in their compatible_with spec. Only
 * real compatibility data counts; no guessing from wattage.
 */
export function compatiblePanels(product: Pick<Product, 'name'>, catalogue: Product[]): Product[] {
  const model = product.name.replace(/^(EcoFlow|Bluetti)\s+/i, '').toLowerCase()
  return catalogue.filter((p) => {
    if (p.category !== 'Solar Panels') return false
    const c = str(((p.specs ?? {}) as Specs).compatible_with)?.toLowerCase()
    return !!c && c.includes(model)
  })
}

export type ProductContent = { overview: Paragraph[]; faqs: { question: string; answer: string }[] }

/**
 * Overview (3 short paragraphs) + 2 product-specific FAQs. Returns null when
 * the product lacks the specs the text depends on — those products are listed
 * as owner questions instead of getting vague copy.
 */
export function buildProductContent(product: Product, catalogue: Product[] = []): ProductContent | null {
  const specs = (product.specs ?? {}) as Specs
  const name = productDisplayName(product)

  if (BATTERY_CATEGORIES.includes(product.category)) {
    const wh = parseWh(pick(specs, 'capacity'))
    if (!wh) return null
    const ac = pick(specs, 'ac_output', 'power_output')
    const acW = parseWatts(ac)
    const chemistry = pick(specs, 'battery_type', 'chemistry')
    const cycles = pick(specs, 'cycle_life')
    const solarIn = pick(specs, 'solar_input')
    const acCharge = pick(specs, 'ac_charging')
    const expandable = pick(specs, 'expandable')
    const type = (productType(product) ?? 'power station').toLowerCase()
    const isExtraBattery = product.category === 'Batteries'

    // An extra battery powers loads through its power station; its own "AC
    // output" field is not a limit we can rely on.
    const limitW = isExtraBattery ? null : acW
    const loads = BLACKOUT_LOADS.filter((l) => !limitW || l.watts <= limitW)
    const runtimes = loads.map((l) => `${l.name} (${l.watts} W) for ${hoursText(runtimeHours(wh, l.watts))}`)

    const p1: Paragraph = [
      `The ${name} is ${/^[aeiou]/i.test(type) ? 'an' : 'a'} ${type} with ${wh.toLocaleString('en-KE')} Wh of storage`,
      chemistry ? ` in ${/^(LFP|L)/.test(chemistry) ? 'an' : 'a'} ${chemistry} battery` : '',
      cycles ? `, rated for ${cycles}` : '',
      `. ${isExtraBattery ? 'It adds capacity to a compatible power station and suits' : 'It suits'} ${suits(wh)}.`,
      expandable && /^yes\s*$/i.test(expandable)
        ? ' It can be expanded with extra batteries.'
        : expandable
          ? ` It is expandable ${expandable.replace(/^yes\s*[—-]?\s*/i, '')}.`
          : '',
    ]
    const p2: Paragraph = [
      isExtraBattery
        ? `During a KPLC blackout, connected to its power station, these ${wh.toLocaleString('en-KE')} Wh add enough to run ${listJoin(runtimes)}, each on its own. `
        : `During a KPLC blackout, ${wh.toLocaleString('en-KE')} Wh can run ${listJoin(runtimes)}, each on its own. `,
      'These are estimates (capacity × 0.85 ÷ appliance watts); real runtime depends on what else is connected',
      limitW ? ` and the total must stay within its ${ac} AC output.` : '.',
    ]
    const panels = compatiblePanels(product, catalogue)
    const p3: Paragraph = isExtraBattery
      ? ['It charges through the power station it is connected to.']
      : [
          acCharge ? `It recharges from a wall socket (${acCharge})` : 'It recharges from a wall socket',
          solarIn ? ` and from solar, with a solar input of ${solarIn}` : '',
          '. ',
          ...(panels.length
            ? (['Compatible panels we sell include ', ...panels.slice(0, 3).flatMap((p, i) => [i ? (i === Math.min(panels.length, 3) - 1 ? ' and ' : ', ') : '', { text: productDisplayName(p), href: productHref(p) }]), '.'] as Segment[])
            : solarIn
              ? (['See our ', { text: 'solar panels', href: '/solar' }, ' and ask us on WhatsApp which ones match.'] as Segment[])
              : []),
        ]

    const lead = isExtraBattery
      ? `Connected to its power station, the ${name} adds ${wh.toLocaleString('en-KE')} Wh, enough to run`
      : `With ${wh.toLocaleString('en-KE')} Wh, the ${name} can run`
    const runAnswer = `${lead} ${listJoin(runtimes)}, each on its own. These are approximate (capacity × 0.85 ÷ watts).${limitW ? ` Keep the total load under its ${ac} AC output.` : ''} Send us your appliance list on WhatsApp and we will size it for you.`
    const solarAnswer = isExtraBattery
      ? `The ${name} is charged through its power station, so use panels that suit that power station. Tell us your setup on WhatsApp and we will confirm the right panels and cables.`
      : panels.length
        ? `Panels we sell that list the ${name} as compatible: ${listJoin(panels.slice(0, 4).map(productDisplayName))}.${solarIn ? ` Its solar input is ${solarIn}.` : ''} Message us on WhatsApp to confirm cables before you buy.`
        : solarIn
          ? `The ${name} has a solar input of ${solarIn}. Choose panels within that limit; message us on WhatsApp with the model and we will confirm the right panels and cables before you buy.`
          : `Message us on WhatsApp with your setup and we will confirm which of our solar panels and cables work with the ${name}.`

    return {
      overview: [p1, p2, p3],
      faqs: [
        { question: `What can the ${name} run in a Kenyan home?`, answer: runAnswer },
        { question: `Which solar panels work with the ${name}?`, answer: solarAnswer },
      ],
    }
  }

  if (product.category === 'Solar Panels') {
    const watts = parseWatts(pick(specs, 'wattage', 'power', 'rated_power'))
    if (!watts) return null
    const cellType = pick(specs, 'type')
    const efficiency = pick(specs, 'efficiency')
    const ip = pick(specs, 'water_resistance')
    const connector = pick(specs, 'connector')
    const compat = pick(specs, 'compatible_with')
    const p1: Paragraph = [
      `The ${name} is a ${watts} W${cellType ? ` ${cellType.toLowerCase()}` : ''} solar panel`,
      efficiency ? ` with ${efficiency} cell efficiency` : '',
      ip ? ` and an ${ip} rating` : '',
      '. It suits Kenyan homes and trips that want free daytime charging for a power station, and cuts how often you need KPLC power to recharge.',
    ]
    const p2: Paragraph = [
      `In full sun it produces up to ${watts} W; real output is lower in cloud, heat and shade, so plan with some margin. `,
      `Pair it with a power station whose solar input accepts at least ${watts} W, angle it towards the midday sun and keep the surface clean for the best output.`,
    ]
    const p3: Paragraph = [
      connector ? `It connects with ${connector}. ` : '',
      compat ? `It is listed as compatible with ${compat}. ` : '',
      'Browse our ',
      { text: 'power stations', href: '/power-stations' },
      ' to find one that matches.',
    ]
    return {
      overview: [p1, p2, p3],
      faqs: [
        { question: `What can the ${name} run in a Kenyan home?`, answer: `A solar panel charges a power station rather than running appliances directly. In full sun the ${name} produces up to ${watts} W, which tops up a power station during the day so it can run your lights, Wi-Fi, TV and fridge through a KPLC outage.` },
        { question: `Which power stations work with the ${name}?`, answer: `${compat ? `It is listed as compatible with ${compat}. ` : ''}Any power station whose solar input accepts at least ${watts} W${connector ? ` and the ${connector} connector` : ''} can use it. Message us on WhatsApp with your model and we will confirm the right cable.` },
      ],
    }
  }

  return null
}

/** Products that should have an Overview but lack the specs for one. */
export function missingContentReason(product: Product): string | null {
  const specs = (product.specs ?? {}) as Specs
  if (BATTERY_CATEGORIES.includes(product.category) && !parseWh(pick(specs, 'capacity'))) return 'no capacity (Wh) in specs'
  if (product.category === 'Solar Panels' && !parseWatts(pick(specs, 'wattage', 'power', 'rated_power'))) return 'no wattage in specs'
  return null
}
