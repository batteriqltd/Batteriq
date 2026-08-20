export interface ReceiptData {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: Array<{
    brand?: string
    name: string
    quantity: number
    price_kes: number | string
  }>
  totalKes: number
  paymentMethod: string
  paymentStatus: string
  mpesaRef?: string
  /** Label for the provider reference line. Defaults to 'M-Pesa Ref'. */
  refLabel?: string
  deliveryAddress: {
    street?: string
    city?: string
    county?: string
    instructions?: string
  }
  createdAt: string
  fulfillmentStatus?: string
}

function fmt(n: number | string): string {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

function paymentLabel(method: string): string {
  const m: Record<string, string> = {
    mpesa_now: 'M-Pesa STK Push',
    cod_cash: 'Cash on Delivery',
    cod_mpesa: 'M-Pesa at Doorstep',
    sales_confirmation: 'Reserve Order — Pay After Confirmation',
    pesapal_card: 'Visa / Mastercard (Pesapal)',
    mpesa: 'M-Pesa',
    cash: 'Cash',
  }
  return m[method] ?? method
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function generateReceiptPDF(data: ReceiptData): Promise<string> {
  const { jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 18
  let y = 0

  // ── HEADER BAND ──
  doc.setFillColor(0, 0, 77)
  doc.rect(0, 0, W, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('BATTERIQ', margin, 17)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 255)
  doc.text("Guarantee your Uptime  ·  Kenya's Official EcoFlow Dealer", margin, 24)
  doc.text('batteriq.com  ·  info@batteriq.com  ·  Nairobi, Kenya', margin, 30)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const receiptLabel = data.paymentStatus === 'paid' ? 'OFFICIAL PAID RECEIPT' : 'ORDER RECEIPT — PENDING PAYMENT'
  doc.text(receiptLabel, W - margin, 17, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 255)
  doc.text(fmtDate(data.createdAt), W - margin, 23, { align: 'right' })

  y = 50

  // ── ORDER NUMBER BOX ──
  doc.setFillColor(239, 246, 255)
  doc.roundedRect(margin, y, W - margin * 2, 18, 3, 3, 'F')
  doc.setTextColor(0, 0, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDER NUMBER', margin + 6, y + 6)
  doc.setFontSize(14)
  doc.text(data.orderNumber, margin + 6, y + 13)

  if (data.paymentStatus === 'paid') {
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(W - margin - 30, y + 3, 28, 10, 3, 3, 'F')
    doc.setTextColor(22, 101, 52)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PAID', W - margin - 16, y + 10, { align: 'center' })
  } else {
    doc.setFillColor(254, 243, 199)
    doc.roundedRect(W - margin - 30, y + 3, 28, 10, 3, 3, 'F')
    doc.setTextColor(146, 64, 14)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PENDING', W - margin - 16, y + 10, { align: 'center' })
  }

  y += 26

  // ── CUSTOMER + PAYMENT INFO ──
  const colW = (W - margin * 2 - 6) / 2

  doc.setFillColor(248, 250, 255)
  doc.roundedRect(margin, y, colW, 38, 2, 2, 'F')
  doc.setTextColor(153, 153, 153)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CUSTOMER', margin + 4, y + 6)
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(data.customerName, margin + 4, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(85, 85, 85)
  doc.text(data.customerEmail, margin + 4, y + 18)
  doc.text(data.customerPhone, margin + 4, y + 24)
  if (data.deliveryAddress?.city) {
    doc.text(`${data.deliveryAddress.city}, ${data.deliveryAddress.county ?? ''}`, margin + 4, y + 30)
  }

  const col2x = margin + colW + 6
  doc.setFillColor(248, 250, 255)
  doc.roundedRect(col2x, y, colW, 38, 2, 2, 'F')
  doc.setTextColor(153, 153, 153)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT', col2x + 4, y + 6)
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(paymentLabel(data.paymentMethod), col2x + 4, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(85, 85, 85)
  doc.text(`Status: ${data.paymentStatus === 'paid' ? 'Confirmed' : 'Pending'}`, col2x + 4, y + 18)
  if (data.mpesaRef) {
    doc.text(`${data.refLabel ?? 'M-Pesa Ref'}: ${data.mpesaRef}`, col2x + 4, y + 24)
  }

  y += 46

  // ── ITEMS TABLE ──
  doc.setFillColor(0, 0, 77)
  doc.rect(margin, y, W - margin * 2, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCT', margin + 3, y + 6)
  doc.text('QTY', W - margin - 46, y + 6, { align: 'right' })
  doc.text('UNIT PRICE', W - margin - 24, y + 6, { align: 'right' })
  doc.text('TOTAL', W - margin - 2, y + 6, { align: 'right' })
  y += 9

  data.items.forEach((item, i) => {
    const rowH = 14
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 255)
      doc.rect(margin, y, W - margin * 2, rowH, 'F')
    }

    doc.setTextColor(0, 0, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text((item.brand ?? '').toUpperCase(), margin + 3, y + 5)

    doc.setTextColor(17, 17, 17)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const name = item.name.length > 45 ? item.name.slice(0, 42) + '...' : item.name
    doc.text(name, margin + 3, y + 10)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(85, 85, 85)
    doc.text(String(item.quantity), W - margin - 46, y + 9, { align: 'right' })

    doc.setTextColor(85, 85, 85)
    doc.text(fmt(item.price_kes), W - margin - 24, y + 9, { align: 'right' })

    doc.setTextColor(0, 0, 77)
    doc.setFontSize(8.5)
    doc.text(fmt(Number(item.price_kes) * item.quantity), W - margin - 2, y + 9, { align: 'right' })

    y += rowH
  })

  // ── TOTALS ──
  doc.setDrawColor(224, 231, 255)
  doc.line(margin, y + 2, W - margin, y + 2)
  y += 6

  doc.setFillColor(239, 246, 255)
  doc.roundedRect(W - margin - 70, y, 68, 22, 2, 2, 'F')
  doc.setTextColor(85, 85, 85)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', W - margin - 64, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.totalKes), W - margin - 4, y + 7, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(5, 150, 105)
  doc.text('Delivery', W - margin - 64, y + 14)
  doc.text('Calculated on delivery', W - margin - 4, y + 14, { align: 'right' })

  y += 26

  doc.setFillColor(0, 0, 77)
  doc.roundedRect(W - margin - 70, y, 68, 14, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', W - margin - 64, y + 9)
  doc.setFontSize(10)
  doc.text(fmt(data.totalKes), W - margin - 4, y + 9, { align: 'right' })

  y += 22

  // ── DELIVERY ADDRESS ──
  if (data.deliveryAddress?.street) {
    doc.setFillColor(248, 250, 255)
    doc.roundedRect(margin, y, W - margin * 2, 24, 2, 2, 'F')
    doc.setTextColor(153, 153, 153)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('DELIVERY ADDRESS', margin + 4, y + 6)
    doc.setTextColor(17, 17, 17)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(data.deliveryAddress.street, margin + 4, y + 12)
    doc.text(`${data.deliveryAddress.city ?? ''}, ${data.deliveryAddress.county ?? ''}`, margin + 4, y + 18)
    y += 28
  }

  // ── eTIMS NOTE ──
  if (y < 257) {
    doc.setFillColor(245, 243, 255)
    doc.roundedRect(margin, y, W - margin * 2, 18, 2, 2, 'F')
    doc.setTextColor(124, 58, 237)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('eTIMS KRA INVOICE:', margin + 4, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(109, 40, 217)
    doc.text('Official eTIMS KRA invoice issued separately upon payment confirmation.', margin + 4, y + 13)
    y += 22
  }

  // ── FOOTER ──
  const pageH = 297
  doc.setFillColor(0, 0, 77)
  doc.rect(0, pageH - 22, W, 22, 'F')
  doc.setTextColor(180, 200, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text("© 2025 Batteriq Solutions Ltd.  ·  Kenya's Official Authorised EcoFlow Distributor", W / 2, pageH - 13, { align: 'center' })
  doc.text('batteriq.com  ·  info@batteriq.com  ·  Nairobi, Kenya', W / 2, pageH - 7, { align: 'center' })

  doc.setFillColor(239, 246, 255)
  doc.roundedRect(margin, pageH - 38, W - margin * 2, 12, 2, 2, 'F')
  doc.setTextColor(0, 0, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text(`Track your order at batteriq.com/track-order using: ${data.orderNumber}`, W / 2, pageH - 30, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}
