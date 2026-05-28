import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env vars from .env.local
const envPath = resolve(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

const updates = [
  // Power Stations
  { slug: 'delta-pro',                  image: '/products/ecoflow/delta-pro.jpg' },
  { slug: 'delta-pro-3',               image: '/products/ecoflow/delta-pro-3.jpg' },
  { slug: 'delta-2-max',               image: '/products/ecoflow/delta-2-max.jpg' },
  { slug: 'delta-2',                   image: '/products/ecoflow/delta-2.jpg' },
  { slug: 'delta-3',                   image: '/products/ecoflow/delta-3.jpg' },
  { slug: 'delta-3-plus',              image: '/products/ecoflow/delta-3-plus.jpg' },
  { slug: 'efe2000',                   image: '/products/ecoflow/efe2000.jpg' },
  { slug: 'river-2',                   image: '/products/ecoflow/river-2.jpg' },
  { slug: 'river-2-max',               image: '/products/ecoflow/river-2-max.jpg' },
  { slug: 'river-2-pro',               image: '/products/ecoflow/river-2-pro.jpg' },
  { slug: 'river-3',                   image: '/products/ecoflow/river-3.jpg' },
  { slug: 'river-3-plus',              image: '/products/ecoflow/river-3-plus.jpg' },
  { slug: 'e980',                      image: '/products/ecoflow/e980.jpg' },
  // Solar Panels
  { slug: 'solar-panel-45w',           image: '/products/ecoflow/solar-panel-45w.jpg' },
  { slug: 'solar-panel-60w',           image: '/products/ecoflow/solar-panel-60w.jpg' },
  { slug: 'solar-panel-110w',          image: '/products/ecoflow/solar-panel-110w.jpg' },
  { slug: 'solar-panel-160w',          image: '/products/ecoflow/solar-panel-160w.jpg' },
  { slug: 'solar-panel-220w',          image: '/products/ecoflow/solar-panel-220w.jpg' },
  { slug: 'solar-panel-400w',          image: '/products/ecoflow/solar-panel-400w.jpg' },
  { slug: 'rigid-solar-panel-125w-x2', image: '/products/ecoflow/rigid-solar-panel-125w-x2.jpg' },
  { slug: 'flexible-solar-panel-100w', image: '/products/ecoflow/flexible-solar-panel-100w.jpg' },
  // Solar Home Systems
  { slug: 'powerkit-5kwh',             image: '/products/ecoflow/powerkit-5kwh.jpg' },
  { slug: 'powerkit-10kwh',            image: '/products/ecoflow/powerkit-10kwh.jpg' },
  { slug: 'powerkit-15kwh',            image: '/products/ecoflow/powerkit-15kwh.jpg' },
  // Appliances
  { slug: 'glacier-portable-fridge-freezer', image: '/products/ecoflow/glacier-portable-fridge-freezer.jpg' },
  { slug: 'wave-2-portable-air-conditioner', image: '/products/ecoflow/wave-2-portable-air-conditioner.jpg' },
  // Accessories
  { slug: 'alternator-charger-800w',         image: '/products/ecoflow/alternator-charger-800w.jpg' },
  { slug: 'powerstream-micro-inverter-800w', image: '/products/ecoflow/powerstream-micro-inverter-800w.jpg' },
  { slug: 'powerstream-smart-plug-uk',       image: '/products/ecoflow/powerstream-smart-plug-uk.jpg' },
  { slug: 'rapid-power-bank-10000mah',       image: '/products/ecoflow/rapid-power-bank-10000mah.jpg' },
  { slug: 'rapid-power-bank-5000mah',        image: '/products/ecoflow/rapid-power-bank-5000mah.jpg' },
  { slug: 'solar-panel-hat-l',               image: '/products/ecoflow/solar-panel-hat-l.jpg' },
  { slug: 'solar-panel-hat-xl',              image: '/products/ecoflow/solar-panel-hat-xl.jpg' },
  { slug: 'mc4-to-xt60-solar-cable',         image: '/products/ecoflow/mc4-to-xt60-solar-cable.jpg' },
  { slug: 'camp-torches',                    image: '/products/ecoflow/camp-torches.jpg' },

  // ── Bluetti — Power Stations ──
  { slug: 'bluetti-ac2p',     image: '/products/bluetti/bluetti-ac2p.jpg' },
  { slug: 'bluetti-eb3a',     image: '/products/bluetti/bluetti-eb3a.jpg' },
  { slug: 'bluetti-ac50p',    image: '/products/bluetti/bluetti-ac50p.jpg' },
  { slug: 'bluetti-ac70p',    image: '/products/bluetti/bluetti-ac70p.jpg' },
  { slug: 'bluetti-ac180p',   image: '/products/bluetti/bluetti-ac180p.jpg' },
  { slug: 'bluetti-ac200pl',  image: '/products/bluetti/bluetti-ac200pl.jpg' },
  { slug: 'bluetti-ac300',    image: '/products/bluetti/bluetti-ac300.jpg' },
  { slug: 'bluetti-ac500',    image: '/products/bluetti/bluetti-ac500.jpg' },
  { slug: 'bluetti-ep760',    image: '/products/bluetti/bluetti-ep760.jpg' },
  // ── Bluetti — Solar Panels ──
  { slug: 'bluetti-pv120',    image: '/products/bluetti/bluetti-pv120.jpg' },
  { slug: 'bluetti-pv200',    image: '/products/bluetti/bluetti-pv200.jpg' },
  { slug: 'bluetti-pv350',    image: '/products/bluetti/bluetti-pv350.jpg' },
  // ── Bluetti — Batteries ──
  { slug: 'bluetti-b230',     image: '/products/bluetti/bluetti-b230.jpg' },
  { slug: 'bluetti-b300k',    image: '/products/bluetti/bluetti-b300k.jpg' },
  { slug: 'bluetti-b300s',    image: '/products/bluetti/bluetti-b300s.jpg' },
  { slug: 'bluetti-b500',     image: '/products/bluetti/bluetti-b500.jpg' },
]

let passed = 0
let failed = 0

for (const { slug, image } of updates) {
  const { error } = await supabase
    .from('products')
    .update({ images: [image] })
    .eq('slug', slug)

  if (error) {
    console.error(`FAIL  ${slug}: ${error.message}`)
    failed++
  } else {
    console.log(`OK    ${slug}`)
    passed++
  }
}

console.log(`\nDone: ${passed} updated, ${failed} failed`)
