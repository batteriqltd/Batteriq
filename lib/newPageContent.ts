// ─────────────────────────────────────────────────────────────────────────────
// Content for the Phase 5 pages, built from live product rows only.
// Pairings are recommendations, never bundles: both products are sold
// separately and each links to its own page.
// ─────────────────────────────────────────────────────────────────────────────

import type { Product } from '@/lib/supabase/types'
import type { Faq } from '@/lib/seo'
import { productDisplayName } from '@/lib/seo'
import { BUSINESS } from '@/lib/business'
import {
  buildSpecRows, compatiblePanels, parseWatts, parseWh, productHref, runtimeHours,
  type Paragraph, type Segment, type SpecRow,
} from '@/lib/productContent'

type Specs = Record<string, unknown>
const spec = (p: Product, ...keys: string[]) => {
  const s = (p.specs ?? {}) as Specs
  for (const k of keys) {
    const v = s[k]
    if ((typeof v === 'string' || typeof v === 'number') && String(v).trim()) return String(v).trim()
  }
  return null
}
export const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`
export const capacityWh = (p: Product) => parseWh(spec(p, 'capacity'))
const live = (p: Product) => p.in_stock && Number(p.price_kes) > 1
const link = (p: Product): Segment => ({ text: productDisplayName(p), href: productHref(p) })
const panelWatts = (p: Product) => parseWatts(spec(p, 'wattage', 'power', 'rated_power')) ?? parseWatts(p.name)

export const delivery = 'Pay by M-Pesa, card or cash on delivery, with same-day delivery in Nairobi and delivery to all 47 counties with an eTIMS invoice.'
export const warranty = `Every unit is genuine and covered by a ${BUSINESS.warrantyMonths}-month warranty.`

// ── Home sizes ───────────────────────────────────────────────────────────────
export type Need = { key: 'apartment' | 'family' | 'whole'; title: string; range: string; min: number; max: number; runs: string }
export const NEEDS: Need[] = [
  { key: 'apartment', title: 'Apartment or bedsitter', range: 'about 250–1,200 Wh', min: 250, max: 1200, runs: 'Wi-Fi, phones, a laptop, lights and a TV' },
  { key: 'family', title: 'Family home', range: 'about 1,200–3,000 Wh', min: 1200, max: 3000, runs: 'lights, Wi-Fi, a TV and a fridge through longer outages' },
  { key: 'whole', title: 'Whole home', range: '3,000 Wh and up', min: 3000, max: Infinity, runs: 'most of the house, including bigger appliances within the AC output' },
]

/**
 * Units whose listed price does not include the battery (owner: AC300/AC500 are
 * power units only; EP760 price looks like the inverter only — unconfirmed).
 * They are never shown as a ready-to-run option.
 */
export const priceExcludesBattery = (p: Product) => /\b(AC300|AC500|EP760)\b/i.test(p.name)

/** In-stock stations and home systems that fit a size band, cheapest first. */
export function stationsFor(need: Need, products: Product[]) {
  return products
    .filter((p) => live(p) && !priceExcludesBattery(p) && ['Power Stations', 'Solar Home Systems'].includes(p.category))
    .filter((p) => { const wh = capacityWh(p); return !!wh && wh >= need.min && wh < need.max })
    .sort((a, b) => a.price_kes - b.price_kes)
}

// ── Solar generator pairings ─────────────────────────────────────────────────
export type Pairing = { station: Product; panel: Product; total: number; basis: 'listed' | 'input' }

/**
 * A panel for a station: one whose compatible_with spec names the station
 * ("listed"), otherwise the largest same-brand panel whose rated output fits
 * within the station's solar input ("input"). No pairing when neither exists.
 */
export function pairingFor(station: Product, panels: Product[]): Pairing | null {
  const stock = panels.filter(live)
  const listed = compatiblePanels(station, stock).sort((a, b) => (panelWatts(b) ?? 0) - (panelWatts(a) ?? 0))[0]
  if (listed) return { station, panel: listed, total: station.price_kes + listed.price_kes, basis: 'listed' }
  const input = parseWatts(spec(station, 'solar_input'))
  if (!input) return null
  const fit = stock
    .filter((p) => p.brand === station.brand && (panelWatts(p) ?? Infinity) <= input)
    .sort((a, b) => (panelWatts(b) ?? 0) - (panelWatts(a) ?? 0))[0]
  return fit ? { station, panel: fit, total: station.price_kes + fit.price_kes, basis: 'input' } : null
}

export function pairingsByNeed(stations: Product[], panels: Product[]) {
  return NEEDS.map((need) => ({
    need,
    pairings: stationsFor(need, stations)
      .map((s) => pairingFor(s, panels))
      .filter(Boolean)
      .slice(0, 3) as Pairing[],
  }))
}

export const panelWattsOf = panelWatts
export const solarInputOf = (p: Product) => spec(p, 'solar_input')

export function solarGeneratorFaqs(stations: Product[], panels: Product[]): Faq[] {
  const all = pairingsByNeed(stations, panels).flatMap((g) => g.pairings)
  const cheapest = [...all].sort((a, b) => a.total - b.total)[0]
  return [
    {
      question: 'What is a solar generator?',
      answer: 'A solar generator is a portable power station charged by solar panels. The power station stores the energy and has the sockets; the panels refill it from sunshine. Together they give silent, fuel-free backup that recharges during the day and runs your appliances when KPLC power goes off.',
    },
    {
      question: 'How much is a solar generator in Kenya?',
      answer: cheapest
        ? `It depends on size. Our lowest-priced recommended pairing is the ${productDisplayName(cheapest.station)} with the ${productDisplayName(cheapest.panel)}, ${kes(cheapest.total)} together at today's prices. Larger pairings for family and whole-home backup cost more; each product is bought separately.`
        : 'It depends on the power station and panels you choose; each is priced on its product page and bought separately.',
    },
    {
      question: 'Do you sell these pairings as a bundle?',
      answer: 'No. These are recommended pairings, not bundles: you add the power station and the panel to your cart separately, at their normal prices. Message us on WhatsApp if you want help choosing cables or a different panel.',
    },
    {
      question: 'How do I know the panel matches the power station?',
      answer: 'We pair a panel that our product data lists as compatible with the station, or a same-brand panel whose rated watts fit within the station\'s solar input. Always confirm the connector cable; we will check it for you on WhatsApp before you buy.',
    },
    { question: 'Is there a warranty, and how do I pay?', answer: `${warranty} ${delivery}` },
  ]
}

