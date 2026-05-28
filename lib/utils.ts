import type { Product } from './supabase/types'

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `BQ-${ts}-${rand}`
}

export function generateSessionToken(): string {
  const arr = new Uint8Array(20)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(arr)
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getProductImageUrl(product: Product): string {
  if (product.images && product.images.length > 0) {
    return product.images[0]
  }
  return '/placeholder-product.jpg'
}

export function getDiscountPercent(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export function getPrimarySpecs(specs: Record<string, string>, maxCount = 3): Array<[string, string]> {
  const priorityKeys = ['capacity', 'ac_output', 'power', 'chemistry', 'weight', 'efficiency', 'ports']
  const entries = Object.entries(specs)
  const sorted = entries.sort(([a], [b]) => {
    const ai = priorityKeys.indexOf(a)
    const bi = priorityKeys.indexOf(b)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return sorted.slice(0, maxCount) as Array<[string, string]>
}

export function formatSpecLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('254')) return cleaned
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1)
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned
  return cleaned
}

export function getRateLimit(key: string): string {
  return `rate:${key}`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
