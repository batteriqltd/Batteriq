import { describe, it, expect } from 'vitest'
import { NEW_PAGES, isPublished, newPageMetadata, publishedNewPages } from '@/lib/newPages'
import { pairingFor, comparisonVerdicts, priceExcludesBattery } from '@/lib/newPageContent'
import type { Product } from '@/lib/supabase/types'

const p = (o: Partial<Product> & { specs?: Record<string, string> }) =>
  ({ id: o.slug, sku: 'X', brand: 'EcoFlow', category: 'Power Stations', name: 'X', slug: 'x', price_kes: 1000, in_stock: true, specs: {}, images: [], ...o }) as unknown as Product

describe('publish switch', () => {
  it('keeps unpublished pages out of the index and the sitemap', () => {
    for (const path of Object.keys(NEW_PAGES) as (keyof typeof NEW_PAGES)[]) {
      if (isPublished(path)) continue
      expect(newPageMetadata(path, { title: 't' }).robots).toEqual({ index: false, follow: true })
      expect(publishedNewPages()).not.toContain(path)
    }
  })
})

describe('solar generator pairings', () => {
  const station = p({ slug: 'st', name: 'DELTA 2', specs: { capacity: '1024Wh', solar_input: '500W Max' } })
  it('prefers a panel listed as compatible', () => {
    const listed = p({ slug: 'a', category: 'Solar Panels', name: 'Panel 220W', price_kes: 500, specs: { wattage: '220W', compatible_with: 'EcoFlow DELTA 2' } })
    const big = p({ slug: 'b', category: 'Solar Panels', name: 'Panel 400W', price_kes: 900, specs: { wattage: '400W' } })
    const r = pairingFor(station, [big, listed])!
    expect(r.panel.slug).toBe('a')
    expect(r.basis).toBe('listed')
    expect(r.total).toBe(1500)
  })

  it('otherwise uses the largest same-brand panel within the solar input, never another brand or an oversize panel', () => {
    const fit = p({ slug: 'fit', category: 'Solar Panels', name: 'Panel 400W', specs: { wattage: '400W' } })
    const tooBig = p({ slug: 'big', category: 'Solar Panels', name: 'Panel 600W', specs: { wattage: '600W' } })
    const other = p({ slug: 'bl', brand: 'Bluetti', category: 'Solar Panels', name: 'PV450', specs: { wattage: '450W' } })
    expect(pairingFor(station, [fit, tooBig, other])!.panel.slug).toBe('fit')
    expect(pairingFor(p({ specs: { capacity: '1024Wh' } }), [fit])).toBeNull()
  })

  it('never offers a unit whose price excludes the battery', () => {
    expect(priceExcludesBattery(p({ name: 'Bluetti AC300' }))).toBe(true)
    expect(priceExcludesBattery(p({ name: 'Bluetti AC180P' }))).toBe(false)
  })
})

describe('comparison verdicts', () => {
  it('only states verdicts the data supports', () => {
    const a = p({ slug: 'a', name: 'A', price_kes: 100000, specs: { capacity: '1024Wh' } })
    const b = p({ slug: 'b', name: 'B', price_kes: 120000, specs: { capacity: '1024Wh' } })
    const text = comparisonVerdicts(a, b).map((v) => v.map((s) => (typeof s === 'string' ? s : s.text)).join(''))
    expect(text.some((t) => t.startsWith('Longest blackout runtime'))).toBe(false)
    expect(text.some((t) => t.startsWith('Lower budget: EcoFlow A'))).toBe(true)
  })
})
