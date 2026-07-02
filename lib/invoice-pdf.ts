/**
 * Batteriq — High-end Invoice PDF Generator
 * Uses jsPDF (already a project dependency via lib/pdf-receipt.ts)
 * Outputs a base64-encoded PDF string for email attachment.
 */

export interface InvoiceData {
  orderNumber: string
  invoiceDate: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  items: Array<{
    brand: string
    name: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  total: number
  paymentStatus: string
  mpesaRef?: string
  totalPaid: number
  totalDue: number
  notes?: string
}

function fmt(n: number): string {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const { jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 16
  const col2 = W - margin  // right edge
  let y = 0

  // ─── COLOUR CONSTANTS ───────────────────────────────────────────
  const NAVY  = [0, 0, 64]
  const BLUE  = [0, 0, 220]
  const WHITE = [255, 255, 255]
  const GRAY  = [120, 120, 140]
  const LGRAY = [240, 241, 245]
  const GREEN = [22, 163, 74]
  const AMBER = [217, 119, 6]
  const BLACK = [17, 17, 17]

  // ─── HEADER BAND ────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 52, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.text('BATTERIQ', margin, 18)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(180, 190, 220)
  doc.text('GUARANTEE YOUR UPTIME', margin, 24)

  // INVOICE label on right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...WHITE)
  doc.text('INVOICE', col2, 18, { align: 'right' })

  // Order number
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(160, 175, 210)
  doc.text(`#${data.orderNumber}`, col2, 24, { align: 'right' })

  // Invoice date
  doc.setFontSize(8)
  doc.text(`Invoice Date: ${fmtDate(data.invoiceDate)}`, col2, 30, { align: 'right' })

  y = 62

  // ─── FROM / TO COLUMNS ──────────────────────────────────────────
  const colW = 82

  // FROM box
  doc.setFillColor(...LGRAY)
  doc.roundedRect(margin, y, colW, 42, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('FROM', margin + 5, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text('Batteriq Solutions Ltd', margin + 5, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text('Kijabe Street Block 17', margin + 5, y + 21)
  doc.text('Nairobi, Kenya', margin + 5, y + 27)
  doc.text('+254 716 822 014', margin + 5, y + 33)
  doc.text('info@batteriq.com', margin + 5, y + 39)

  // TO box
  const toX = margin + colW + 8
  doc.setFillColor(...LGRAY)
  doc.roundedRect(toX, y, colW, 42, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('BILL TO', toX + 5, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text(data.customerName, toX + 5, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  if (data.customerEmail) doc.text(data.customerEmail, toX + 5, y + 21)
  if (data.customerPhone) doc.text(data.customerPhone, toX + 5, y + 27)
  if (data.customerAddress) {
    const addr = doc.splitTextToSize(data.customerAddress, colW - 12)
    doc.text(addr[0], toX + 5, y + 33)
    if (addr[1]) doc.text(addr[1], toX + 5, y + 39)
  }

  y += 52

  // ─── PAYMENT STATUS BADGE ───────────────────────────────────────
  const isPaid = data.paymentStatus === 'paid'
  const badgeColor = isPaid ? GREEN : AMBER
  doc.setFillColor(...badgeColor.map(c => c * 0.1 + 230) as [number, number, number])
  doc.roundedRect(margin, y, W - margin * 2, 14, 3, 3, 'F')
  doc.setDrawColor(...badgeColor as [number, number, number])
  doc.setLineWidth(0.6)
  doc.roundedRect(margin, y, W - margin * 2, 14, 3, 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...badgeColor as [number, number, number])
  doc.text(
    isPaid
      ? `PAID — ${fmt(data.total)}${data.mpesaRef ? `  ·  M-Pesa: ${data.mpesaRef}` : ''}`
      : `PAYMENT PENDING — ${fmt(data.totalDue)} DUE`,
    W / 2, y + 9, { align: 'center' }
  )

  y += 22

  // ─── ITEMS TABLE HEADER ─────────────────────────────────────────
  doc.setFillColor(...NAVY as [number, number, number])
  doc.rect(margin, y, W - margin * 2, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE as [number, number, number])
  doc.text('#', margin + 3, y + 6.5)
  doc.text('PRODUCT', margin + 12, y + 6.5)
  doc.text('QTY', col2 - 50, y + 6.5, { align: 'center' })
  doc.text('UNIT PRICE', col2 - 32, y + 6.5, { align: 'right' })
  doc.text('AMOUNT', col2, y + 6.5, { align: 'right' })
  y += 10

  // ─── ITEM ROWS ──────────────────────────────────────────────────
  data.items.forEach((item, idx) => {
    const rowH = 14
    const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 249, 253]
    doc.setFillColor(...bg)
    doc.rect(margin, y, W - margin * 2, rowH, 'F')

    // Row number
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY as [number, number, number])
    doc.text(`${idx + 1}`, margin + 3, y + 9)

    // Brand + name
    if (item.brand) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...BLUE as [number, number, number])
      doc.text(item.brand.toUpperCase(), margin + 12, y + 5.5)
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK as [number, number, number])
    const nameStr = doc.splitTextToSize(item.name, 78)
    doc.text(nameStr[0], margin + 12, y + item.brand ? 11 : 9)

    // Qty
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK as [number, number, number])
    doc.text(`${item.quantity}`, col2 - 50, y + 9, { align: 'center' })

    // Unit price
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY as [number, number, number])
    doc.text(fmt(item.unitPrice), col2 - 32, y + 9, { align: 'right' })

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLUE as [number, number, number])
    doc.text(fmt(item.total), col2, y + 9, { align: 'right' })

    y += rowH
  })

  // Bottom border of table
  doc.setDrawColor(...LGRAY as [number, number, number])
  doc.setLineWidth(0.4)
  doc.line(margin, y, col2, y)
  y += 8

  // ─── TOTALS BLOCK ───────────────────────────────────────────────
  const totalsX = 120
  const totalsW = col2 - totalsX

  function totalsRow(label: string, value: string, bold = false, color = BLACK) {
    if (bold) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
    }
    doc.setTextColor(...GRAY as [number, number, number])
    doc.text(label, totalsX, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 11 : 8.5)
    doc.setTextColor(...color as [number, number, number])
    doc.text(value, col2, y, { align: 'right' })
    y += bold ? 7 : 6
  }

