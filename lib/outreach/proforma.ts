import crypto from 'crypto'
import { generateQuotationPDF, type QuotationOption } from '@/lib/quotation-pdf'
import { escapeHtml, type CatalogProductSummary } from './claude'
import type { LeadCategory, OutreachLead } from './types'

export interface OutreachProformaLineItem {
  brand: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface OutreachProformaPackage {
  proformaNumber: string
  issueDateIso: string
  validUntilIso: string
  systemTitle: string
  useCaseSummary: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  items: OutreachProformaLineItem[]
  subtotal: number
  vatIncludedKes: number
  total: number
  notes: string
  /** Second option on another brand (e.g. BLUETTI) shown alongside the main one. */
  alternative?: OutreachProformaOption
}

export interface OutreachProformaOption {
  title: string
  items: OutreachProformaLineItem[]
  total: number
}

export function generateProformaNumber(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `BQ-PRO-${y}${m}${d}-${suffix}`
}

/** Accessories, cables and add-on batteries must never be quoted as the main unit. */
const NOT_A_MAIN_UNIT_RE = /\b(extra\s*battery|cable|connector|plug|hat|charger|power\s*bank|inverter)\b/i

function findCatalogProduct(
  catalog: CatalogProductSummary[],
  match: { slug?: string; pattern: RegExp },
  fallback: { brand: string; name: string; price_kes: number }
): { brand: string; name: string; unitPrice: number } {
  const usable = catalog.filter((p) => Number(p.price_kes) > 0 && !NOT_A_MAIN_UNIT_RE.test(p.name))
  const found =
    (match.slug ? usable.find((p) => p.slug === match.slug) : undefined) ||
    usable.find((p) => match.pattern.test(p.name))
  return found
    ? { brand: found.brand || fallback.brand, name: found.name, unitPrice: Math.round(Number(found.price_kes)) }
    : { brand: fallback.brand, name: fallback.name, unitPrice: fallback.price_kes }
}

/** Live store products used in quotes (power stations + solar panels, in stock). */
export async function fetchProformaCatalog(): Promise<CatalogProductSummary[]> {
  const { fetchStoreCatalogProductsSafe } = await import('./supabase')
  return fetchStoreCatalogProductsSafe(100, ['Power Stations', 'Solar Panels'])
}

export function recalculateProformaPackage(
  pkg: Omit<OutreachProformaPackage, 'subtotal' | 'vatIncludedKes' | 'total'>
): OutreachProformaPackage {
  const cleanItems = pkg.items.map((item) => {
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1))
    const unitPrice = Math.max(0, Math.round(Number(item.unitPrice) || 0))
    return {
      brand: String(item.brand || 'EcoFlow').trim(),
      name: String(item.name || 'Backup Power Unit').trim(),
      quantity: qty,
      unitPrice,
      total: qty * unitPrice,
    }
  })

  const total = cleanItems.reduce((sum, it) => sum + it.total, 0)
  const vatIncludedKes = Math.round((total * 16) / 116)

  return {
    ...pkg,
    items: cleanItems,
    subtotal: total,
    vatIncludedKes,
    total,
  }
}

/**
 * Recommends a sector-tailored Batteriq EcoFlow / BLUETTI commercial backup & solar
 * KES Proforma Invoice package matched to what Batteriq supplies across Kenya.
 */
