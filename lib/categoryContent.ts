// ─────────────────────────────────────────────────────────────────────────────
// "About … in Kenya" copy and FAQs for category and brand pages.
//
// Every price, model, capacity and spec comes from the products passed in (the
// same rows the page's grid shows), so the text follows the live catalogue.
// General explanations (what Wh means, how to size) contain no product claims.
// Business facts come from lib/business.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Product } from '@/lib/supabase/types'
import type { Faq } from '@/lib/seo'
import { productDisplayName } from '@/lib/seo'
import { BUSINESS } from '@/lib/business'
import { isPublished } from '@/lib/newPages'
import { parseWatts, parseWh, productHref, runtimeHours, type Paragraph, type Segment } from '@/lib/productContent'

export type CategoryContent = { heading: string; paragraphs: Paragraph[]; faqs: Faq[] }

/** [path, text before, anchor, text after] — rendered only for published Phase 5 pages. */
function newPageLinks(items: [string, string, string, string][]): Segment[] {
  return items.filter(([path]) => isPublished(path)).flatMap(([href, before, text, after]) => [before, { text, href }, after])
}

type Specs = Record<string, unknown>
const spec = (p: Product, ...keys: string[]) => {
  const s = (p.specs ?? {}) as Specs
  for (const k of keys) {
    const v = s[k]
    if ((typeof v === 'string' || typeof v === 'number') && String(v).trim()) return String(v).trim()
  }
  return null
}
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`
const wh = (p: Product) => parseWh(spec(p, 'capacity'))
/**
 * In stock, really priced, and not a mis-filed row (a "power station" with no
 * capacity is a cable or a duplicate awaiting the catalogue clean-up).
 */
const real = (p: Product) => p.in_stock && Number(p.price_kes) > 1 && !(p.category === 'Power Stations' && !wh(p))
/** Supplier ALL-CAPS names read badly as link text; they wait for the catalogue clean-up. */
const tidyName = (p: Product) => /[a-z]/.test(p.name)
const link = (p: Product): Segment => ({ text: productDisplayName(p), href: productHref(p) })
const cheapest = (ps: Product[]) => ps.filter(real).sort((a, b) => a.price_kes - b.price_kes)[0]
const range = (ps: Product[]) => {
  const prices = ps.filter(real).map((p) => Number(p.price_kes))
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null
}
/** Pick a product whose capacity is closest to the target, from in-stock rows. */
function nearest(ps: Product[], target: number, exclude: Set<string>) {
  return ps
    .filter((p) => real(p) && wh(p) && !exclude.has(p.slug))
    .sort((a, b) => Math.abs((wh(a) ?? 0) - target) - Math.abs((wh(b) ?? 0) - target))[0]
}
const delivery = `Pay by M-Pesa, card or cash on delivery, with same-day delivery in Nairobi and delivery to all 47 counties with an eTIMS invoice.`
const warranty = `Every unit is genuine and covered by a ${BUSINESS.warrantyMonths}-month warranty.`

// ── /power-stations ──────────────────────────────────────────────────────────
export function powerStationsContent(products: Product[]): CategoryContent | null {
  const stations = products.filter((p) => real(p) && wh(p))
  if (stations.length < 3) return null
  const r = range(stations)!
  const used = new Set<string>()
  const pickNear = (t: number) => { const p = nearest(stations, t, used); if (p) used.add(p.slug); return p }
  const small = pickNear(300)
  const mid = pickNear(1200)
  const large = pickNear(2500)
  const xl = pickNear(6000)
  const example = mid ?? small!
  const exWh = wh(example)!
  const exAc = spec(example, 'ac_output', 'power_output')
  const lfp = stations.filter((p) => /lfp|lifepo4/i.test(spec(p, 'battery_type', 'chemistry') ?? ''))
  const cycleNote = lfp.map((p) => spec(p, 'cycle_life')).find(Boolean)
  const withSolar = stations.filter((p) => spec(p, 'solar_input'))
  const fastest = stations.find((p) => spec(p, 'ac_charging'))
  const biggest = [...stations].sort((a, b) => (wh(b) ?? 0) - (wh(a) ?? 0))[0]
  const fridgeHours = runtimeHours(exWh, 150)

  const sizes: Segment[] = []
  if (small) sizes.push('Under 500 Wh suits a Wi-Fi router, phones, a laptop and lights — for example the ', link(small), ' (', `${wh(small)!.toLocaleString('en-KE')} Wh). `)
  if (mid) sizes.push('500 to 1,500 Wh covers lights, Wi-Fi, a TV and a fridge in a one- or two-bedroom home — see the ', link(mid), '. ')
  if (large) sizes.push('1,500 to 4,000 Wh suits a family home through longer outages, like the ', link(large), '. ')
  if (xl) sizes.push('Above 4,000 Wh, systems such as the ', link(xl), ' back up a whole home.')

  return {
    heading: 'About power stations in Kenya',
    paragraphs: [
      [
        `A portable power station — often called a solar generator — is a rechargeable battery with a built-in inverter and normal AC sockets. It charges from a wall socket or from solar panels and runs your appliances silently when KPLC power goes off, with no fuel, fumes or installation. We stock ${stations.length} models from EcoFlow and BLUETTI, from ${kes(r.min)} to ${kes(r.max)}.`,
      ],
      [
        'Two numbers matter. Capacity, in watt-hours (Wh), is how much energy it stores; AC output, in watts (W), is how much it can power at the same time. For example, the ',
        link(example),
        ` stores ${exWh.toLocaleString('en-KE')} Wh, so in a blackout it can run a 150 W fridge for approximately ${fridgeHours} hours (capacity × 0.85 ÷ watts)${exAc ? `, while its ${exAc} AC output sets the largest load it can start` : ''}.`,
      ],
      [
        `${lfp.length} of the ${stations.length} models use LiFePO4 (LFP) batteries${cycleNote ? `, with ratings such as ${cycleNote}` : ''}. LFP chemistry copes well with heat and keeps most of its capacity after thousands of charge cycles, which is why it suits daily use through frequent outages.`,
      ],
      sizes,
      [
        'Compare models side by side on our ',
        { text: 'power station comparison page', href: '/compare' },
        ', read short answers in our ',
        { text: 'backup power guide', href: '/answers' },
        `, and pair a station with our `,
        { text: 'solar panels', href: '/solar' },
        '. ',
        // Phase 5 pages are linked only once the owner has published them.
        ...newPageLinks([
          ['/answers/what-size-power-station', 'Not sure what size you need? Read our ', 'guide to sizing a power station', '. '],
          ['/home-backup-power', 'For a whole-home view, see ', 'home backup power by home size', '. '],
          ['/solar-generators', 'Want solar too? See our ', 'solar generator pairings', '. '],
        ]),
        delivery,
      ],
    ],
    faqs: [
      {
        question: 'Which power station can run a fridge in Kenya?',
        answer: `A typical fridge uses about 150 W while running. Any of our stations with at least 1,000 Wh handles one through a normal outage: the ${productDisplayName(example)} (${exWh.toLocaleString('en-KE')} Wh) runs a 150 W fridge for approximately ${fridgeHours} hours on its own. Check that the AC output covers the fridge's start-up surge; we can confirm on WhatsApp.`,
      },
      {
        question: 'What is the difference between a power station and an inverter?',
        answer: 'A home inverter system pairs a separate inverter with separate batteries and usually needs installation and wiring. A power station puts the battery, inverter, charger and sockets in one portable unit: you plug appliances straight into it and recharge it from the wall or solar panels, with no installation.',
      },
      {
        question: 'Can I charge a power station with solar panels?',
        answer: `Yes. ${withSolar.length} of our ${stations.length} models list a solar input${withSolar[0] ? `; the ${productDisplayName(withSolar[0])}, for example, accepts ${spec(withSolar[0], 'solar_input')}` : ''}. Choose panels within that input limit, and message us on WhatsApp to confirm the right cable before you buy.`,
      },
      {
        question: 'How long does a power station take to charge?',
        answer: fastest
          ? `It depends on the model and the charger. From a wall socket the ${productDisplayName(fastest)} is rated at ${spec(fastest, 'ac_charging')}. Solar charging time depends on panel wattage and sunshine, so larger panel arrays recharge faster. Each product page lists its own charging figures.`
          : 'It depends on the model, the wall charger and, for solar, panel wattage and sunshine. Each product page lists its own charging figures, and we can advise on WhatsApp.',
      },
      {
        question: 'Can a power station back up my whole house?',
        answer: `Larger systems can. The biggest we stock, the ${productDisplayName(biggest)}, stores ${wh(biggest)!.toLocaleString('en-KE')} Wh${spec(biggest, 'expandable') ? ` and is expandable (${spec(biggest, 'expandable')})` : ''}. Whole-home backup depends on what you run at once, so send us your appliance list and we will size a system for you.`,
      },
      {
        question: 'Is there a warranty, and how do I pay?',
        answer: `${warranty} ${delivery}`,
      },
    ],
  }
}

