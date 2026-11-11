/**
 * Batteriq — Quotation / options PDF (sales proposals sent to prospects).
 *
 * Unlike lib/invoice-pdf.ts this never shows "invoice", "payment pending",
 * "paid" or "due": it presents the recommended options and their prices.
 */

export interface QuotationLine {
  brand: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface QuotationOption {
  label: string
  title: string
  items: QuotationLine[]
  total: number
  recommended?: boolean
}

export interface QuotationData {
  quoteNumber: string
  issueDateIso: string
  validUntilIso: string
  preparedFor: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  headline: string
  summary: string
  options: QuotationOption[]
  notes: string
  websiteUrl: string
}

function fmt(n: number): string {
  return `KES ${Math.round(Number(n || 0)).toLocaleString('en-KE')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** jsPDF's built-in fonts are Latin-1 only; replace characters it can't draw. */
function pdfSafe(text: string): string {
  return String(text || '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
}

type RGB = [number, number, number]

export async function generateQuotationPDF(data: QuotationData): Promise<string> {
  const { jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 16
  const right = W - margin
  const NAVY: RGB = [0, 0, 64]
  const BLUE: RGB = [30, 78, 135]
  const WHITE: RGB = [255, 255, 255]
  const GRAY: RGB = [110, 115, 135]
  const LGRAY: RGB = [242, 244, 248]
  const BLACK: RGB = [17, 17, 17]
  const GREEN: RGB = [22, 130, 74]

  let y = 0
  const ensureSpace = (h: number) => {
    if (y + h > 278) {
      doc.addPage()
      y = 20
    }
  }

  // ── Header ────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 46, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.text('BATTERIQ', margin, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(180, 190, 220)
  doc.text('AUTHORISED ECOFLOW & BLUETTI DEALER IN KENYA', margin, 24)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...WHITE)
  doc.text('QUOTATION', right, 18, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(170, 185, 215)
  doc.text(`#${pdfSafe(data.quoteNumber)}`, right, 25, { align: 'right' })
  doc.text(`Date: ${fmtDate(data.issueDateIso)}`, right, 31, { align: 'right' })
  doc.text(`Prices held until: ${fmtDate(data.validUntilIso)}`, right, 37, { align: 'right' })

  y = 56

  // ── Prepared for / by ─────────────────────────────────────────────────
  const colW = 84
  const box = (x: number, title: string, lines: string[]) => {
    doc.setFillColor(...LGRAY)
    doc.roundedRect(x, y, colW, 34, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(title, x + 5, y + 7)
    doc.setFontSize(10)
    doc.setTextColor(...BLACK)
    doc.text(doc.splitTextToSize(pdfSafe(lines[0]), colW - 10)[0], x + 5, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY)
    lines.slice(1, 4).forEach((l, i) => {
      if (l) doc.text(doc.splitTextToSize(pdfSafe(l), colW - 10)[0], x + 5, y + 20 + i * 5.5)
    })
  }
  box(margin, 'PREPARED FOR', [
    data.preparedFor || 'Valued Customer',
    data.customerAddress || '',
    data.customerPhone || '',
    data.customerEmail || '',
  ])
  box(right - colW, 'FROM', [
    'Batteriq Solutions Ltd',
    'Kijabe Street Block 17, Nairobi',
    '+254 716 822 014',
    'info@batteriq.com',
  ])
  y += 44

  // ── Headline ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  const headLines = doc.splitTextToSize(pdfSafe(data.headline), W - margin * 2)
  doc.text(headLines, margin, y)
  y += headLines.length * 6
  if (data.summary) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    const sum = doc.splitTextToSize(pdfSafe(data.summary), W - margin * 2)
    doc.text(sum, margin, y + 1)
    y += sum.length * 4.6 + 4
  }

  // ── Options ───────────────────────────────────────────────────────────
  for (const opt of data.options) {
    ensureSpace(40 + opt.items.length * 12)
    // option heading bar
    doc.setFillColor(...(opt.recommended ? BLUE : NAVY))
    doc.roundedRect(margin, y, W - margin * 2, 11, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.text(pdfSafe(`${opt.label}: ${opt.title}`).slice(0, 90), margin + 4, y + 7.2)
    if (opt.recommended) {
      doc.setFontSize(7)
      doc.text('RECOMMENDED', right - 4, y + 7.2, { align: 'right' })
    }
    y += 11

    // column labels
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('PRODUCT', margin + 4, y + 6)
    doc.text('QTY', right - 62, y + 6, { align: 'center' })
    doc.text('UNIT PRICE', right - 32, y + 6, { align: 'right' })
    doc.text('AMOUNT', right - 2, y + 6, { align: 'right' })
    y += 8

    opt.items.forEach((it, idx) => {
      const nameLines = doc.splitTextToSize(pdfSafe(it.name), 92)
      const rowH = 11 + Math.max(0, nameLines.length - 1) * 4.2
      doc.setFillColor(...((idx % 2 === 0 ? [255, 255, 255] : [248, 249, 253]) as RGB))
      doc.rect(margin, y, W - margin * 2, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...BLUE)
      doc.text(pdfSafe(it.brand).toUpperCase(), margin + 4, y + 4.5)
      doc.setFontSize(8.8)
      doc.setTextColor(...BLACK)
      doc.text(nameLines, margin + 4, y + 9)
      doc.setFontSize(9)
      doc.text(String(it.quantity), right - 62, y + 8, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)
      doc.text(fmt(it.unitPrice), right - 32, y + 8, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      doc.text(fmt(it.total), right - 2, y + 8, { align: 'right' })
      y += rowH
    })

    doc.setDrawColor(225, 228, 236)
    doc.setLineWidth(0.4)
    doc.line(margin, y, right, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.text(`${opt.label} total (incl. VAT)`, right - 62, y, { align: 'right' })
    doc.setFontSize(11.5)
    doc.text(fmt(opt.total), right - 2, y, { align: 'right' })
    y += 10
  }

  // ── What's included ───────────────────────────────────────────────────
  ensureSpace(40)
  doc.setFillColor(...LGRAY)
  doc.roundedRect(margin, y, W - margin * 2, 30, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GREEN)
  doc.text("WHAT'S INCLUDED", margin + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 64, 80)
  const included = [
    'Official 24-month warranty, genuine units from the authorised dealer',
    'Free sizing advice and delivery (same day within Nairobi)',
    'Silent, fuel-free backup that switches on automatically when the power goes',
    `Pay by M-Pesa, card, bank transfer or LPO, or order online at ${data.websiteUrl.replace(/^https?:\/\//, '')}`,
  ]
  included.forEach((l, i) => doc.text(`-  ${pdfSafe(l)}`, margin + 5, y + 13 + i * 4.6))
  y += 36

  // ── Notes ─────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...GRAY)
    const n = doc.splitTextToSize(pdfSafe(data.notes), W - margin * 2).slice(0, 4)
    ensureSpace(n.length * 3.4 + 2)
    doc.text(n, margin, y)
  }

  // ── Footer (every page) ───────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFillColor(...NAVY)
    doc.rect(0, 282, W, 15, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(170, 185, 215)
    doc.text('Batteriq Solutions Ltd  ·  Kijabe Street Block 17, Nairobi, Kenya', W / 2, 288, { align: 'center' })
    doc.text(`${data.websiteUrl.replace(/^https?:\/\//, '')}  ·  info@batteriq.com  ·  +254 716 822 014`, W / 2, 293, {
      align: 'center',
    })
  }

  return doc.output('datauristring').split(',')[1]
}
