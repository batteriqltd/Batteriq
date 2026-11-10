/**
 * Batteriq — Delivery Note & Installation Completion Note PDF Generator
 * Matches the official Batteriq Solutions Ltd A4 layout.
 */

export type NoteDocType = 'delivery' | 'installation'

export interface DeliveryNoteItem {
  description: string
  subtext?: string
  qtySent: string
  qtyReceived: string
}

export interface DeliveryNoteRecord {
  id: string
  docNumber: string
  docType: NoteDocType
  lpoReference: string
  date: string
  customerName: string
  customerPhone: string
  deliverySite: string
  contactPerson: string
  items: DeliveryNoteItem[]
  workDescription: string
  worksCompleted: string
  checks: {
    visuallyInspected: boolean
    functionalChecks: boolean
    customerHandover: boolean
  }
  remarks: string
  batteriqPersonName: string
  batteriqSignature: string
  batteriqDateTime: string
  receiverName: string
  receiverSignature: string // data:image/png;base64,... or text
  receiverDateTime: string
  status: 'draft' | 'signed'
  createdAt: string
  updatedAt: string
}

export function genDocNumber(docType: NoteDocType, customSuffix?: string): string {
  const d = new Date()
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const suffix = customSuffix || String(Math.floor(1000 + Math.random() * 9000))
  const prefix = docType === 'installation' ? 'BAT-ICN' : 'BAT-DN'
  return `${prefix}-${ymd}-${suffix}`
}

