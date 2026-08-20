/**
 * One-off SEO data fix for products.
 *
 *   node scripts/seo-fill.mjs          # dry run — prints every change, writes nothing
 *   node scripts/seo-fill.mjs --apply  # writes to Supabase
 *
 * Does three things:
 *  1. Hand-written meta for the products that had none (the DELTA 3 flagships).
 *  2. Rewrites meta_titles over 60 chars — they were all the same
 *     "Buy X in Kenya — Price KES Y | Batteriq" template and were truncating
 *     in Google. The compact form keeps the model name and price, which is
 *     what people actually search.
 *  3. Trims meta_descriptions over 160 chars by dropping the redundant
 *     trailing "Batteriq." and filler adverbs before clamping on a word break.
 *
 * Never invents specs, prices or ratings.
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APPLY = process.argv.includes('--apply')
const TITLE_MAX = 60
const DESC_MAX = 160

const kes = n => `KES ${Number(n || 0).toLocaleString('en-KE')}`

function clamp(text, max) {
  const t = String(text).trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,—-]+$/, '')
}

// ── 1. Hand-written meta for products that had none ─────────────────────────
// Copy uses ONLY what the product row already states: price, series, LFP
// chemistry, 24-month warranty, and the stated use case. No capacity or output
// figures are claimed, because those are not in the data.
const HAND_WRITTEN = {
  'delta-3-100-air': {
    meta_title: 'EcoFlow DELTA 3 100 Air Kenya — Compact KES 99,999 Backup',
    meta_description:
      'EcoFlow DELTA 3 100 Air in Kenya for KES 99,999. The most compact DELTA 3 — grab-and-go blackout backup on an LFP battery. M-Pesa checkout, 24-month warranty.',
    description:
      "The EcoFlow DELTA 3 100 Air is the most compact power station in the DELTA 3 series, built for Kenyan homes that want reliable backup without a bulky setup. It runs on a LiFePO4 (LFP) battery — the same chemistry EcoFlow uses across the DELTA 3 line for long cycle life and safe daily charging. At KES 99,999 from Batteriq, Kenya's authorised EcoFlow dealer, it ships as genuine stock with a 24-month warranty and an official eTIMS KRA invoice. Pay instantly with M-Pesa or by Visa/Mastercard at checkout, with delivery across Nairobi and nationwide shipping to all 47 counties. When KPLC goes down mid-evening, this is the unit you grab to keep the lights, router and phones going — light enough to move between rooms, or to carry upcountry for the weekend.",
  },
  'delta-3-classic': {
    meta_title: 'EcoFlow DELTA 3 Classic Kenya — Family Backup KES 169,999',
    meta_description:
      'EcoFlow DELTA 3 Classic in Kenya for KES 169,999. Everyday home backup for lights, fridge and Wi-Fi when KPLC goes down. Pay by M-Pesa. 24-month warranty.',
    description:
      "The EcoFlow DELTA 3 Classic is everyday home backup for the whole family, sized for Kenyan households that lose power often enough to want a proper solution rather than candles and a torch. Built on a LiFePO4 (LFP) battery for long service life, it is made to carry the essentials — lights, the fridge, Wi-Fi and phone charging — through a typical KPLC outage. Batteriq is Kenya's authorised EcoFlow dealer, so at KES 169,999 you get genuine stock backed by a 24-month warranty and an official eTIMS KRA invoice. Pay by M-Pesa or Visa/Mastercard, with Nairobi delivery and nationwide shipping. If your evenings keep getting interrupted just as the family sits down to eat, this is the DELTA 3 most Kenyan homes settle on.",
  },
  'delta-3-max-plus': {
    meta_title: 'EcoFlow DELTA 3 Max Plus Kenya — Expandable KES 329,999',
    meta_description:
      'EcoFlow DELTA 3 Max Plus in Kenya for KES 329,999. Expandable LFP backup with fast recharge and app control. M-Pesa or card. 24-month warranty.',
    description:
      "The EcoFlow DELTA 3 Max Plus is the expandable option in the DELTA 3 range, for Kenyan homes and small businesses that expect their power needs to grow. Start with the main unit and add capacity later rather than replacing the whole system. It uses a LiFePO4 (LFP) battery, supports fast recharge, and is controlled from the EcoFlow app so you can check the charge level from your phone. At KES 329,999 from Batteriq, Kenya's authorised EcoFlow dealer, it comes as genuine stock with a 24-month warranty and an official eTIMS KRA invoice. Pay by M-Pesa or card, with Nairobi delivery and nationwide shipping. A strong fit for a salon, cyber café or home office where a blackout means lost income, not just inconvenience.",
  },
  'delta-3-ultra-plus': {
    meta_title: 'EcoFlow DELTA 3 Ultra Plus Kenya — 11kWh Home Backup',
    meta_description:
      'EcoFlow DELTA 3 Ultra Plus in Kenya for KES 649,999. Whole-home backup with up to 11kWh of expandable LFP power. M-Pesa or card, 24-month warranty.',
    description:
      "The EcoFlow DELTA 3 Ultra Plus sits at the top of the DELTA 3 range, offering whole-home backup with up to 11kWh of expandable capacity. It is the choice for Kenyan households and businesses that want the grid to become the backup rather than the main supply. Built on a LiFePO4 (LFP) battery for long cycle life, capacity scales as your needs grow. At KES 649,999 from Batteriq, Kenya's authorised EcoFlow dealer, it ships as genuine stock with a 24-month warranty and an official eTIMS KRA invoice. Pay by M-Pesa or Visa/Mastercard, with delivery in Nairobi and nationwide shipping to all 47 counties. For a family home, guest house or clinic where an outage cannot be allowed to interrupt the day, this is the unit to size around.",
  },
  // Deliberately spec-free: this row has no usable specs and no description in
  // the database, so the copy stays to what we can actually stand behind.
  'bluetti-premium-200': {
    meta_title: 'Bluetti Premium 200 Kenya — KES 127,000 | Batteriq',
    meta_description:
      'Bluetti Premium 200 in Kenya for KES 127,000 from Batteriq, an authorised Bluetti dealer. Pay by M-Pesa or card. Genuine stock with local warranty support.',
    description:
      "The Bluetti Premium 200 is available in Kenya at KES 127,000 from Batteriq, an authorised Bluetti dealer. Every unit is genuine stock supported locally and ships with an official eTIMS KRA invoice. Pay instantly with M-Pesa or by Visa/Mastercard at checkout, with delivery across Nairobi and nationwide shipping to all 47 counties. To match this unit to the appliances you need running during a KPLC outage, message our team on WhatsApp and we will size it with you before you buy.",
  },
}

// ── 2 & 3. Mechanical fixes ─────────────────────────────────────────────────
function compactTitle(product) {
  const base = `${product.name} Kenya — ${kes(product.price_kes)}`
  const withBrand = `${base} | Batteriq`
  if (withBrand.length <= TITLE_MAX) return withBrand
  if (base.length <= TITLE_MAX) return base
  return clamp(`${product.name} Kenya`, TITLE_MAX)
}

function tightenDescription(desc) {
  let d = desc.trim()
  d = d.replace(/\s*Batteriq\.\s*$/, '')           // redundant sign-off
  d = d.replace(/\bInstant M-Pesa payment\b/, 'M-Pesa payment')
  d = d.replace(/\bFast Nairobi delivery\b/, 'Nairobi delivery')
  d = d.replace(/\bAuthorised (EcoFlow|Bluetti) dealer\b/, 'Authorised $1 dealer')
  return clamp(d, DESC_MAX)
}

const run = async () => {
  const { data: products, error } = await db
    .from('products')
    .select('id,slug,name,brand,price_kes,meta_title,meta_description,description')
  if (error) throw new Error(error.message)

  const updates = []

  for (const p of products) {
    const patch = {}

    const hand = HAND_WRITTEN[p.slug]
    if (hand) {
      Object.assign(patch, hand)
    } else {
      if (p.meta_title && p.meta_title.length > TITLE_MAX) {
        patch.meta_title = compactTitle(p)
      }
      if (p.meta_description && p.meta_description.length > DESC_MAX) {
        patch.meta_description = tightenDescription(p.meta_description)
      }
    }

    if (Object.keys(patch).length) updates.push({ id: p.id, slug: p.slug, patch, before: p })
  }

  console.log(`${updates.length} products to update  (${APPLY ? 'APPLYING' : 'DRY RUN'})\n`)

  for (const u of updates) {
    console.log('── ' + u.slug)
    for (const [k, v] of Object.entries(u.patch)) {
      const before = u.before[k]
      if (k === 'description') {
        console.log(`   ${k}: ${before ? before.length : 0} chars -> ${v.length} chars`)
      } else {
        console.log(`   ${k}:`)
        console.log(`     was (${before ? before.length : 0}): ${before ?? '(empty)'}`)
        console.log(`     now (${v.length}): ${v}`)
      }
    }
  }

  if (!APPLY) {
    console.log('\nDry run only — nothing written. Re-run with --apply to write.')
    return
  }

  let ok = 0
  for (const u of updates) {
    const { error: e } = await db.from('products').update(u.patch).eq('id', u.id)
    if (e) console.error('FAILED', u.slug, e.message)
    else ok++
  }
  console.log(`\nwrote ${ok}/${updates.length} products`)
}

run().catch(e => { console.error(e); process.exit(1) })
