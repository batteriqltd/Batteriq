'use client'

import QRCode from 'qrcode'
import type { DeliveryNoteItem } from '@/lib/delivery-note-pdf'

export interface QrStamp {
  /** 480x150 composite PNG (QR + signer details) embedded in the PDF signature box. */
  compositeUrl: string
  /** The bare QR code image. */
  qrUrl: string
  stampId: string
  signedBy: string
  timestamp: string
}

/**
 * Builds the "QR VERIFIED & SIGNED" stamp used as the receiver's signature on
 * delivery / installation notes. Browser only (uses a canvas).
 */
export async function createQrVerificationStamp(params: {
  signer: string
  site: string
  lpoReference?: string
  items: DeliveryNoteItem[]
}): Promise<QrStamp> {
  const cleanSigner = (params.signer.trim() || 'Verified Receiver').slice(0, 36)
  const cleanSite = (params.site.trim() || 'Nairobi, Kenya').slice(0, 40)
  const stampId = `BAT-QR-${Math.floor(100000 + Math.random() * 900000)}`
  const timestamp = new Date().toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const matSummary = params.items
    .filter((i) => i.description.trim())
    .map((i) => `${i.description.trim()} x${i.qtyReceived || i.qtySent || '1'}`)
    .join(', ')
    .slice(0, 120)

  const qrPayload = [
    'BATTERIQ VERIFIED DELIVERY',
    `ID: ${stampId}`,
    `Receiver: ${cleanSigner}`,
    `Site: ${cleanSite}`,
    `Date: ${timestamp}`,
    params.lpoReference ? `Ref: ${params.lpoReference}` : '',
    matSummary ? `Items: ${matSummary}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  const qrUrl = await QRCode.toDataURL(qrPayload, {
    width: 240,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })

  const base = { qrUrl, stampId, signedBy: cleanSigner, timestamp }

  // 480x150 → 3.2:1, matching the 48mm x 15mm signature box in the PDF
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 150
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ...base, compositeUrl: qrUrl }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 480, 150)
  ctx.strokeStyle = '#1e4e87'
  ctx.lineWidth = 3
  ctx.strokeRect(3, 3, 474, 144)

  await new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 8, 8, 134, 134)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = qrUrl
  })

  ctx.fillStyle = '#1e4e87'
  ctx.font = 'bold 17px Arial, sans-serif'
  ctx.fillText('QR VERIFIED & SIGNED', 154, 34)

  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillText(cleanSigner.slice(0, 24), 154, 64)

  ctx.fillStyle = '#334155'
  ctx.font = 'bold 14px Courier New, monospace'
  ctx.fillText(`ID: ${stampId}`, 154, 92)

  ctx.fillStyle = '#475569'
  ctx.font = '14px Arial, sans-serif'
  ctx.fillText(timestamp, 154, 116)

  ctx.fillStyle = '#16a34a'
  ctx.font = 'bold 13px Arial, sans-serif'
  ctx.fillText('BATTERIQ SOLUTIONS LTD', 154, 137)

  return { ...base, compositeUrl: canvas.toDataURL('image/png') }
}