export async function generateDeliveryNotePDF(note: DeliveryNoteRecord): Promise<string> {
  const { jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 15
  const rightEdge = W - margin
  const contentW = W - margin * 2

  const BLUE: [number, number, number] = [30, 78, 135]
  const DARK: [number, number, number] = [25, 35, 50]
  const BLACK: [number, number, number] = [15, 15, 15]
  const MUTED: [number, number, number] = [95, 105, 120]
  const LINE: [number, number, number] = [215, 222, 232]
  const SOFT_BG: [number, number, number] = [242, 246, 251]

  const isInstall = note.docType === 'installation'

  // ─── TOP HEADER ──────────────────────────────────────────────────
  // Left vertical blue bar
  doc.setFillColor(...BLUE)
  doc.rect(margin, 15, 1.4, isInstall ? 21 : 17, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  if (isInstall) {
    doc.setFontSize(17.5)
    doc.text('INSTALLATION COMPLETION', margin + 5, 22)
    doc.text('NOTE', margin + 5, 29)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text('BATTERIQ SOLUTIONS LTD', margin + 5, 34.5)
  } else {
    doc.setFontSize(19)
    doc.text('DELIVERY NOTE', margin + 5, 23)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text('BATTERIQ SOLUTIONS LTD', margin + 5, 29.5)
  }

  // Right BATTERIQ logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(29)
  doc.setTextColor(...BLACK)
  doc.text('BATTERIQ', rightEdge - 3, 25, { align: 'right' })
  doc.setFontSize(6)
  doc.text('TM', rightEdge, 17.5, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.text('Guarantee your Uptime', rightEdge - 25, 30.5, { align: 'right' })

  // Divider line
  let y = 41
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.35)
  doc.line(margin, y, rightEdge, y)

  // ─── DOCUMENT METADATA ───────────────────────────────────────────
  y += 7
  const metaLabelX = margin
  const metaValX = margin + 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...MUTED)
  doc.text('DOCUMENT NO.', metaLabelX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
  doc.text(note.docNumber || genDocNumber(note.docType), metaValX, y)

  y += 6.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...MUTED)
  doc.text('LPO REFERENCE', metaLabelX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
  doc.text(note.lpoReference || '—', metaValX, y)

  y += 6.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...MUTED)
  doc.text('DATE', metaLabelX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
  if (note.date) {
    doc.text(note.date, metaValX, y)
  }
  doc.setDrawColor(...DARK)
  doc.setLineWidth(0.25)
  doc.line(metaValX, y + 1, metaValX + 46, y + 1)

  y += 6
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.35)
  doc.line(margin, y, rightEdge, y)

  // ─── ISSUED BY / CUSTOMER ────────────────────────────────────────
  y += 7
  const colRightX = margin + 94

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('ISSUED BY', margin, y)
  doc.text('CUSTOMER', colRightX, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...DARK)
  doc.text('BATTERIQ SOLUTIONS LTD', margin, y)
  doc.text(note.customerName || 'Customer', colRightX, y)

  y += 5.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  doc.setTextColor(...DARK)
  doc.text('P.O. Box 430-00600, Nairobi, Kenya', margin, y)
  doc.text(`Delivery / work site: ${note.deliverySite || '_______________________'}`, colRightX, y)

  y += 5.2
  doc.text('Tel: +254 716 822014', margin, y)
  doc.text(`Contact person: ${note.contactPerson || '___________________________'}`, colRightX, y)

  y += 5.2
  doc.text('info@batteriq.com | batteriq.com', margin, y)
  if (note.customerPhone) {
    doc.text(`Tel / WhatsApp: ${note.customerPhone}`, colRightX, y)
  }

  y += 6
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.35)
  doc.line(margin, y, rightEdge, y)

  // ─── BODY: DELIVERY NOTE vs INSTALLATION COMPLETION NOTE ─────────
  if (!isInstall) {
    y += 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text('GOODS DELIVERED', margin, y)

    y += 4
    // Blue table header
    doc.setFillColor(...BLUE)
    doc.rect(margin, y, contentW, 9.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(255, 255, 255)
    doc.text('#', margin + 4, y + 6.2)
    doc.text('DESCRIPTION', margin + 14, y + 6.2)
    doc.text('QTY SENT', margin + 128, y + 6.2)
    doc.text('QTY RECEIVED', margin + 156, y + 6.2)

    y += 9.5

    const rows: DeliveryNoteItem[] = [...(note.items ?? []).filter((r) => r.description?.trim())]
    while (rows.length < 4) {
      rows.push({ description: '', subtext: '', qtySent: '', qtyReceived: '' })
    }

    rows.slice(0, 6).forEach((row, idx) => {
      const rowH = row.subtext ? 16 : 13.5
      const textY = y + 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(... (row.description ? DARK : MUTED))
      doc.text(String(idx + 1), margin + 4, textY)

      if (row.description) {
        const lines = doc.splitTextToSize(row.description, 108)
        doc.text(lines[0], margin + 14, textY)
        if (row.subtext || lines[1]) {
          doc.setFontSize(7.8)
          doc.setTextColor(...MUTED)
          doc.text(row.subtext || lines[1], margin + 14, textY + 4.8)
        }
        doc.setFontSize(9)
        doc.setTextColor(...DARK)
        doc.text(String(row.qtySent || ''), margin + 128, textY)
        if (row.qtyReceived) {
          doc.text(String(row.qtyReceived), margin + 156, textY)
        }
      } else {
        // Blank lined row matching template
        doc.setDrawColor(...MUTED)
        doc.setLineWidth(0.25)
        doc.line(margin + 14, textY + 1, margin + 120, textY + 1)
        doc.line(margin + 128, textY + 1, margin + 148, textY + 1)
      }

      // Qty received underline
      doc.setDrawColor(...MUTED)
      doc.setLineWidth(0.25)
      doc.line(margin + 156, textY + 1, rightEdge - 3, textY + 1)

      y += rowH
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.25)
      doc.line(margin, y, rightEdge, y)
    })

    // CONDITION / SHORTAGES / REMARKS
    y += 11
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text('CONDITION / SHORTAGES / REMARKS', margin, y)

    y += 8
    if (note.remarks && note.remarks.trim()) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...DARK)
      const remLines = doc.splitTextToSize(note.remarks.trim(), contentW - 4)
      if (remLines[0]) doc.text(remLines[0], margin + 1, y - 1.5)
      if (remLines[1]) doc.text(remLines[1], margin + 1, y + 7.5)
    }
    doc.setDrawColor(...MUTED)
    doc.setLineWidth(0.25)
    doc.line(margin, y, rightEdge, y)
    y += 9
    doc.line(margin, y, rightEdge, y)
  } else {
    // ─── INSTALLATION COMPLETION NOTE BODY ─────────────────────────
    y += 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text('WORK DESCRIPTION', margin, y)

    y += 4
    doc.setFillColor(...SOFT_BG)
    doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.2)
    doc.setTextColor(...DARK)
    const workDesc =
      note.workDescription?.trim() ||
      (note.items?.filter((i) => i.description?.trim()).map((i) => `${i.description} (${i.qtyReceived || i.qtySent || '1'})`).join('; ')) ||
      `Electrical / solar backup installation and commissioning${note.lpoReference ? ` under ${note.lpoReference}` : ''}.`
    const descLines = doc.splitTextToSize(workDesc, contentW - 10)
    doc.text(descLines.slice(0, 2), margin + 5, y + 7)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Specific completed works recorded below before customer sign-off.', margin + 5, y + 14.5)

    y += 26
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text('WORKS COMPLETED / INSTALLATION DETAILS', margin, y)

    const worksText =
      note.worksCompleted?.trim() ||
      note.items
        ?.filter((i) => i.description?.trim())
        .map((i, idx) => `${idx + 1}. ${i.description}${i.qtyReceived || i.qtySent ? ` — Qty: ${i.qtyReceived || i.qtySent}` : ''}`)
        .join('   |   ') ||
      ''
    const wLines = worksText ? doc.splitTextToSize(worksText, contentW - 4) : []

    for (let i = 0; i < 3; i++) {
      y += 8.5
      if (wLines[i]) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...DARK)
        doc.text(wLines[i], margin + 1, y - 1.5)
      }
      doc.setDrawColor(...MUTED)
      doc.setLineWidth(0.25)
      doc.line(margin, y, rightEdge, y)
    }

    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text('INSTALLATION CHECKS (complete as applicable)', margin, y)

    const checkList: Array<{ label: string; checked: boolean }> = [
      { label: 'Installation visually inspected', checked: note.checks?.visuallyInspected ?? true },
      { label: 'Functional checks carried out', checked: note.checks?.functionalChecks ?? true },
      { label: 'Customer shown operation / handover', checked: note.checks?.customerHandover ?? true },
    ]
    checkList.forEach((chk) => {
      y += 7
      doc.setDrawColor(...MUTED)
      doc.setLineWidth(0.35)
      doc.rect(margin + 1, y - 3.8, 3.8, 3.8)
      if (chk.checked) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...BLUE)
        doc.text('v', margin + 2, y - 0.6)
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.8)
      doc.setTextColor(...DARK)
      doc.text(chk.label, margin + 7.5, y - 0.5)
    })

    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text('OUTSTANDING WORKS / DEFECTS / REMARKS', margin, y)

    const remLines = note.remarks?.trim() ? doc.splitTextToSize(note.remarks.trim(), contentW - 4) : []
    for (let i = 0; i < 2; i++) {
      y += 8.5
      if (remLines[i]) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...DARK)
        doc.text(remLines[i], margin + 1, y - 1.5)
      }
      doc.setDrawColor(...MUTED)
      doc.setLineWidth(0.25)
      doc.line(margin, y, rightEdge, y)
    }
  }

  // ─── SIGNATURES BLOCK ────────────────────────────────────────────
  const sigTop = Math.max(y + 11, 224)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(
    isInstall
      ? 'Customer acknowledgement (sign only after satisfactory completion / note exceptions above).'
      : 'Acknowledgement confirms receipt of the goods and quantities recorded above.',
    margin,
    sigTop
  )

  const hdrY = sigTop + 7
  const leftX = margin
  const rightX = margin + 94
  const custShort = (note.customerName || 'CLIENT').toUpperCase().slice(0, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  doc.text(isInstall ? 'BATTERIQ TECHNICIAN' : 'DELIVERED BY (BATTERIQ)', leftX, hdrY)
  doc.text(isInstall ? `${custShort} REPRESENTATIVE` : `RECEIVED BY (${custShort})`, rightX, hdrY)

  // Row 1: Name
  const nameY = hdrY + 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  doc.text('Name:', leftX, nameY)
  if (note.batteriqPersonName) {
    doc.text(note.batteriqPersonName, leftX + 24, nameY - 0.5)
  }
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.25)
  doc.line(leftX + 22, nameY + 0.5, leftX + 82, nameY + 0.5)

  doc.text('Name:', rightX, nameY)
  if (note.receiverName) {
    doc.setFont('helvetica', 'bold')
    doc.text(note.receiverName, rightX + 24, nameY - 0.5)
    doc.setFont('helvetica', 'normal')
  }
  doc.line(rightX + 22, nameY + 0.5, rightEdge, nameY + 0.5)

  // Row 2: Signature (QR Stamp)
  const sigY = nameY + 14
  doc.text(isInstall ? 'Signature / QR:' : 'Signature / QR:', leftX, sigY)
  if (note.batteriqSignature && note.batteriqSignature.startsWith('data:image/')) {
    try {
      doc.addImage(note.batteriqSignature, 'PNG', leftX + 26, sigY - 10, 42, 13)
    } catch { /* ignore */ }
  } else if (note.batteriqSignature) {
    doc.setFont('helvetica', 'italic')
    doc.text(note.batteriqSignature, leftX + 26, sigY - 1)
    doc.setFont('helvetica', 'normal')
  }
  doc.line(leftX + 25, sigY + 3.5, leftX + 82, sigY + 3.5)

  doc.text(isInstall ? 'Signature / QR:' : 'Signature / QR:', rightX, sigY)
  if (note.receiverSignature && note.receiverSignature.startsWith('data:image/')) {
    try {
      // 48mm x 15mm matches the 480x150 (3.2:1) QR stamp canvas so the QR code stays 100% square
      doc.addImage(note.receiverSignature, 'PNG', rightX + 25, sigY - 11, 48, 15)
    } catch { /* ignore */ }
  } else if (note.receiverSignature) {
    doc.setFont('helvetica', 'italic')
    doc.text(note.receiverSignature, rightX + 26, sigY - 1)
    doc.setFont('helvetica', 'normal')
  }
  doc.line(rightX + 25, sigY + 4.5, rightEdge, sigY + 4.5)

  // Row 3: Date / time
  if (!isInstall) {
    const dtY = sigY + 12
    doc.text('Date / time:', leftX, dtY)
    if (note.batteriqDateTime) doc.text(note.batteriqDateTime, leftX + 24, dtY - 0.5)
    doc.line(leftX + 22, dtY + 0.5, leftX + 82, dtY + 0.5)

    doc.text('Date / time:', rightX, dtY)
    if (note.receiverDateTime) doc.text(note.receiverDateTime, rightX + 24, dtY - 0.5)
    doc.line(rightX + 22, dtY + 0.5, rightEdge, dtY + 0.5)
  } else if (note.receiverDateTime) {
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`Signed: ${note.receiverDateTime}`, rightX + 25, sigY + 8.5)
  }

  // ─── FOOTER ──────────────────────────────────────────────────────
  const footY = 282
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.35)
  doc.line(margin, footY - 5, rightEdge, footY - 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...DARK)
  doc.text('BATTERIQ SOLUTIONS LTD  |  Guarantee your Uptime', margin, footY)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('batteriq.com', rightEdge, footY, { align: 'right' })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer).toString('base64')
}