// ── /solar ───────────────────────────────────────────────────────────────────
function panelWatts(p: Product) {
  return parseWatts(spec(p, 'wattage', 'power', 'rated_power')) ?? parseWatts(p.name)
}
function panelKind(p: Product): 'rigid' | 'flexible' | 'foldable' {
  return /rigid/i.test(p.name) ? 'rigid' : /flexible/i.test(p.name) ? 'flexible' : 'foldable'
}
export function solarContent(products: Product[], stations: Product[]): CategoryContent | null {
  const panels = products.filter((p) => real(p) && panelWatts(p))
  if (panels.length < 2) return null
  const brands = Array.from(new Set(panels.map((p) => (p.brand === 'Bluetti' ? 'BLUETTI' : p.brand))))
  const watts = panels.map((p) => panelWatts(p)!)
  const r = range(panels)!
  const kinds = { foldable: panels.filter((p) => panelKind(p) === 'foldable'), rigid: panels.filter((p) => panelKind(p) === 'rigid'), flexible: panels.filter((p) => panelKind(p) === 'flexible') }
  const connectors = Array.from(new Set(panels.map((p) => spec(p, 'connector')).filter(Boolean))) as string[]
  const bySize = [...panels].sort((a, b) => panelWatts(a)! - panelWatts(b)!)
  const smallPanel = bySize[0]
  const bigPanel = bySize[bySize.length - 1]
  const station = stations.filter((s) => real(s) && spec(s, 'solar_input') && wh(s)).sort((a, b) => (wh(a) ?? 0) - (wh(b) ?? 0))[Math.floor(stations.length / 3)] ?? stations.find((s) => spec(s, 'solar_input'))

  const kindSeg: Segment[] = []
  if (kinds.foldable[0]) kindSeg.push('Foldable portable panels such as the ', link(kinds.foldable[0]), ' pack into a case and suit balconies, rooftops and trips. ')
  if (kinds.rigid[0]) kindSeg.push('Rigid panels like the ', link(kinds.rigid[0]), ' stay mounted permanently on a roof or frame. ')
  if (kinds.flexible[0]) kindSeg.push('Flexible panels such as the ', link(kinds.flexible[0]), ' bend to fit vehicle roofs and curved surfaces.')

  return {
    heading: 'About solar panels in Kenya',
    paragraphs: [
      [`We sell ${panels.length} ${brands.join(' and ')} solar panels from ${Math.min(...watts)} W to ${Math.max(...watts)} W, priced from ${kes(r.min)} to ${kes(r.max)}. They recharge a power station from free sunshine, so you depend less on KPLC power and stay charged through long outages.`],
      kindSeg,
      [
        'Match panel watts to the power station. A station accepts solar up to its rated solar input; panels beyond that limit add no extra speed. ',
        ...(station ? (['For example, the ', link(station), ` accepts ${spec(station, 'solar_input')}. `] as Segment[]) : []),
        `A small panel such as the `,
        link(smallPanel),
        ` keeps a compact station topped up, while the `,
        link(bigPanel),
        ' or several panels together recharge larger stations faster.',
      ],
      [
        'Kenya sits on the equator, so most regions get strong sun for much of the year, which makes solar a practical way to keep a power station charged between KPLC outages. Output still drops on cloudy days and during the long rains, so many homes size their panels with some headroom. ',
      ],
      [
        connectors.length ? `Our product data lists these connectors: ${connectors.join(', ')}. ` : '',
        'Browse our ',
        { text: 'power stations', href: '/power-stations' },
        ' to pair a panel, and ask us on WhatsApp to confirm the right cable. ',
        ...newPageLinks([['/solar-generators', 'See matched station-and-panel examples in our ', 'solar generator pairings', '. ']]),
        delivery,
      ],
    ],
    faqs: [
      {
        question: 'Which solar panel do I need for my power station?',
        answer: `Check the power station's solar input (listed in its specifications) and choose panels whose combined watts stay within it. ${station ? `The ${productDisplayName(station)}, for example, accepts ${spec(station, 'solar_input')}. ` : ''}Bigger panels within that limit recharge faster. Message us the model on WhatsApp and we will confirm the panel and cable.`,
      },
      {
        question: 'Foldable, rigid or flexible: which is best?',
        answer: 'Foldable panels are portable and pack away, so they suit homes that move them in and out or take them travelling. Rigid panels are for permanent roof or frame mounting. Flexible panels are light and bend to fit vehicle roofs. All of them charge a compatible power station the same way.',
      },
      {
        question: 'How much does a solar panel produce in Kenya?',
        answer: `A panel's rating is its output in full sun: a ${panelWatts(bigPanel)} W panel gives up to ${panelWatts(bigPanel)} W. Real output is lower in cloud, heat and shade and changes through the day, so plan with some margin and angle the panel towards the midday sun.`,
      },
      {
        question: 'Can I use BLUETTI panels with EcoFlow power stations?',
        answer: 'It can work when the panel output fits the station\'s solar input and you use the right connector cable, but always check first. Send us both model names on WhatsApp and we will confirm whether they are compatible and which cable you need.',
      },
      {
        question: 'Do solar panels come with a warranty?',
        answer: `${warranty} ${delivery}`,
      },
    ],
  }
}