  totalsRow('Subtotal', fmt(data.subtotal))
  totalsRow('Discount', 'N/A')
  totalsRow('Tax', 'N/A')

  // Divider
  doc.setDrawColor(...LGRAY as [number, number, number])
  doc.setLineWidth(0.5)
  doc.line(totalsX, y, col2, y)
  y += 5

  totalsRow('Total', fmt(data.total), true, NAVY)
  y += 2
  totalsRow('Total Paid', isPaid ? fmt(data.totalPaid) : 'KES 0', false, isPaid ? GREEN : GRAY)
  totalsRow('Total Due', isPaid ? 'KES 0.00' : fmt(data.totalDue), false, isPaid ? GRAY : [180, 30, 30])

  y += 10

  // ─── NOTES BOX ──────────────────────────────────────────────────
  doc.setFillColor(...LGRAY as [number, number, number])
  doc.roundedRect(margin, y, W - margin * 2, 26, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY as [number, number, number])
  doc.text('NOTES', margin + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 110)
  if (data.notes && data.notes.trim()) {
    const noteLines = doc.splitTextToSize(data.notes.trim(), W - margin * 2 - 10)
    doc.text(noteLines.slice(0, 2), margin + 5, y + 14)
  } else {
    doc.text('An official eTIMS KRA invoice will be issued within 24 hours of payment confirmation.', margin + 5, y + 14)
    doc.text('For support: call +254 716 822 014 or email info@batteriq.com', margin + 5, y + 20)
  }
  y += 34

  // ─── FOOTER ─────────────────────────────────────────────────────
  doc.setFillColor(...NAVY as [number, number, number])
  doc.rect(0, 280, W, 17, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 175, 210)
  doc.text('Batteriq Solutions Ltd · Kijabe Street Block 17, Nairobi, Kenya', W / 2, 288, { align: 'center' })
  doc.text('batteriq.com · info@batteriq.com · +254 716 822 014', W / 2, 293, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}
