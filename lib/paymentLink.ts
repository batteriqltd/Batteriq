// Client details for an admin card payment link. Pure, so the admin form can use
// the same checks as the server.

import { sanitizeString } from '@/lib/sanitize'

export const LINK_DEFAULT_NAME = 'Payment link client'
export const LINK_DEFAULT_PHONE = '254716822014'

/** 07…, 01…, 7…, 1…, 2547…, +2547… → 2547…/2541…; other international numbers keep their digits. */
export function normalizeLinkPhone(raw: string): string | null {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  // A foreign number must be written with its country code, e.g. +44 7…
  if (trimmed.startsWith('+') && digits.length >= 9 && digits.length <= 15) return digits
  return null
}

export type LinkClient = { name: string; phone: string }

/** Both fields are optional; blanks fall back to the placeholders. */
export function parseLinkClient(input: { name?: unknown; phone?: unknown }): LinkClient | { error: string } {
  const name = typeof input.name === 'string' ? sanitizeString(input.name, 100) : ''
  if (name && name.length < 2) return { error: 'Client name must be at least 2 characters.' }

  const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : ''
  let phone = LINK_DEFAULT_PHONE
  if (rawPhone) {
    const normalized = normalizeLinkPhone(rawPhone)
    if (!normalized) return { error: 'Enter a valid phone number, e.g. 0712 345 678 or +44 7700 900123.' }
    phone = normalized
  }

  return { name: name || LINK_DEFAULT_NAME, phone }
}