// ── /ecoflow-kenya ───────────────────────────────────────────────────────────
const series = (ps: Product[], test: (p: Product) => boolean) => ps.filter((p) => real(p) && test(p))
export function ecoflowContent(products: Product[]): CategoryContent | null {
  const river = series(products, (p) => /\briver\b/i.test(p.name) && p.category === 'Power Stations')
  const deltaPro = series(products, (p) => /\bdelta pro\b/i.test(p.name) && p.category === 'Power Stations')
  const delta = series(products, (p) => /\bdelta\b/i.test(p.name) && !/\bdelta pro\b/i.test(p.name) && p.category === 'Power Stations')
  const groups: { name: string; items: Product[]; blurb: string }[] = [
    { name: 'RIVER', items: river, blurb: 'compact and light, for Wi-Fi, laptops, lights and travel' },
    { name: 'DELTA', items: delta, blurb: 'home backup for a TV, fridge, Wi-Fi and lights' },
    { name: 'DELTA Pro', items: deltaPro, blurb: 'high-capacity, expandable whole-home backup' },
  ].filter((g) => g.items.length)
  if (groups.length < 2) return null

  const lines: Segment[] = []
  groups.forEach((g, i) => {
    const c = cheapest(g.items)!
    lines.push(`${i ? ' ' : ''}The ${g.name} series (${g.items.length} model${g.items.length === 1 ? '' : 's'}, from ${kes(c.price_kes)}) is ${g.blurb} — start with the `, link(c), '.')
  })
  const all = products.filter(real)
  const r = range(all)
  const extraBatteries = products.filter((p) => real(p) && p.category === 'Batteries')
  const panels = products.filter((p) => real(p) && p.category === 'Solar Panels')
  const addOns: Segment[] = []
  if (extraBatteries.length) addOns.push(`We also carry ${extraBatteries.length} EcoFlow extra batteries from ${kes(cheapest(extraBatteries)!.price_kes)}, such as the `, link(cheapest(extraBatteries)!), ', which add capacity to compatible DELTA and RIVER stations. ')
  if (panels.length) addOns.push(`For solar charging there are ${panels.length} EcoFlow panels from ${kes(cheapest(panels)!.price_kes)}. `)
  const withApp = products.filter((p) => real(p) && p.category === 'Power Stations' && /yes/i.test(spec(p, 'app_control') ?? '')).length
  addOns.push(`${warranty}${withApp ? ` ${withApp} of our EcoFlow stations list app control, so you can check charge levels and power use from your phone.` : ''}`)

  return {
    heading: 'About EcoFlow in Kenya',
    paragraphs: [
      [`Batteriq is an authorised EcoFlow dealer in Kenya. We stock the EcoFlow range by series${r ? `, from ${kes(r.min)} to ${kes(r.max)}` : ''}, with extra batteries, solar panels and accessories to build a complete backup system.`],
      lines,
      addOns,
      ['EcoFlow stations charge from the wall or from ', { text: 'solar panels', href: '/solar' }, ', and many accept ', { text: 'extra batteries', href: '/accessories' }, ' for more capacity. Compare them on our ', { text: 'comparison page', href: '/compare' }, `. ${delivery}`],
    ],
    faqs: [
      {
        question: 'Which EcoFlow series should I choose?',
        answer: `Choose by what you need to run. ${groups.map((g) => `${g.name}: ${g.blurb}`).join('; ')}. Send us your appliance list on WhatsApp and we will recommend a model.`,
      },
      {
        question: 'Can I add more batteries to an EcoFlow power station later?',
        answer: 'Many DELTA and DELTA Pro models accept EcoFlow extra batteries; each product page lists whether it is expandable and by how much. Tell us your model on WhatsApp and we will confirm which extra battery fits.',
      },
    ],
  }
}

