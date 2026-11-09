import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { newPageMetadata } from '@/lib/newPages'
import { getProductsByCategories } from '@/lib/productContentServer'
import { NEEDS, stationsFor, capacityWh, kes, delivery, warranty, priceExcludesBattery } from '@/lib/newPageContent'
import { parseWatts, productHref } from '@/lib/productContent'
import { articleJsonLd, breadcrumbListJsonLd, jsonLdScript } from '@/lib/structuredData'
import { productDisplayName } from '@/lib/seo'
import { withCatalogFallback } from '@/lib/delta-series'
import type { Product } from '@/lib/supabase/types'

export const revalidate = 300

const PATH = '/answers/what-size-power-station'
const TITLE = 'What Size Power Station Do I Need in Kenya?'
const DESCRIPTION =
  'Work out the power station size you need for KPLC blackouts: typical appliance watts, the capacity formula, worked examples for an apartment, a family home and a whole home, with live Kenyan prices.'
/** Update when the guide's content changes. */
const PUBLISHED = '2026-11-09'
const LAST_REVIEWED = '2026-11-09'
const USABLE = 0.85

export const metadata: Metadata = newPageMetadata(PATH, {
  title: { absolute: `${TITLE} | Batteriq` },
  description: DESCRIPTION,
  openGraph: { type: 'article', title: TITLE, description: DESCRIPTION },
})

/** Typical figures, clearly labelled as such — the label on the appliance wins. */
const APPLIANCES: [string, number][] = [
  ['LED bulb', 10],
  ['Phone charging', 10],
  ['Wi-Fi router', 15],
  ['TV decoder', 20],
  ['CCTV kit (4 cameras + recorder)', 40],
  ['Standing fan', 50],
  ['Laptop', 60],
  ['TV (43-inch LED)', 100],
  ['Fridge (running)', 150],
  ['Chest freezer (running)', 200],
  ['Microwave', 1000],
  ['Electric kettle', 2000],
]

const SCENARIOS = [
  { name: 'Apartment', items: 'Wi-Fi router, 4 LED bulbs, a TV and a laptop', watts: 15 + 40 + 100 + 60, hours: 4, peak: 215 },
  { name: 'Family home', items: 'a fridge, Wi-Fi router, a TV, 6 LED bulbs and a decoder', watts: 150 + 15 + 100 + 60 + 20, hours: 6, peak: 345 },
  { name: 'Whole home', items: 'a fridge, a chest freezer, Wi-Fi, two TVs, 10 LED bulbs, a fan and CCTV', watts: 150 + 200 + 15 + 200 + 100 + 50 + 40, hours: 8, peak: 755 },
]

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step
const L = ({ p }: { p: Product }) => (
  <Link href={productHref(p)} className="text-blue-600 font-semibold hover:underline">{productDisplayName(p)}</Link>
)

