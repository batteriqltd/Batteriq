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
  const dpro3 = {
    ...base,
    specs: { capacity: '4096Wh', battery_type: 'LFP (LiFePO4)', ac_output: '4000W (Surge 8000W)', ups_mode: 'Yes (<10ms switchover)' },
  } as unknown as Product

  it('ignores stored overrides, which go stale', () => {
    const p = { ...base, name: 'DELTA Pro', price_kes: 250799, meta_title: 'EcoFlow DELTA Pro Kenya — KES 291,399 | Batteriq', meta_description: 'Buy it for KES 291,399.' } as Product
    expect(buildTitle(p)).toBe('EcoFlow DELTA Pro Price in Kenya – KES 250,799 | Batteriq')
    expect(buildDescription(p)).toContain('KES 250,799')
    expect(buildDescription(p)).not.toContain('291,399')
  })

  it('builds the in-stock power station description from specs', () => {
    expect(buildTitle(dpro3)).toBe('EcoFlow DELTA Pro 3 Price in Kenya – KES 461,799 | Batteriq')
    expect(buildDescription(dpro3)).toBe(
      'EcoFlow DELTA Pro 3 portable power station: 4096Wh LiFePO4, 4000W AC output. In stock in Nairobi. KES 461,799, M-Pesa or card, 24-month warranty.'
    )
  })

  it('says out of stock and offers WhatsApp reservation', () => {
    const p = { ...dpro3, in_stock: false } as Product
    expect(buildDescription(p)).toContain('Out of stock – reserve on WhatsApp.')
    expect(buildDescription(p)).not.toContain('In stock')
  })

  it('drops the price before the brand suffix when the title is too long', () => {
    const p = { ...base, brand: 'Soundcore', category: 'Accessories', name: 'Soundcore Liberty 4 NC Wireless Earbuds', price_kes: 10010, specs: { source_subcategory: 'In Ear' } } as unknown as Product
    expect(buildTitle(p)).toBe('Soundcore Liberty 4 NC Wireless Earbuds Price in Kenya')
    const short = { ...p, name: 'Soundcore Liberty 4 NC' } as Product
    expect(buildTitle(short)).toBe('Soundcore Liberty 4 NC Price in Kenya | Batteriq')
    expect(buildDescription(short)).toBe(
      'Soundcore Liberty 4 NC wireless earbuds. In stock in Nairobi. KES 10,010, M-Pesa or card, same-day Nairobi delivery.'
    )
  })

  it('leaves out capacity the price does not include', () => {
    const p = { ...base, brand: 'Bluetti', name: 'Bluetti AC300', price_kes: 68499, specs: { capacity: '3072Wh with B300 (up to 12288Wh)', ac_output: '3000W' } } as unknown as Product
    expect(buildDescription(p)).not.toContain('3072Wh')
    expect(buildDescription(p)).toContain('3000W AC output')
  })

  it('never passes 160 characters', () => {
    expect(buildDescription(dpro3).length).toBeLessThanOrEqual(160)
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

describe('Product JSON-LD fields', () => {
  const ld = (p: Partial<Product>) => productJsonLd({ ...base, ...p } as Product, 'ecoflow') as Record<string, any>

  it('names the product "{Brand} {Model}" without doubling the brand', () => {
    expect(ld({}).name).toBe('EcoFlow DELTA Pro 3')
    expect(ld({ brand: 'Bluetti', name: 'Bluetti Homestar 3' }).name).toBe('BLUETTI Homestar 3')
    expect(ld({ brand: 'Bluetti', name: 'AC180P' }).name).toBe('BLUETTI AC180P')
  })

  it('only emits an MPN that is a real manufacturer code', () => {
    expect(ld({ sku: 'BLUETTI-HOMESTAR-3', brand: 'Bluetti' }).mpn).toBeUndefined()
    expect(ld({ sku: '5013701013' }).mpn).toBeUndefined()
    expect(ld({ sku: 'A3947H11', brand: 'Soundcore' }).mpn).toBe('A3947H11')
    expect(ld({ sku: 'T8910021', brand: 'Eufy' }).mpn).toBe('T8910021')
    expect(ld({ sku: 'SKU-1785160827939', brand: 'Anker' }).mpn).toBeUndefined()
    expect(ld({ specs: { mpn: 'EFD521' } as never }).mpn).toBe('EFD521')
  })

  it('emits a GTIN only when a valid barcode is stored', () => {
    expect(ld({ specs: { barcode: '4006381333931' } as never }).gtin13).toBe('4006381333931')
    expect(ld({ specs: { barcode: '4006381333932' } as never }).gtin13).toBeUndefined()
    expect(ld({}).gtin13).toBeUndefined()
  })

  it('lists spec rows as PropertyValue, skipping identifiers and bookkeeping', () => {
    const props = ld({ specs: { capacity: '4096Wh', ac_output: '4000W', source_category: 'X', barcode: '4006381333931' } as never }).additionalProperty
    expect(props).toEqual([
      { '@type': 'PropertyValue', name: 'Capacity', value: '4096Wh' },
      { '@type': 'PropertyValue', name: 'Ac Output', value: '4000W' },
    ])
  })

  it('prices the offer as a number and marks stock honestly', () => {
    const o = ld({ price_kes: '461799' as never, in_stock: false }).offers
    expect(o.price).toBe(461799)
    expect(o.availability).toBe('https://schema.org/OutOfStock')
    expect(o.seller['@id']).toBe('https://batteriq.com/#organization')
  })

  it('keeps the description plain and under 500 characters', () => {
    const d = ld({ description: '**Bold** <b>html</b> ' + 'x '.repeat(400) }).description
    expect(d.length).toBeLessThanOrEqual(500)
    expect(d).not.toMatch(/[<*]/)
  })
})