// ── /bluetti ─────────────────────────────────────────────────────────────────
export function bluettiContent(products: Product[]): CategoryContent | null {
  const g = (name: string, blurb: string, test: (p: Product) => boolean) => ({ name, blurb, items: series(products, test) })
  const groups = [
    g('AC series', 'portable power stations for home backup and travel', (p) => /\bAC\d/i.test(p.name)),
    g('Premium series', 'compact stations for essentials', (p) => /premium/i.test(p.name)),
    g('Homestar and home systems', 'residential backup, inverters and home batteries', (p) => /homestar|\bHV\d|\bHB\d|\bEP\d/i.test(p.name)),
    g('B-series batteries', 'expansion batteries for compatible stations', (p) => /\bB\d{3}/i.test(p.name)),
    g('PV solar panels', 'panels for solar charging', (p) => /\bPV\d/i.test(p.name)),
  ].filter((x) => x.items.length)
  if (groups.length < 2) return null
  const bluettiStations = products.filter((p) => real(p) && p.category === 'Power Stations')
  const stationsCount = bluettiStations.length
  const lfpCount = bluettiStations.filter((p) => /lfp|lifepo4/i.test(spec(p, 'battery_type', 'chemistry') ?? '')).length
  const lines: Segment[] = []
  groups.forEach((x, i) => {
    const c = cheapest(x.items)!
    lines.push(`${i ? ' ' : ''}${x.name} (${x.items.length}, from ${kes(c.price_kes)}): ${x.blurb} — for example the `, link(c), '.')
  })
  return {
    heading: 'About BLUETTI in Kenya',
    paragraphs: [
      ['Batteriq is an authorised BLUETTI dealer in Kenya. BLUETTI makes LFP-battery power stations, home backup systems, expansion batteries and solar panels. Here is the range we stock, with live prices.'],
      lines,
      [
        `${lfpCount === stationsCount ? `All ${stationsCount}` : `${lfpCount} of our ${stationsCount}`} BLUETTI power stations we stock list an LFP battery, the chemistry that keeps most of its capacity after thousands of charge cycles. `,
        'Several models grow with you: modular units such as the AC300 and AC500 run on separate B-series batteries (sold separately), so you can start with one battery and add more for longer backup. ',
        'For everyday outages, a smaller AC or Premium model covers Wi-Fi, lights and a TV; for a fridge and longer blackouts, look at the larger AC models and the Homestar home systems.',
      ],
      ['Pair a station with ', { text: 'solar panels', href: '/solar' }, ' for daytime charging, or compare models on our ', { text: 'comparison page', href: '/compare' }, `. ${warranty} ${delivery}`],
    ],
    faqs: [
      {
        question: 'Which BLUETTI power station suits a Kenyan home?',
        answer: `It depends on what you run. The Premium and smaller AC models cover Wi-Fi, lights and electronics; larger AC models and the Homestar home systems cover a fridge and longer outages. ${cheapest(groups[0].items) ? `Prices start from ${kes(cheapest(groups[0].items)!.price_kes)} for the ${groups[0].name}. ` : ''}Send us your appliance list on WhatsApp and we will size it.`,
      },
      {
        question: 'Are BLUETTI AC300 and AC500 sold with batteries?',
        answer: 'The AC300 and AC500 are modular power units: they need at least one BLUETTI B-series battery to run, and the battery is sold separately. Ask us on WhatsApp which battery and how many suit your needs.',
      },
      {
        question: 'What warranty do BLUETTI products have?',
        answer: `${warranty} Keep your Batteriq receipt as proof of purchase, and contact us for any warranty support.`,
      },
    ],
  }
}

