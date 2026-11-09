import { describe, it, expect } from 'vitest'
import { buildProductContent, buildSpecRows, parseWatts, parseWh, runtimeHours } from '@/lib/productContent'
import type { Product } from '@/lib/supabase/types'

const station = {
  id: 'p', sku: 'X', brand: 'EcoFlow', category: 'Power Stations', name: 'DELTA Pro 3', slug: 'delta-pro-3', price_kes: 461799, in_stock: true,
  specs: { capacity: '4096Wh', ac_output: '4000W (Surge 8000W)', battery_type: 'LFP (LiFePO4)', solar_input: '2600W Max', source_category: 'X', source_subcategory: 'Y' },
} as unknown as Product
const text = (c: ReturnType<typeof buildProductContent>) => (c?.overview ?? []).map((p) => p.map((s) => (typeof s === 'string' ? s : s.text)).join('')).join(' ')

describe('spec parsing', () => {
  it('reads Wh and W from spec strings', () => {
    expect(parseWh('4096Wh')).toBe(4096)
    expect(parseWh('1,024 Wh')).toBe(1024)
    expect(parseWh('3.01kWh')).toBe(3010)
    expect(parseWh('Yes')).toBeNull()
    expect(parseWatts('4000W (Surge 8000W)')).toBe(4000)
    expect(parseWatts('2600W Max (Dual port)')).toBe(2600)
  })

  it('estimates runtime as capacity x 0.85 / watts', () => {
    expect(runtimeHours(4096, 150)).toBe(23)
    expect(runtimeHours(1024, 150)).toBe(6)
  })
})

describe('Full Specifications rows', () => {
  it('puts named rows first and hides the supplier bookkeeping fields', () => {
    const rows = buildSpecRows(station)
    expect(rows.slice(0, 3).map((r) => r.label)).toEqual(['Product type', 'Capacity', 'AC output (surge)'])
    expect(rows.find((r) => /source/i.test(r.label))).toBeUndefined()
    expect(rows.find((r) => r.label === 'Warranty')?.value).toBe('24 months')
  })
})

describe('Overview', () => {
  it('says "approximately" and uses only the specs it has', () => {
    const t = text(buildProductContent(station))
    expect(t).toContain('a fridge (150 W) for approximately 23 hours')
    expect(t).toContain('2600W Max')
    expect(t).not.toMatch(/undefined|null|NaN/)
  })

  it('skips products without a capacity', () => {
    expect(buildProductContent({ ...station, specs: { ac_output: '1800W' } } as unknown as Product)).toBeNull()
  })

  it('never claims an extra battery runs appliances on its own', () => {
    const t = text(buildProductContent({ ...station, category: 'Batteries', name: 'Extra Battery' } as unknown as Product))
    expect(t).toContain('connected to its power station')
  })

  it('adds the two product-specific FAQs', () => {
    const q = buildProductContent(station)!.faqs.map((f) => f.question)
    expect(q).toEqual(['What can the EcoFlow DELTA Pro 3 run in a Kenyan home?', 'Which solar panels work with the EcoFlow DELTA Pro 3?'])
  })
})