export default async function WhatSizeGuide() {
  const products = withCatalogFallback(await getProductsByCategories(['Power Stations', 'Solar Home Systems', 'Batteries']))
  const stations = products.filter((p) => p.category !== 'Batteries' && p.in_stock && Number(p.price_kes) > 1 && capacityWh(p) && !priceExcludesBattery(p))
  const extraBatteries = products.filter((p) => p.category === 'Batteries' && p.in_stock && Number(p.price_kes) > 1)
  /** Cheapest in-stock station with at least this capacity and AC output. */
  const pick = (wh: number, peak: number) =>
    stations
      .filter((p) => (capacityWh(p) ?? 0) >= wh && (parseWatts(String((p.specs as Record<string, unknown>)?.ac_output ?? (p.specs as Record<string, unknown>)?.power_output ?? '')) ?? Infinity) >= peak)
      .sort((a, b) => a.price_kes - b.price_kes)[0]
  const scenarios = SCENARIOS.map((s) => {
    const need = roundUp((s.watts * s.hours) / USABLE, 50)
    return { ...s, need, model: pick(need, s.peak) }
  })
  const bands = NEEDS.map((n) => ({ n, items: stationsFor(n, stations).slice(0, 3) }))
  const p = 'text-gray-600 leading-relaxed'
  const h2 = 'font-display font-bold text-gray-900 text-2xl mt-12 mb-4'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleJsonLd({ path: PATH, headline: TITLE, description: DESCRIPTION, datePublished: PUBLISHED, dateModified: LAST_REVIEWED }))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Answers', path: '/answers' }, { name: 'What size power station?', path: PATH }]))}
      />
      <Header />
      <ToastContainer />
      <PageHero
        title={TITLE}
        subtitle="Add up your watts, decide how many hours you need, and pick a capacity. Worked examples with live prices."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Answers', href: '/answers' },
          { label: 'What size power station?', href: PATH },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        badge="Buyer's Guide"
        height="small"
        align="left"
      />

      <article className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm text-gray-400 mb-8">
          Last reviewed{' '}
          <time dateTime={LAST_REVIEWED}>
            {new Date(LAST_REVIEWED).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </time>{' '}
          · Prices update automatically from our catalogue.
        </p>

        <h2 className="font-display font-bold text-gray-900 text-2xl mb-4">The short answer</h2>
        <p className={p}>
          Add up the watts of everything you want to keep running during a KPLC outage, multiply by the hours you need, and divide by 0.85
          to allow for inverter losses. That gives the capacity, in watt-hours (Wh), to look for. Then check that the power station&apos;s AC
          output, in watts (W), is higher than everything you will run at the same time. Most Kenyan homes land between 1,000 Wh and 3,000 Wh.
        </p>

        <h2 className={h2}>Step 1: list your appliances and their watts</h2>
        <p className={p}>
          Every appliance has a power rating on its label or charger. If you cannot find it, these typical figures are a fair starting point —
          but the label on your own appliance always wins.
        </p>
        <div className="overflow-x-auto border border-gray-200 rounded-[8px] my-6">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 text-gray-500 font-medium">Appliance</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Typical watts</th>
              </tr>
            </thead>
            <tbody>
              {APPLIANCES.map(([name, w]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-900">{name}</td>
                  <td className="px-5 py-3 text-gray-900 font-mono">{w.toLocaleString('en-KE')} W</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={p}>
          A fridge or freezer only draws its running watts part of the time, because the compressor switches on and off, so real use over a day
          is usually lower than the figure above. Heating appliances — kettles, irons, cookers and water heaters — draw a lot of power; a power
          station can run them only if its AC output is high enough, and they drain the battery quickly.
        </p>

        <h2 className={h2}>Step 2: decide how many hours you need</h2>
        <p className={p}>
          Think about your usual outages. A short evening blackout needs a few hours of backup; a full-day outage needs much more. Solar panels
          change the picture: if the power station recharges during the day, it only needs to carry you through the night.
        </p>

        <h2 className={h2}>Step 3: work out the capacity</h2>
        <p className={p}>
          Capacity (Wh) = total watts × hours ÷ 0.85. Here are three worked examples, each with the lowest-priced in-stock power station we sell
          that covers it today:
        </p>
        <div className="space-y-6 my-6">
          {scenarios.map((s) => (
            <div key={s.name} className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6" style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
              <h3 className="text-base font-bold text-gray-900 mb-2">{s.name}</h3>
              <p className={`${p} text-sm`}>
                Running {s.items} — about {s.watts} W — for {s.hours} hours needs {s.watts} × {s.hours} ÷ 0.85 ≈{' '}
                <strong className="text-gray-900">{s.need.toLocaleString('en-KE')} Wh</strong>.{' '}
                {s.model ? (
                  <>The <L p={s.model} /> ({capacityWh(s.model)!.toLocaleString('en-KE')} Wh, {kes(s.model.price_kes)}) covers it.</>
                ) : (
                  <>Ask us on WhatsApp: we will combine a power station with extra batteries to reach this.</>
                )}
              </p>
            </div>
          ))}
        </div>

        <h2 className={h2}>Step 4: check the AC output and surge</h2>
        <p className={p}>
          Capacity is how long; AC output is how much at once. Add up everything you will switch on together and make sure it is below the
          station&apos;s AC output. Motors in fridges, freezers and pumps briefly draw several times their running watts when they start, which
          is what the surge figure on each product page is for. If you plan to use a microwave or kettle, choose a station whose AC output
          comfortably exceeds that appliance&apos;s rating.
        </p>

        <h2 className={h2}>Step 5: plan how you will recharge</h2>
        <p className={p}>
          Every power station recharges from a wall socket when KPLC power is back. Most also accept solar panels, listed as the solar input
          on each product page; panels whose combined watts fit within that input will recharge it during the day. See our{' '}
          <Link href="/solar-generators" className="text-blue-600 font-semibold hover:underline">solar generator pairings</Link> for matched
          station-and-panel examples, or browse all{' '}
          <Link href="/solar" className="text-blue-600 font-semibold hover:underline">solar panels</Link>.
        </p>

        <h2 className={h2}>Step 6: leave room to grow</h2>
        <p className={p}>
          Many power stations accept extra batteries, shown as &quot;Expandable to&quot; in their specifications, so you can start smaller and add
          capacity later.
          {extraBatteries.length > 0 && <> We stock {extraBatteries.length} extra batteries from {kes(Math.min(...extraBatteries.map((b) => b.price_kes)))}; check which model each one fits.</>}
        </p>

        <h2 className={h2}>Quick size guide</h2>
        <div className="space-y-4">
          {bands.map(({ n, items }) => (
            <p key={n.key} className={p}>
              <strong className="text-gray-900">{n.title} ({n.range}):</strong> {n.runs}.
              {items.length > 0 && (
                <> Options from {kes(items[0].price_kes)}: {items.map((x, i) => (
                  <span key={x.slug}>{i ? (i === items.length - 1 ? ' and ' : ', ') : ''}<L p={x} /></span>
                ))}.</>
              )}
            </p>
          ))}
        </div>

        <h2 className={h2}>Next steps</h2>
        <p className={p}>
          Compare models side by side on our <Link href="/compare" className="text-blue-600 font-semibold hover:underline">comparison page</Link>,
          browse every <Link href="/power-stations" className="text-blue-600 font-semibold hover:underline">power station</Link>, or read more
          short answers in our <Link href="/answers" className="text-blue-600 font-semibold hover:underline">backup power guide</Link>. Still
          unsure? Send us your appliance list on WhatsApp and we will size it for you. {warranty} {delivery}
        </p>
      </article>
      <Footer />
    </>
  )
}