// ── /accessories ─────────────────────────────────────────────────────────────
export function accessoriesContent(products: Product[]): CategoryContent | null {
  const sub = (p: Product) => (spec(p, 'source_subcategory') ?? '').toLowerCase()
  const groups = [
    { name: 'Anker power banks and chargers', items: products.filter((p) => real(p) && p.brand === 'Anker' && /powerbank|wall charger|car|hub/.test(sub(p))) },
    { name: 'Soundcore earbuds, headphones and speakers', items: products.filter((p) => real(p) && p.brand === 'Soundcore') },
    { name: 'Eufy security cameras and smart home', items: products.filter((p) => real(p) && p.brand === 'Eufy') },
    { name: 'EcoFlow and BLUETTI extra batteries', items: products.filter((p) => real(p) && p.category === 'Batteries') },
  ].filter((g) => g.items.length)
  if (groups.length < 2) return null
  const lines: Segment[] = []
  groups.forEach((g, i) => {
    const c = cheapest(g.items)!
    const example = cheapest(g.items.filter(tidyName))
    lines.push(`${i ? ' ' : ''}${g.name}: ${g.items.length} products from ${kes(c.price_kes)}`)
    if (example) lines.push(', such as the ', link(example))
    lines.push('.')
  })
  // What each brand range covers, counted from the supplier subcategory field.
  const count = (brand: string, re: RegExp) => products.filter((p) => real(p) && p.brand === brand && re.test(sub(p))).length
  const ankerParts = [
    [count('Anker', /powerbank/), 'power banks'], [count('Anker', /wall charger/), 'wall chargers'], [count('Anker', /^car$/), 'car chargers'],
    [count('Anker', /hub/), 'USB-C hubs'], [count('Anker', /cable/), 'cables'],
  ].filter(([n]) => (n as number) > 0).map(([n, label]) => `${n} ${label}`)
  const soundParts = [[count('Soundcore', /in ear/), 'earbuds'], [count('Soundcore', /over ear/), 'headphones'], [count('Soundcore', /speaker/), 'speakers']]
    .filter(([n]) => (n as number) > 0).map(([n, label]) => `${n} ${label}`)
  const range2: Segment[] = [
    ankerParts.length ? `The Anker range covers ${ankerParts.join(', ')}. ` : '',
    soundParts.length ? `Soundcore covers ${soundParts.join(', ')}. ` : '',
    'Eufy adds indoor and outdoor security cameras, video doorbells, smart trackers and home sensors.',
  ]
  const batteries = groups.find((g) => g.name.includes('extra batteries'))
  const powerBanks = products.filter((p) => real(p) && (p.category === 'Power Banks' || /powerbank/.test(sub(p))))
  return {
    heading: 'About accessories in Kenya',
    paragraphs: [
      ['Batteriq is an authorised Anker, Soundcore and Eufy dealer as well as an EcoFlow and BLUETTI dealer, so this page collects the add-ons that complete a backup setup and the everyday tech that keeps you charged and secure.'],
      lines,
      range2,
      [
        'Choosing a power bank or charger comes down to three numbers on its product page: capacity in mAh (how many phone charges it holds), output in watts (how fast it charges; laptops usually need USB-C at 45 W or more), and the ports you need. ',
        'During KPLC outages a power bank keeps phones and Wi-Fi hotspots running, while a power station covers the rest of the house.',
      ],
      [
        'Extra batteries add capacity to a compatible ',
        { text: 'power station', href: '/power-stations' },
        '; check the expandable spec on your station first. ',
        ...newPageLinks([
          ['/anker-kenya', 'Shop by brand: ', 'Anker Kenya', '. '],
          ['/soundcore-kenya', '', 'Soundcore Kenya', '. '],
          ['/eufy-kenya', '', 'Eufy Kenya', '. '],
        ]),
        `${warranty} ${delivery}`,
      ],
    ],
    faqs: [
      {
        question: 'Are your Anker, Soundcore and Eufy products genuine?',
        answer: `Yes. Batteriq is an authorised Anker, Soundcore and Eufy dealer in Kenya, so every unit is genuine. ${warranty}`,
      },
      {
        question: 'Which extra battery fits my power station?',
        answer: `Extra batteries are model-specific: each one lists the station it fits${batteries ? ', and we stock ' + batteries.items.length + ' of them' : ''}. Check your station's "Expandable to" spec, then send us the model on WhatsApp and we will confirm the right battery and cable.`,
      },
      {
        question: 'Do you have power banks for phones and laptops?',
        answer: powerBanks.length
          ? `Yes. We stock ${powerBanks.length} power banks from ${kes(cheapest(powerBanks)!.price_kes)}, such as the ${productDisplayName(cheapest(powerBanks)!)}. Check the capacity and output on each product page against your phone or laptop, or ask us on WhatsApp which one charges your device fastest.`
          : 'Ask us on WhatsApp and we will recommend an Anker power bank that matches your phone or laptop.',
      },
      {
        question: 'Do Soundcore earbuds work with iPhone and Android?',
        answer: 'Soundcore earbuds, headphones and speakers connect over Bluetooth, so they pair with iPhone and Android phones, tablets and laptops. Each product page lists its own features; message us on WhatsApp if you want help choosing.',
      },
      {
        question: 'How fast is delivery for accessories?',
        answer: delivery,
      },
    ],
  }
}
