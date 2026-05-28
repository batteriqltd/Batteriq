import { describe, it, expect } from 'vitest'
import { formatKES, generateOrderNumber, slugify, normalizePhone, getDiscountPercent } from '@/lib/utils'

describe('formatKES', () => {
  it('formats numbers with KES prefix', () => {
    expect(formatKES(27259)).toBe('KES 27,259')
    expect(formatKES(291399)).toBe('KES 291,399')
  })
})

describe('generateOrderNumber', () => {
  it('generates unique order numbers with BQ- prefix', () => {
    const n1 = generateOrderNumber()
    const n2 = generateOrderNumber()
    expect(n1).toMatch(/^BQ-/)
    expect(n1).not.toBe(n2)
  })
})

describe('slugify', () => {
  it('converts product names to slugs', () => {
    expect(slugify('EcoFlow DELTA Pro')).toBe('ecoflow-delta-pro')
    expect(slugify('RIVER 2 Max')).toBe('river-2-max')
  })
})

describe('normalizePhone', () => {
  it('normalizes Kenyan phone numbers to E.164', () => {
    expect(normalizePhone('0712345678')).toBe('254712345678')
    expect(normalizePhone('254712345678')).toBe('254712345678')
    expect(normalizePhone('+254712345678')).toBe('254712345678')
  })
})

describe('getDiscountPercent', () => {
  it('calculates discount percentage correctly', () => {
    expect(getDiscountPercent(85539, 100000)).toBe(14)
    expect(getDiscountPercent(100000, null)).toBe(0)
  })
})