// ── Comparisons ──────────────────────────────────────────────────────────────
export type ComparisonDef = { path: `/compare/${string}`; slugs: [string, string]; title: string; h1: string }
export const COMPARISONS: ComparisonDef[] = [
  { path: '/compare/ecoflow-delta-2-vs-delta-3', slugs: ['delta-2', 'delta-3'], title: 'EcoFlow DELTA 2 vs DELTA 3 in Kenya — Specs & Prices', h1: 'EcoFlow DELTA 2 vs DELTA 3' },
  { path: '/compare/ecoflow-delta-pro-vs-delta-pro-3', slugs: ['delta-pro', 'delta-pro-3'], title: 'EcoFlow DELTA Pro vs DELTA Pro 3 in Kenya — Specs & Prices', h1: 'EcoFlow DELTA Pro vs DELTA Pro 3' },
  { path: '/compare/ecoflow-river-2-vs-bluetti-ac2p', slugs: ['river-2', 'bluetti-ac2p'], title: 'EcoFlow RIVER 2 vs BLUETTI AC2P in Kenya — Specs & Prices', h1: 'EcoFlow RIVER 2 vs BLUETTI AC2P' },
]

export function comparisonRows(a: Product, b: Product): { label: string; a: string; b: string }[] {
  const ra = buildSpecRows(a)
  const rb = buildSpecRows(b)
  const labels: string[] = []
  for (const r of [...ra, ...rb]) if (!labels.includes(r.label)) labels.push(r.label)
  const val = (rows: SpecRow[], l: string) => rows.find((r) => r.label === l)?.value ?? '—'
  return [
    { label: 'Price', a: kes(a.price_kes), b: kes(b.price_kes) },
    { label: 'Availability', a: a.in_stock ? 'In stock' : 'Out of stock', b: b.in_stock ? 'In stock' : 'Out of stock' },
    ...labels.map((l) => ({ label: l, a: val(ra, l), b: val(rb, l) })),
  ]
}

