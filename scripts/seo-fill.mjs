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
  'delta-3-classic': {
    meta_title: 'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
    meta_description:
      'EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    description:
      'The EcoFlow DELTA 3 Classic is EcoFlow’s best-value 1kWh portable power station for Kenyan homes, outdoor work and everyday backup. With 1024Wh LiFePO4 capacity and 1800W AC output (3600W surge, X-Boost to 2400W), it powers essentials like lights, Wi‑Fi, TVs, fridges and power tools. Charges 0–80% in 45 mins via 1400W AC, 500W solar max, 10ms UPS switchover, 5 outlets, whisper-quiet 30dB operation.',
  },
  'delta-3-ultra': {
    meta_title: 'EcoFlow DELTA 3 Ultra Kenya — 3072Wh KES 250,799 | Batteriq',
    meta_description:
      'EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3072Wh LFP, 3600W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    description:
      'The EcoFlow DELTA 3 Ultra is the 3072Wh whole-home backup station for bigger Kenyan homes and businesses. With 3600W AC output (7200W surge, X-Boost to 4600W), 10ms UPS auto-switch, 4 charging methods (0-80% in 89 mins via AC), whisper-quiet 25dB operation and OASIS app control with Storm Guard, it keeps fridges, microwaves, office loads and essentials running through long outages.',
  },
  'delta-pro': {
    meta_title: 'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
    meta_description:
      'EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    description:
      'The EcoFlow DELTA Pro is the flagship home backup option for Kenyan homes and offices that need serious power continuity. With 3600Wh LiFePO4 capacity and 3600W AC output, it covers major appliances during outages and supports expansion for longer backup windows.',
  },
  'delta-pro-3': {
    meta_title: 'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
    meta_description:
      'EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    description:
      'The EcoFlow DELTA Pro 3 is the premium DELTA model built for demanding backup applications. Its 4096Wh LiFePO4 battery and 4000W AC output make it a strong fit for heavy-duty household backup, offices and small commercial sites that need dependable power when the grid fails.',
  },
  'delta-3-max': {
    meta_title: 'EcoFlow DELTA 3 Max Kenya — 2048Wh KES 148,199 | Batteriq',
    meta_description:
      'EcoFlow DELTA 3 Max in Kenya for KES 148,199. 2048Wh LFP, 2400W AC output, expandable to 6kWh. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    description:
      'The EcoFlow DELTA 3 Max is the 2048Wh mid-range backup station for Kenyan homes and small businesses. With 2400W AC output (5000W surge, X-Boost to 3400W), 1000W solar input, fast 2000W AC charging (0–80% in about an hour), expandability to 6kWh and sub-30ms UPS switchover, it covers fridges, microwaves, TVs, Wi‑Fi and office loads through long outages.',
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
