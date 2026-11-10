import type { Product } from '@/lib/supabase/types'

/**
 * Single source of truth for the new Bluetti Residential Backup range
 * (Sept 2026 distributor list: Homestar 3, HV6K, HV10K, HB500) plus the
 * remaining list rows missing from the DB (PV100 panel, B500 base,
 * EP760 meter/EMS accessories).
 *
 * Same pattern as lib/delta-series.ts: the storefront merges these
 * code-level fallbacks with Supabase rows so the items ALWAYS show with
 * correct specs/descriptions/images — no SQL Editor or admin action
 * required. Live DB price/stock win when the row exists; everything else
 * comes from here. The admin one-click sync (/api/admin/bluetti-sync)
 * persists them to the DB when convenient.
 */

const STAMP = '2026-10-12T00:00:00.000Z'

/** Newest-first display order on the Bluetti hub + homepage rail. */
export const BLUETTI_NEW_SLUGS = [
  'bluetti-homestar-3',
  'bluetti-hv6k',
  'bluetti-hv10k',
  'bluetti-hb500',
  'bluetti-pv100',
  'bluetti-base-b500',
  'bluetti-meter-ep760',
  'bluetti-ems-ep760',
] as const

export const FALLBACK_BLUETTI_PRODUCTS: Record<string, Product> = {
  'bluetti-homestar-3': {
    id: 'fallback-bluetti-homestar-3',
    sku: 'BLUETTI-HOMESTAR-3',
    brand: 'Bluetti',
    category: 'Power Stations',
    subcategory: 'Residential Backup',
    name: 'Bluetti Homestar 3',
    slug: 'bluetti-homestar-3',
    description:
      'The Bluetti Homestar 3 is an all-in-one residential backup system with 2.0kW continuous output and 3.01kWh battery storage. A fixed home backup unit — not a portable box — that keeps lights, fridge, WiFi, TV and phone charging running through KPLC outages in Kenya. Installs as part of the house, switches over automatically when the grid drops, and recharges from mains or up to 2000W of solar.',
    specs: {
      capacity: '3014Wh',
      ac_output: '2000W (Surge 3000W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '2000W Max',
      voltage: '230V single-phase',
      grid_protection: '140V–280V',
      noise: '≤50dB',
      type: 'All-in-One ESS',
    },
    images: ['/products/bluetti/bluetti-homestar-3.webp'],
    price_kes: 111500,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: 'NEW',
    in_stock: true,
    stock_qty: 10,
    featured: true,
    sort_order: 80,
    meta_title: 'Buy Bluetti Homestar 3 in Kenya — Price KES 111,500 | Batteriq',
    meta_description:
      'Buy the Bluetti Homestar 3 in Kenya for KES 111,500. 2.0kW all-in-one residential backup with 3.01kWh storage. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.9,
    schema_review_count: 6,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-hv6k': {
    id: 'fallback-bluetti-hv6k',
    sku: 'BLUETTI-HV6K',
    brand: 'Bluetti',
    category: 'Power Stations',
    subcategory: 'Residential Backup',
    name: 'Bluetti HV6K Inverter',
    slug: 'bluetti-hv6k',
    description:
      'The Bluetti HV6K is a 6.2kW hybrid inverter for residential battery backup in Kenya. Sized for a typical family home — carries the fridge, freezer, lighting circuits, TV, WiFi and a home office together through an outage. Pairs with HB500 5.12kWh battery modules and solar panels (6.5kW max PV), with sub-10ms backup switching.',
    specs: {
      ac_output: '6.2kW',
      pv_input: '6.5kW Max',
      pv_range: '90–450Vdc',
      battery_voltage: '51.2V',
      max_current: '118A charge/discharge',
      chemistry: 'LiFePO4 (HB500)',
      switching: '<10ms',
      compatible: 'HB500 battery modules',
    },
    images: ['/products/bluetti/bluetti-hv6k.png'],
    price_kes: 57500,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: 'NEW',
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 81,
    meta_title: 'Buy Bluetti HV6K Inverter in Kenya — Price KES 57,500 | Batteriq',
    meta_description:
      'Buy the Bluetti HV6K 6.2kW hybrid inverter in Kenya for KES 57,500. Residential backup inverter, pairs with HB500 batteries. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 4,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-hv10k': {
    id: 'fallback-bluetti-hv10k',
    sku: 'BLUETTI-HV10K',
    brand: 'Bluetti',
    category: 'Power Stations',
    subcategory: 'Residential Backup',
    name: 'Bluetti HV10K Inverter',
    slug: 'bluetti-hv10k',
    description:
      'The Bluetti HV10K is a 10kW hybrid inverter for whole-house battery backup in Kenya. For large homes and small businesses that need everything on at once — pumps, fridges and freezers, air conditioning, lighting and office equipment. Pairs with HB500 5.12kWh battery modules, accepts up to 14kW of solar, with sub-10ms backup switching.',
    specs: {
      ac_output: '10kW',
      pv_input: '14kW Max',
      pv_range: '90–450Vdc',
      battery_voltage: '51.2V',
      max_current: '230A charge/discharge',
      chemistry: 'LiFePO4 (HB500)',
      switching: '<10ms',
      compatible: 'HB500 battery modules',
    },
    images: ['/products/bluetti/bluetti-hv10k.png'],
    price_kes: 111500,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: 'NEW',
    in_stock: true,
    stock_qty: 8,
    featured: false,
    sort_order: 82,
    meta_title: 'Buy Bluetti HV10K Inverter in Kenya — Price KES 111,500 | Batteriq',
    meta_description:
      'Buy the Bluetti HV10K 10kW hybrid inverter in Kenya for KES 111,500. Whole-house backup inverter, pairs with HB500 batteries. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 4,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-hb500': {
    id: 'fallback-bluetti-hb500',
    sku: 'BLUETTI-HB500',
    brand: 'Bluetti',
    category: 'Batteries',
    subcategory: 'Residential Backup',
    name: 'Bluetti HB500 Battery',
    slug: 'bluetti-hb500',
    description:
      'The Bluetti HB500 is a 5.12kWh LiFePO4 battery module for HV6K and HV10K residential backup systems in Kenya. One module covers a family home\u2019s essentials for an evening — stack more modules as needs and budget grow. Rated for 6000+ cycles and expandable up to 64 units (327.68kWh max).',
    specs: {
      capacity: '5.12kWh (51.2V 100Ah)',
      chemistry: 'LiFePO4',
      compatible: 'Bluetti HV6K, HV10K',
      max_parallel: '64 units',
      max_system: '327.68kWh',
      cycles: '6000+',
      max_discharge: '100A',
    },
    images: ['/products/bluetti/bluetti-hb500.png'],
    price_kes: 116500,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: 'NEW',
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 83,
    meta_title: 'Buy Bluetti HB500 Battery in Kenya — Price KES 116,500 | Batteriq',
    meta_description:
      'Buy the Bluetti HB500 5.12kWh battery in Kenya for KES 116,500. Expansion battery for HV6K/HV10K residential systems. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.9,
    schema_review_count: 5,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-pv100': {
    id: 'fallback-bluetti-pv100',
    sku: 'BLUETTI-PV100',
    brand: 'Bluetti',
    category: 'Solar Panels',
    subcategory: null,
    name: 'Bluetti PV100 Solar Panel 100W',
    slug: 'bluetti-pv100',
    description:
      'The Bluetti PV100 is a 100W foldable monocrystalline solar panel for Bluetti power stations and residential backup systems in Kenya. Lightweight and portable with MC4 connector — ideal for topping up Homestar, HV and AC series systems from Kenya\u2019s abundant sunshine.',
    specs: {
      power: '100W',
      type: 'Monocrystalline',
      foldable: 'Yes',
      connector: 'MC4',
      compatible: 'Bluetti power stations',
    },
    images: ['/products/bluetti/bluetti-pv120.jpg'],
    price_kes: 15600,
    compare_price_kes: 16000,
    discount_percent: 3,
    discount_badge: 'BLACK NOVEMBER',
    in_stock: true,
    stock_qty: 15,
    featured: false,
    sort_order: 133,
    meta_title: 'Buy Bluetti PV100 Solar Panel 100W in Kenya — Price KES 15,600 | Batteriq',
    meta_description:
      'Buy the Bluetti PV100 100W solar panel in Kenya for KES 15,600. Foldable monocrystalline, MC4 connector. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 6,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-base-b500': {
    id: 'fallback-bluetti-base-b500',
    sku: 'BLUETTI-BASE-B500',
    brand: 'Bluetti',
    category: 'Accessories',
    subcategory: 'Residential Backup',
    name: 'Bluetti Base for B500 Battery',
    slug: 'bluetti-base-b500',
    description:
      'The Bluetti Base is the mounting base accessory for the Bluetti B500 5kWh battery module. Gives the 50kg battery a stable, secure floor installation as part of an EP760 residential backup system in Kenya. Genuine Bluetti accessory from the authorised dealer.',
    specs: {
      compatible: 'Bluetti B500 battery',
      type: 'Mounting base',
    },
    images: ['/products/bluetti/bluetti-b500.jpg'],
    price_kes: 11000,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 140,
    meta_title: 'Buy Bluetti Base for B500 Battery in Kenya — Price KES 11,000 | Batteriq',
    meta_description:
      'Buy the Bluetti Base for B500 battery in Kenya for KES 11,000. Genuine mounting base accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 3,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-meter-ep760': {
    id: 'fallback-bluetti-meter-ep760',
    sku: 'BLUETTI-METER-EP760',
    brand: 'Bluetti',
    category: 'Accessories',
    subcategory: 'Residential Backup',
    name: 'Bluetti Meter for EP760',
    slug: 'bluetti-meter-ep760',
    description:
      'The Bluetti Meter is the energy meter accessory for the Bluetti EP760 residential backup system. Monitors grid import/export so the EP760 hybrid inverter manages solar, battery and grid power correctly in Kenyan homes. Professional installation recommended. Genuine Bluetti accessory from the authorised dealer.',
    specs: {
      compatible: 'Bluetti EP760',
      type: 'Energy meter',
    },
    images: ['/products/bluetti/bluetti-ep760.jpg'],
    price_kes: 6600,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 141,
    meta_title: 'Buy Bluetti Meter for EP760 in Kenya — Price KES 6,600 | Batteriq',
    meta_description:
      'Buy the Bluetti Meter for EP760 in Kenya for KES 6,600. Genuine energy meter accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 3,
    created_at: STAMP,
    updated_at: STAMP,
  },
  'bluetti-ems-ep760': {
    id: 'fallback-bluetti-ems-ep760',
    sku: 'BLUETTI-EMS-EP760',
    brand: 'Bluetti',
    category: 'Accessories',
    subcategory: 'Residential Backup',
    name: 'Bluetti EMS for EP760',
    slug: 'bluetti-ems-ep760',
    description:
      'The Bluetti EMS is the energy management accessory for the Bluetti EP760 residential backup system. Coordinates the EP760 inverter, B500 batteries and solar input for automated backup and efficient daily use in Kenyan homes. Professional installation recommended. Genuine Bluetti accessory from the authorised dealer.',
    specs: {
      compatible: 'Bluetti EP760',
      type: 'Energy management',
    },
    images: ['/products/bluetti/bluetti-ep760.jpg'],
    price_kes: 24000,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 8,
    featured: false,
    sort_order: 142,
    meta_title: 'Buy Bluetti EMS for EP760 in Kenya — Price KES 24,000 | Batteriq',
    meta_description:
      'Buy the Bluetti EMS for EP760 in Kenya for KES 24,000. Genuine energy management accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.',
    schema_rating: 4.8,
    schema_review_count: 3,
    created_at: STAMP,
    updated_at: STAMP,
  },
  ...quoteSystems(),
}

/**
 * Installed Bluetti home systems listed in the Power Stations menu. They are
 * sized and quoted per site, so they carry no shelf price (price_kes 0): the
 * product page shows "Price on request" with a WhatsApp quote button instead
 * of Add to Cart. Not part of BLUETTI_NEW_SLUGS, so they stay out of product
 * grids, "from KES" figures and the admin sync.
 */
export const BLUETTI_QUOTE_SLUGS = [
  'bluetti-homestar-5',
  'bluetti-ep2000-10kw',
  'bluetti-ep2000-15kw',
  'bluetti-ep2000-20kw',
] as const

function quoteSystems(): Record<string, Product> {
  const base = {
    brand: 'Bluetti' as const,
    category: 'Solar Home Systems' as const,
    subcategory: 'Residential Backup',
    price_kes: 0,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 0,
    featured: false,
    schema_rating: 0,
    schema_review_count: 0,
    created_at: STAMP,
    updated_at: STAMP,
  }
  const ep2000 = (kw: number, kwh: string, modules: string, sort: number): Product => ({
    ...base,
    id: `fallback-bluetti-ep2000-${kw}kw`,
    sku: `BLUETTI-EP2000-${kw}KW`,
    name: `Bluetti EP2000 ${kw}kW Solution`,
    slug: `bluetti-ep2000-${kw}kw`,
    description: `The Bluetti EP2000 ${kw}kW solution pairs a ${kw}kW inverter with ${kwh} of LiFePO4 battery energy storage for whole-home and small-business backup in Kenya. A modular, stackable system that is sized, supplied and installed for your site. Send us your load list on WhatsApp for a quote.`,
    specs: {
      ac_output: `${kw}kW`,
      capacity: kwh,
      chemistry: 'LiFePO4',
      batteries: modules,
      type: 'Modular home energy storage',
    },
    images: [`/products/bluetti/bluetti-ep2000-${kw}kw.png`],
    sort_order: sort,
    meta_title: `Bluetti EP2000 ${kw}kW Solution in Kenya | Batteriq`,
    meta_description: `Bluetti EP2000 ${kw}kW inverter with ${kwh} battery energy storage in Kenya. Supplied and installed by Batteriq, authorised Bluetti dealer. Request a quote on WhatsApp.`,
  } as Product)

  return {
    'bluetti-homestar-5': {
      ...base,
      id: 'fallback-bluetti-homestar-5',
      sku: 'BLUETTI-HOMESTAR-5',
      name: 'Bluetti Homestar 5',
      slug: 'bluetti-homestar-5',
      description:
        'The Bluetti Homestar 5 solution pairs a 3.68kW inverter with 5kWh of battery energy storage for home backup in Kenya. The larger sibling of the Homestar 3, for homes that need more power and longer runtime through KPLC outages. Send us your load list on WhatsApp for a quote.',
      specs: {
        ac_output: '3.68kW',
        capacity: '5kWh',
        type: 'Residential energy storage',
      },
      images: [],
      sort_order: 84,
      meta_title: 'Bluetti Homestar 5 in Kenya | Batteriq',
      meta_description:
        'Bluetti Homestar 5 in Kenya: 3.68kW inverter with 5kWh battery energy storage. Supplied by Batteriq, authorised Bluetti dealer. Request a quote on WhatsApp.',
    } as Product,
    'bluetti-ep2000-10kw': ep2000(10, '14.6kWh', 'B700 modules', 85),
    'bluetti-ep2000-15kw': ep2000(15, '21.9kWh', 'B700 modules', 86),
    'bluetti-ep2000-20kw': ep2000(20, '29kWh – 51kWh', 'B700 modules', 87),
  }
}

/** Black November 2026 Bluetti sale prices (KES). */
export const BLACK_NOVEMBER_SLUGS = [
  'bluetti-ac70p',
  'bluetti-ac180p',
  'bluetti-premium-30-v2',
  'bluetti-premium-100-v2',
  'bluetti-premium-200-v2',
  'bluetti-ac50p',
  'bluetti-pv100',
] as const

export const BLACK_NOVEMBER_OVERRIDES: Record<string, number> = {
  'bluetti-ac70p': 55000,
  'bluetti-ac180p': 72150,
  'bluetti-premium-30-v2': 29900,
  'bluetti-premium-100-v2': 63750,
  'bluetti-premium-200-v2': 114400,
  'bluetti-pv100': 15600,
  'bluetti-ac50p': 33750,
}

export function applyBlackNovemberOverride(p: Product): Product {
  const salePrice = BLACK_NOVEMBER_OVERRIDES[p.slug]
  if (salePrice == null) {
    // Strip any non-Black-November sale slash/badge so only the 7 Black November Bluetti items show as on sale
    return {
      ...p,
      compare_price_kes: null,
      discount_percent: null,
      discount_badge: p.discount_badge === 'NEW' ? 'NEW' : null,
    }
  }
  const original = Math.max(p.compare_price_kes ?? 0, p.price_kes ?? 0)
  const isCut = original > salePrice
  const kesStr = `KES ${salePrice.toLocaleString('en-KE')}`
  return {
    ...p,
    price_kes: salePrice,
    compare_price_kes: isCut ? original : p.compare_price_kes,
    discount_percent: isCut ? Math.round(((original - salePrice) / original) * 100) : p.discount_percent,
    discount_badge: 'BLACK NOVEMBER',
    meta_title: p.meta_title ? p.meta_title.replace(/KES [0-9,]+/g, kesStr) : p.meta_title,
    meta_description: p.meta_description ? p.meta_description.replace(/KES [0-9,]+/g, kesStr) : p.meta_description,
  }
}

/**
 * Merge DB rows with the code fallbacks. Fallback specs/descriptions/images
 * always win (they are the corrected data); live DB price/stock win when the
 * row exists. Missing rows are filled from fallback so they always render.
 * Slashed Black November items lead first, then new residential items, then DB sort_order.
 */
export function withBluettiFallbacks(dbProducts: Product[]): Product[] {
  const list = dbProducts ?? []
  const bySlug = new Map(list.map((p) => [p.slug, p]))
  const merged: Product[] = list.map((p) => {
    const fallback = FALLBACK_BLUETTI_PRODUCTS[p.slug]
    if (!fallback) return applyBlackNovemberOverride(p)
    return applyBlackNovemberOverride({
      ...fallback,
      id: p.id,
      price_kes: p.price_kes ?? fallback.price_kes,
      compare_price_kes: p.compare_price_kes ?? fallback.compare_price_kes ?? null,
      discount_percent: p.discount_percent ?? fallback.discount_percent ?? null,
      discount_badge: p.discount_badge ?? fallback.discount_badge,
      in_stock: p.in_stock ?? true,
      stock_qty: p.stock_qty ?? fallback.stock_qty,
    })
  })
  for (const slug of BLUETTI_NEW_SLUGS) {
    if (!bySlug.has(slug)) merged.push(applyBlackNovemberOverride(FALLBACK_BLUETTI_PRODUCTS[slug]))
  }
  const bnOrder = new Map(BLACK_NOVEMBER_SLUGS.map((s, i) => [s as string, i]))
  const lead = new Map(BLUETTI_NEW_SLUGS.map((s, i) => [s as string, i]))
  return merged.sort((a, b) => {
    const aTier = bnOrder.has(a.slug) ? 0 : lead.has(a.slug) ? 1 : 2
    const bTier = bnOrder.has(b.slug) ? 0 : lead.has(b.slug) ? 1 : 2
    if (aTier !== bTier) return aTier - bTier
    if (aTier === 0) return (bnOrder.get(a.slug) ?? 0) - (bnOrder.get(b.slug) ?? 0)
    if (aTier === 1) return (lead.get(a.slug) ?? 0) - (lead.get(b.slug) ?? 0)
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}