/** Per-use verdicts computed from the two rows; a verdict is skipped when data is missing. */
export function comparisonVerdicts(a: Product, b: Product): Paragraph[] {
  const name = productDisplayName
  const out: Paragraph[] = []
  const whA = capacityWh(a), whB = capacityWh(b)
  const acA = parseWatts(spec(a, 'ac_output', 'power_output')), acB = parseWatts(spec(b, 'ac_output', 'power_output'))
  const wA = parseFloat(spec(a, 'weight') ?? ''), wB = parseFloat(spec(b, 'weight') ?? '')
  if (whA && whB && whA !== whB) {
    const big = whA > whB ? a : b, bw = Math.max(whA, whB)
    const h = (n: number) => `${n} hour${n === 1 ? '' : 's'}`
    out.push(['Longest blackout runtime: ', link(big), ` — ${bw.toLocaleString('en-KE')} Wh runs a 150 W fridge for approximately ${h(runtimeHours(bw, 150))}, versus approximately ${h(runtimeHours(Math.min(whA, whB), 150))}.`])
  }
  if (acA && acB && acA !== acB) {
    const strong = acA > acB ? a : b
    out.push(['Bigger appliances: ', link(strong), ` — ${spec(strong, 'ac_output', 'power_output')} AC output, against ${spec(strong === a ? b : a, 'ac_output', 'power_output')}.`])
  }
  if (a.price_kes !== b.price_kes) {
    const cheap = a.price_kes < b.price_kes ? a : b
    out.push(['Lower budget: ', link(cheap), ` at ${kes(cheap.price_kes)}, ${kes(Math.abs(a.price_kes - b.price_kes))} less than the ${name(cheap === a ? b : a)}.`])
  }
  if (whA && whB) {
    const perA = a.price_kes / whA, perB = b.price_kes / whB
    const value = perA < perB ? a : b
    out.push(['Best value per watt-hour: ', link(value), ` at about ${kes(Math.min(perA, perB))} per Wh of storage.`])
  }
  if (Number.isFinite(wA) && Number.isFinite(wB) && wA !== wB) {
    const light = wA < wB ? a : b
    out.push(['Easiest to carry: ', link(light), ` at ${spec(light, 'weight')}.`])
  }
  const outA = !a.in_stock ? a : !b.in_stock ? b : null
  if (outA) out.push([link(outA), ' is out of stock right now; message us on WhatsApp to reserve one or to compare it with an in-stock alternative.'])
  return out
}

// ── Accessory brand pages ────────────────────────────────────────────────────
export const BRAND_PAGES = {
  '/anker-kenya': { brand: 'Anker', h1: 'Anker Kenya', title: 'Anker Kenya — Power Banks, Chargers & Cables | Batteriq', blurb: 'power banks, wall and car chargers, USB-C hubs and cables' },
  '/soundcore-kenya': { brand: 'Soundcore', h1: 'Soundcore Kenya', title: 'Soundcore Kenya — Earbuds, Headphones & Speakers | Batteriq', blurb: 'wireless earbuds, headphones and Bluetooth speakers' },
  '/eufy-kenya': { brand: 'Eufy', h1: 'Eufy Kenya', title: 'Eufy Kenya — Security Cameras & Smart Home | Batteriq', blurb: 'security cameras, video doorbells, smart trackers and home sensors' },
} as const

export function brandIntro(brand: string, blurb: string, products: Product[]): Paragraph[] {
  const stock = products.filter(live)
  const prices = stock.map((p) => Number(p.price_kes))
  const tidy = stock.filter((p) => /[a-z]/.test(p.name)).sort((x, y) => x.price_kes - y.price_kes).slice(0, 3)
  const p: Paragraph[] = [
    [`Batteriq is an authorised ${brand} dealer in Kenya. We stock ${stock.length} ${brand} products — ${blurb}${prices.length ? ` — from ${kes(Math.min(...prices))} to ${kes(Math.max(...prices))}` : ''}. ${warranty}`],
  ]
  if (tidy.length) p.push(['Popular picks include ', ...tidy.flatMap((x, i) => [i ? (i === tidy.length - 1 ? ' and ' : ', ') : '', link(x)]), '.'])
  p.push(['Need backup power too? See our ', { text: 'power stations', href: '/power-stations' }, ' and ', { text: 'all accessories', href: '/accessories' }, `. ${delivery}`])
  return p
}
