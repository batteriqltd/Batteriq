import crypto from 'crypto'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
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
}

export function generateProformaNumber(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `BQ-PRO-${y}${m}${d}-${suffix}`
}

function findCatalogProduct(
  catalog: CatalogProductSummary[],
  pattern: RegExp,
  fallback: { brand: string; name: string; price_kes: number }
): { brand: string; name: string; unitPrice: number } {
  const match = catalog.find((p) => pattern.test(p.name) && Number(p.price_kes) > 0)
  if (match) {
    return {
      brand: match.brand || fallback.brand,
      name: match.name,
      unitPrice: Math.round(Number(match.price_kes)),
    }
  }
  return {
    brand: fallback.brand,
    name: fallback.name,
    unitPrice: fallback.price_kes,
  }
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

  const delta2 = findCatalogProduct(catalog, /delta\s*2\b(?!\s*max)/i, {
    brand: 'EcoFlow',
    name: 'EcoFlow DELTA 2 Portable Power Station (1024Wh LiFePO4, 1800W AC, <20ms EPS)',
    price_kes: 145000,
  })

  const delta2Max = findCatalogProduct(catalog, /delta\s*(2\s*max|3\s*max|3\s*plus)/i, {
    brand: 'EcoFlow',
    name: 'EcoFlow DELTA 2 Max Commercial Backup Station (2048Wh LiFePO4, 2400W AC)',
    price_kes: 265000,
  })

  const deltaPro = findCatalogProduct(catalog, /delta\s*pro/i, {
    brand: 'EcoFlow',
    name: 'EcoFlow DELTA Pro Institutional Power Station (3600Wh LiFePO4, 3600W AC)',
    price_kes: 420000,
  })

  const solar220 = findCatalogProduct(catalog, /220w|200w|solar\s*panel/i, {
    brand: 'EcoFlow',
    name: 'EcoFlow 220W Bifacial Solar Panel Kit (IP68 Waterproof)',
    price_kes: 78000,
  })

  const solar400 = findCatalogProduct(catalog, /400w/i, {
    brand: 'EcoFlow',
    name: 'EcoFlow 400W Commercial Solar Array Panel',
    price_kes: 125000,
  })

  const category: LeadCategory = lead.category || 'other'

  let systemTitle = 'Commercial Uptime & LiFePO4 Backup Package'
  let useCaseSummary =
    'Silent <20ms automatic UPS switchover for routers, workstations, lighting & critical equipment — zero diesel fumes or maintenance.'
  let rawItems: Array<{ brand: string; name: string; quantity: number; unitPrice: number }> = []

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

  const items: OutreachProformaLineItem[] = rawItems.map((it) => ({
    brand: it.brand,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    total: it.quantity * it.unitPrice,
  }))

  const notes = [
    'PROFORMA QUOTATION (Valid for 14 days from issue date).',
    'All prices are in KES inclusive of 16% VAT. Official KRA eTIMS Tax Invoice issued upon LPO / payment confirmation.',
    'Includes official 24-month+ manufacturer warranty in Kenya, free load-sizing consultation & insured delivery.',
    'Accepted settlement: Corporate LPO / Bank Transfer, M-Pesa Business, or Visa/Mastercard via batteriq.com.',
  ].join(' ')

  return recalculateProformaPackage({
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
  return generateInvoicePDF({
    orderNumber: proforma.proformaNumber,
    invoiceDate: proforma.issueDateIso,
    customerName: proforma.customerName,
    customerEmail: proforma.customerEmail,
    customerPhone: proforma.customerPhone,
    customerAddress: proforma.customerAddress,
    items: proforma.items,
    subtotal: proforma.subtotal,
    total: proforma.total,
    paymentStatus: 'pending',
    totalPaid: 0,
    totalDue: proforma.total,
    notes: proforma.notes,
  })
}
