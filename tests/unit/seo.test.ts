import { describe, it, expect } from 'vitest'
import { buildDescription, buildProductFaqs, buildTitle, canonicalUrl, productImageAlt, productJsonLd } from '@/lib/seo'
import type { Product } from '@/lib/supabase/types'

const base = {
  id: 'p1', sku: 'SKU-1', brand: 'EcoFlow', category: 'Power Stations', name: 'DELTA Pro 3', slug: 'delta-pro-3',
  description: null, images: [], price_kes: 461799, in_stock: true, stock_qty: 5, specs: {},
  meta_title: null, meta_description: null, schema_rating: 4.9, schema_review_count: 22,
} as unknown as Product

const blackout = (p: Partial<Product>) => buildProductFaqs({ ...base, ...p } as Product)[2].answer

describe('product FAQ', () => {
  it('renders every sentence when the data exists', () => {
    expect(blackout({ specs: { capacity: '4096Wh', battery_type: 'LFP (LiFePO4)', ac_output: '4000W' } as never })).toBe(
      'Yes — that is what it is designed for. It stores 4096Wh in a long-life LFP (LiFePO4) battery and delivers 4000W. ' +
        'Runtime depends on what you connect, so send us your appliance list on WhatsApp and we will size it for you. ' +
        'It is covered by a 24-month warranty.'
    )
  })

  it('never leaves a dangling fragment when specs are missing', () => {
    const chemistryOnly = blackout({ specs: { chemistry: 'LFP' } as never })
    expect(chemistryOnly).toContain('designed for. It uses a long-life LFP battery. Runtime')
    expect(blackout({ specs: {} as never })).toBe(
      'Yes — that is what it is designed for. Runtime depends on what you connect, so send us your appliance list on WhatsApp and we will size it for you. It is covered by a 24-month warranty.'
    )
    for (const a of [chemistryOnly, blackout({ specs: { ac_output: '1800W' } as never })]) {
      expect(a).not.toMatch(/\. and|\.\.|a LFP|undefined|null/)
    }
  })

  it('only claims stock when units are held', () => {
    const avail = (p: Partial<Product>) => buildProductFaqs({ ...base, ...p } as Product)[1].answer
    expect(avail({ stock_qty: 5 })).toContain('is in stock')
    expect(avail({ stock_qty: 0 })).not.toMatch(/in stock/i)
    expect(avail({ stock_qty: null as never })).not.toMatch(/in stock/i)
    expect(avail({ in_stock: false })).toContain('out of stock')
  })
})

describe('Product JSON-LD', () => {
  it('never carries a rating', () => {
    const ld = productJsonLd(base, 'ecoflow') as Record<string, unknown>
    expect(ld.aggregateRating).toBeUndefined()
    expect(ld.review).toBeUndefined()
  })
})

describe('canonicalUrl', () => {
  it('is absolute with no query string or trailing slash', () => {
    expect(canonicalUrl('/')).toBe('https://batteriq.com')
    expect(canonicalUrl('/power-stations/?filter=delta')).toBe('https://batteriq.com/power-stations')
    expect(canonicalUrl('support/faq')).toBe('https://batteriq.com/support/faq')
  })
})

describe('titles and descriptions use the live price', () => {
  it('ignores stored overrides that carry a price', () => {
    const p = { ...base, name: 'DELTA Pro', price_kes: 250799, meta_title: 'EcoFlow DELTA Pro Kenya — KES 291,399 | Batteriq', meta_description: 'Buy it for KES 291,399.' } as Product
    expect(buildTitle(p)).toBe('EcoFlow DELTA Pro Price in Kenya — KES 250,799 | Batteriq')
    expect(buildDescription(p)).toContain('KES 250,799')
    expect(buildDescription(p)).not.toContain('291,399')
  })

  it('keeps a stored override with no price in it', () => {
    const p = { ...base, meta_title: 'EcoFlow DELTA Pro 3 — whole-home backup', meta_description: 'Whole-home backup power.' } as Product
    expect(buildTitle(p)).toBe('EcoFlow DELTA Pro 3 — whole-home backup')
    expect(buildDescription(p)).toBe('Whole-home backup power.')
  })
})

describe('productImageAlt', () => {
  it('describes the product, not the page', () => {
    expect(productImageAlt(base)).toBe('EcoFlow DELTA Pro 3 portable power station')
    expect(productImageAlt(base, 1, 4)).toBe('EcoFlow DELTA Pro 3 portable power station, image 2 of 4')
    expect(productImageAlt({ brand: 'Bluetti', name: 'PV350 Solar Panel 350W', category: 'Solar Panels' } as Product)).toBe('BLUETTI PV350 Solar Panel 350W')
    expect(productImageAlt({ brand: 'Soundcore', name: 'SOUNDCORE LIBERTY 4 NC BLACK', category: 'Accessories' } as Product)).toBe('SOUNDCORE LIBERTY 4 NC BLACK')
  })
})