export function recommendBatteriqProformaForLead(
  lead: Pick<
    OutreachLead,
    'business_name' | 'category' | 'city' | 'address' | 'email' | 'phone_e164'
  >,
  catalog: CatalogProductSummary[] = [],
  customProformaNumber?: string
): OutreachProformaPackage {
  const now = new Date()
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Tiers map to real batteriq.com products (fallbacks = current store prices).
  // Variable names are kept for the sector table below: small / medium / large.
  const delta2 = findCatalogProduct(
    catalog,
    { slug: 'delta-3', pattern: /^ecoflow delta 3$/i },
    { brand: 'EcoFlow', name: 'EcoFlow DELTA 3', price_kes: 99980 }
  )

  const delta2Max = findCatalogProduct(
    catalog,
    { slug: 'delta-3-plus', pattern: /^ecoflow delta 3 plus$/i },
    { brand: 'EcoFlow', name: 'EcoFlow DELTA 3 Plus', price_kes: 112475 }
  )

  const deltaPro = findCatalogProduct(
    catalog,
    { slug: 'delta-pro-3', pattern: /delta\s*pro\s*3/i },
    { brand: 'EcoFlow', name: 'EcoFlow DELTA Pro 3', price_kes: 461799 }
  )

  const solar220 = findCatalogProduct(
    catalog,
    { slug: 'solar-panel-220w', pattern: /220w/i },
    { brand: 'EcoFlow', name: 'EcoFlow Portable Solar Panel 220W', price_kes: 37499 }
  )

  const solar400 = findCatalogProduct(
    catalog,
    { slug: 'solar-panel-400w', pattern: /400w/i },
    { brand: 'EcoFlow', name: 'EcoFlow Portable Solar Panel 400W', price_kes: 71240 }
  )

  const bluetti = findCatalogProduct(
    catalog,
    { slug: 'bluetti-premium-200', pattern: /bluetti/i },
    { brand: 'BLUETTI', name: 'BLUETTI Premium 200', price_kes: 120000 }
  )

  const category: LeadCategory = lead.category || 'other'
  const nameAndAddr = `${lead.business_name} ${lead.address || ''} ${lead.city || ''}`.toLowerCase()
  const isProperty = /\b(property|properties|real\s*estate|rental|rentals|apartment|apartments|tsavo|housing|estate|estates|residence|residences|court)\b/i.test(nameAndAddr)
  const isTech = /\b(tech|technologies|technology|software|fintech|digital|systems|cloud|ai|data|labs|code|cyber|developer|developers|ict)\b/i.test(nameAndAddr)
  const isLaundry = /\b(laundry|laundries|dry\s*clean|dry\s*cleaners|dry\s*cleaning|wash|laundromat|laundromats|cleaners|garment)\b/i.test(nameAndAddr)
  const isSacco = /\b(sacco|cooperative|microfinance|bank|banking|cbo)\b/i.test(nameAndAddr)
  const isPharmacy = /\b(pharmacy|pharmacies|chemist|chemists|pharmaceutical|drugstore)\b/i.test(nameAndAddr)
  const isLaw = /\b(law\s*firm|advocate|advocates|legal|chambers|attorney|attorneys|llp)\b/i.test(nameAndAddr)
  const isRestaurant = /\b(restaurant|restaurants|cafe|cafes|bakery|bakeries|coffee|bistro|diner|eatery)\b/i.test(nameAndAddr)
  const isLogistics = /\b(logistics|freight|courier|warehouse|warehouses|warehousing|cargo|transport|haulage)\b/i.test(nameAndAddr)
  const isAuto = /\b(garage|garages|motors|motor|tyres|tyre|tires|tire|mechanic|dealership)\b/i.test(nameAndAddr)
  const isChurch = /\b(church|cathedral|chapel|ministries|mosque|worship|auditorium)\b/i.test(nameAndAddr)
  const isGym = /\b(gym|gyms|fitness|spa|spas|wellness|salon|salons|barber|barbershop)\b/i.test(nameAndAddr)
  const isAgri = /\b(agri|agribusiness|horticulture|flower|farm|farms|farming|dairy|dairies|greenhouse|poultry)\b/i.test(nameAndAddr)
  const isPetrol = /\b(petrol|fuel|forecourt|petroleum|filling\s*station)\b/i.test(nameAndAddr)

  let systemTitle = 'Commercial Uptime & LiFePO4 Backup Package'
  let useCaseSummary =
    'Silent <20ms automatic UPS switchover for routers, workstations, lighting & critical equipment — zero diesel fumes or maintenance.'
  const isBar = /\b(bar|bars|pub|pubs|lounge|lounges|club|clubs|nightclub|liquor|wines?\s*(and|&)\s*spirits|grill|grills|nyama\s*choma)\b/i.test(nameAndAddr)
  const isButchery = /\b(butchery|butcheries|butcher|meat|fish|dairy\s*shop|milk\s*bar)\b/i.test(nameAndAddr)
  const isSmallShop = /\b(kiosk|kiosks|cyber|printing|minimart|mini\s*mart|m-?pesa\s*shop|duka)\b/i.test(nameAndAddr)
  const isIndividual =
    category === 'other' && !lead.address && !lead.city && !/\b(ltd|limited|company|co\.|enterprises?|group|ventures)\b/i.test(nameAndAddr)

  let rawItems: Array<{ brand: string; name: string; quantity: number; unitPrice: number }> = []

  if (isBar) {
    systemTitle = 'Bar, Pub & Lounge Sound, Lighting, Chiller & Till Backup Package'
    useCaseSummary =
      'Keep the music, lights, TV screens, beer & soda chillers and M-Pesa/POS tills running through KPLC blackouts — silent, no generator noise or fumes for your customers.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isButchery) {
    systemTitle = 'Butchery & Fresh-Food Fridge and Freezer Backup Package'
    useCaseSummary =
      'Protect stock in display fridges and freezers, the scale and M-Pesa till during power cuts — no spoilt meat or milk, no fuel to buy.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isIndividual) {
    systemTitle = 'Home Backup Power Package (Lights, TV, Wi-Fi, Fridge & Phones)'
    useCaseSummary =
      'Silent home backup that switches on automatically when KPLC goes off — keeps lights, TV, Wi-Fi, fridge, laptops and phones running. Charge from the wall or the sun.'
    rawItems = [
      { ...delta2, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isSmallShop) {
    systemTitle = 'Small Shop, Cyber & Kiosk Instant Backup Package'
    useCaseSummary =
      'Keeps lights, computers, printers, phone charging, Wi-Fi and the M-Pesa till running during blackouts so you never close early or lose customers.'
    rawItems = [
      { ...delta2, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isProperty) {
    systemTitle = 'Residential & Commercial Property Common-Area, Pump & Security Backup System'
    useCaseSummary =
      'Zero-diesel, zero-fume silent LiFePO4 backup for tenant common area lighting, borehole/water pressure pumps, CCTV, electric perimeter fences & access gates during KPLC outages.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar400, quantity: 1 },
    ]
  } else if (isTech) {
    systemTitle = 'Tech Startup & Software House Server Room 0ms Failover System'
    useCaseSummary =
      'Pure-sine-wave uninterruptible LiFePO4 power for developer workstations, local build servers, high-throughput network racks & fiber gateways with zero reboot time.'
    rawItems = [
      { ...delta2Max, quantity: 2 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isLaundry) {
    systemTitle = 'Commercial Laundromat High-Surge Washer & Billing Backup Package'
    useCaseSummary =
      'High-surge motor inverter support for commercial front-load washers, steam valve controls, POS billing & pump systems without smoke or expensive diesel fuel refilling.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isSacco) {
    systemTitle = 'SACCO Branch Teller, Biometric ATM & Server Vault Backup System'
    useCaseSummary =
      'Instant <20ms automatic UPS switchover for cash teller counters, biometric scanners, vault time-locks, CCTV security & member transaction servers during blackouts.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...delta2Max, quantity: 1 },
    ]
  } else if (isPharmacy) {
    systemTitle = 'Pharmacy Cold-Chain Medicine & Retail Dispensing Backup Package'
    useCaseSummary =
      'Zero-diesel, zero-fume indoor power safeguarding insulin/vaccine cold-chain fridges, POS billing computers, digital prescription dispensing & security lighting.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isLaw) {
    systemTitle = 'Law Chambers Virtual Court & High-Volume Printing Uptime Package'
    useCaseSummary =
      'Continuous pure-sine-wave backup for virtual Zoom court hearings (Judiciary e-filing), high-speed heavy legal document printers, server registries & client boardroom Wi-Fi.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isRestaurant) {
    systemTitle = 'Restaurant, Cafe & Bakery Espresso & POS Continuity System'
    useCaseSummary =
      'Keep commercial espresso baristas, POS touchscreens, order ticket printers, kitchen display units & draft beverage chillers running silently without generator smoke scaring guests.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isLogistics) {
    systemTitle = 'Logistics Warehouse Weighbridge, Barcode & Gate Continuity System'
    useCaseSummary =
      'Keep automated weighbridge computers, dispatch thermal label printers, automated gate barriers, barcode scanners & yard security floodlights running during KPLC cuts.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar400, quantity: 1 },
    ]
  } else if (isAuto) {
    systemTitle = 'Automotive Garage Electronic Diagnostic & Lift Safety Backup System'
    useCaseSummary =
      'Uninterruptible power for vehicle OBD-II diagnostic scanning stations, computerized wheel alignment racks, hydraulic lift safety locks & front-office customer billing desks.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isChurch) {
    systemTitle = 'Church & Auditorium Live Broadcast, Sound & LED Wall System'
    useCaseSummary =
      'High-wattage pure-sine-wave power for live-streaming video switchers, multi-channel sound audio mixers, LED backdrop displays & musical instrument amplifiers with zero audio hum.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar400, quantity: 1 },
    ]
  } else if (isGym) {
    systemTitle = 'Gym & Wellness Center Sound, Biometric Turnstile & Lighting Backup'
    useCaseSummary =
      'Keep commercial audio systems, treadmill display consoles, biometric entry turnstiles, juice bar blenders & spa ambient lighting online seamlessly during power drops.'
    rawItems = [
      { ...delta2Max, quantity: 1 },
      { ...solar220, quantity: 1 },
    ]
  } else if (isAgri) {
    systemTitle = 'Agribusiness & Greenhouse Automated Drip Irrigation & Cold Packhouse Backup'
    useCaseSummary =
      'Solar-hybrid LiFePO4 backup for automated drip solenoid timers, temperature/humidity sensors, egg incubators & packhouse cold-storage monitoring without diesel fuel logistics.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar400, quantity: 1 },
    ]
  } else if (isPetrol) {
    systemTitle = 'Petrol Station Digital Fuel Pump & Forecourt POS Uptime System'
    useCaseSummary =
      'Keep digital electronic fuel dispensers, underground automatic tank gauges (ATG), canopy LED lighting & convenience mart POS tills running without generator changeover flickers.'
    rawItems = [
      { ...deltaPro, quantity: 1 },
      { ...solar400, quantity: 1 },
    ]
  } else {
    switch (category) {
      case 'retail':
      case 'shop':
        systemTitle = 'Retail Store, POS & Lighting Instant Backup Package'
        useCaseSummary =
          'Keeps POS tills, M-Pesa terminals, barcode scanners, warm shop lighting, Wi-Fi & CCTV running seamlessly during KPLC blackouts.'
        rawItems = [
          { ...delta2, quantity: 1 },
          { ...solar220, quantity: 1 },
        ]
        break

      case 'school':
        systemTitle = 'Campus ICT Lab, Smart Classroom & Admin Backup System'
        useCaseSummary =
          'Powers school ICT servers, Wi-Fi network, smart boards, administration offices & CCTV silently with zero generator noise.'
        rawItems = [
          { ...delta2Max, quantity: 2 },
          { ...solar400, quantity: 1 },
        ]
        break

      case 'ngo':
        systemTitle = 'NGO Office & Field Operations Solar-Hybrid Backup Kit'
        useCaseSummary =
          'Clean portable LiFePO4 + solar power for headquarters, field routers, laptops & project equipment without diesel fuel logistics.'
        rawItems = [
          { ...delta2Max, quantity: 1 },
          { ...solar220, quantity: 2 },
        ]
        break

      case 'government':
        systemTitle = 'Parastatal & Public Service ICT Continuity Package'
        useCaseSummary =
          'Institutional-grade 3.6kWh–7.2kWh pure-sine-wave backup for public service desks, registries, servers & security infrastructure.'
        rawItems = [
          { ...deltaPro, quantity: 2 },
          { ...solar400, quantity: 2 },
        ]
        break

      case 'hospital':
        systemTitle = 'Medical Cold-Chain, Clinic & Diagnostic Backup System'
        useCaseSummary =
          'Zero-fume indoor lithium backup for vaccine/pharmacy refrigeration, lab diagnostics, patient monitors, HMIS & clinic lighting.'
        rawItems = [
          { ...deltaPro, quantity: 1 },
          { ...delta2Max, quantity: 1 },
        ]
        break

      case 'hotel':
        systemTitle = 'Silent Hospitality Guest Suite & Reception Backup System'
        useCaseSummary =
          'Silent, zero-emission power for reception, Wi-Fi, conference rooms, POS & VIP suites without disturbing guests.'
        rawItems = [
          { ...deltaPro, quantity: 1 },
          { ...solar400, quantity: 1 },
        ]
        break

      default:
        systemTitle = 'Corporate Office & Server Room Uptime Package'
        useCaseSummary =
          'Automatic <20ms switchover for routers, servers, workstations, access control & office lighting during KPLC outages.'
        rawItems = [
          { ...delta2Max, quantity: 1 },
          { ...solar220, quantity: 1 },
        ]
        break
    }
  }

  const items: OutreachProformaLineItem[] = rawItems.map((it) => ({
    brand: it.brand,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    total: it.quantity * it.unitPrice,
  }))

  const notes = [
    'This quotation shares the options we recommend for you; nothing is owed until you choose to order.',
    'Prices are in KES including 16% VAT and are held for 14 days. A KRA eTIMS tax invoice is issued when you order.',
    'Includes the official 24-month warranty, free sizing advice and delivery (same day within Nairobi).',
    'Pay by M-Pesa, card, bank transfer or LPO, or order directly at batteriq.com.',
  ].join(' ')

  // Second option on the BLUETTI range (large sites: two units)
  const mainIsLarge = rawItems.some((it) => it.name === deltaPro.name)
  const altQty = mainIsLarge ? 2 : 1
  const alternative = {
    title: `BLUETTI option: ${bluetti.name}${altQty > 1 ? ` x${altQty}` : ''}`,
    items: [
      {
        brand: 'BLUETTI',
        name: bluetti.name,
        quantity: altQty,
        unitPrice: bluetti.unitPrice,
        total: altQty * bluetti.unitPrice,
      },
    ],
    total: altQty * bluetti.unitPrice,
  }

  return recalculateProformaPackage({
    alternative,
    proformaNumber: customProformaNumber || generateProformaNumber(now),
    issueDateIso: now.toISOString(),
    validUntilIso: validUntil.toISOString(),
    systemTitle,
    useCaseSummary,
    customerName: lead.business_name,
    customerEmail: lead.email || '',
    customerPhone: lead.phone_e164 || '',
    customerAddress: lead.address || (lead.city ? `${lead.city}, Kenya` : 'Kenya'),
    items,
    notes,
  })
}

export function buildProformaEmailCardHtml(proforma: OutreachProformaPackage): string {
  const rowsHtml = proforma.items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12.5px;color:#111827;font-weight:600;">
            <span style="display:block;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(it.brand)}</span>
            ${escapeHtml(it.name)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:12.5px;color:#374151;text-align:center;font-weight:700;">
            ${it.quantity}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12.5px;color:#111827;text-align:right;font-weight:700;white-space:nowrap;">
            KES ${it.total.toLocaleString('en-KE')}
          </td>
        </tr>`
    )
    .join('')

  return `
    <div style="margin:24px 0;border:1px solid #dbeafe;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#070d26 0%,#0f1f5c 100%);padding:14px 18px;color:#ffffff;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:#93c5fd;font-weight:800;">
          Tailored Proforma Quotation · #${escapeHtml(proforma.proformaNumber)}
        </div>
        <div style="font-size:14px;font-weight:800;margin-top:3px;color:#ffffff;">
          ${escapeHtml(proforma.systemTitle)}
        </div>
        <div style="font-size:11.5px;color:#cbd5e1;margin-top:3px;line-height:1.45;">
          ${escapeHtml(proforma.useCaseSummary)}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;border-bottom:1px solid #e2e8f0;">Recommended Solution</th>
            <th style="padding:8px 8px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;border-bottom:1px solid #e2e8f0;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;border-bottom:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="padding:12px 18px;background:#f8faff;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #dbeafe;">
        <span style="font-size:11.5px;color:#475569;font-weight:600;">
          Total Proforma (Incl. 16% VAT · KRA eTIMS Ready · PDF Attached)
        </span>
        <span style="font-size:15px;color:#0f172a;font-weight:900;margin-left:12px;">
          KES ${proforma.total.toLocaleString('en-KE')}
        </span>
      </div>
    </div>`
}

export function buildProformaEmailTextBlock(proforma: OutreachProformaPackage): string {
  const lines = proforma.items.map(
    (it, idx) =>
      `  ${idx + 1}. [${it.brand}] ${it.name} x${it.quantity} — KES ${it.total.toLocaleString('en-KE')}`
  )
  return [
    `--- TAILORED BATTERIQ PROFORMA QUOTATION (#${proforma.proformaNumber}) ---`,
    `Package: ${proforma.systemTitle}`,
    ...lines,
    `Total (Incl. 16% VAT & 24-Month Warranty): KES ${proforma.total.toLocaleString('en-KE')}`,
    `(Official PDF Proforma attached — reply to customize quantities or issue an LPO)`,
  ].join('\n')
}

export async function generateOutreachProformaPdfBase64(
  proforma: OutreachProformaPackage
): Promise<string> {
  const options: QuotationOption[] = [
    {
      label: 'Option 1',
      title: proforma.items.map((it) => it.name).join(' + ') || proforma.systemTitle,
      items: proforma.items,
      total: proforma.total,
      recommended: true,
    },
  ]
  if (proforma.alternative && proforma.alternative.items.length > 0) {
    options.push({
      label: 'Option 2',
      title: proforma.alternative.title.replace(/^BLUETTI option:\s*/i, ''),
      items: proforma.alternative.items,
      total: proforma.alternative.total,
    })
  }
  return generateQuotationPDF({
    quoteNumber: proforma.proformaNumber,
    issueDateIso: proforma.issueDateIso,
    validUntilIso: proforma.validUntilIso,
    preparedFor: proforma.customerName,
    customerPhone: proforma.customerPhone,
    customerEmail: proforma.customerEmail,
    customerAddress: proforma.customerAddress,
    headline: proforma.systemTitle,
    summary: proforma.useCaseSummary,
    options,
    notes: proforma.notes,
    websiteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').trim().replace(/\/+$/, ''),
  })
}
