import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductGrid } from '@/components/product/ProductGrid'
import { FaqList } from '@/components/seo/FaqList'
import { ReadMore } from '@/components/seo/ReadMore'
import { Segments } from '@/components/product/ProductOverview'
import { newPageMetadata } from '@/lib/newPages'
import { getProductsByCategories } from '@/lib/productContentServer'
import { NEEDS, stationsFor, capacityWh, kes, delivery, warranty } from '@/lib/newPageContent'
import { runtimeHours } from '@/lib/productContent'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'
import { productDisplayName } from '@/lib/seo'
import { withCatalogFallback } from '@/lib/delta-series'

export const revalidate = 300

const PATH = '/home-backup-power'
const DESCRIPTION =
  'Power backup for your home in Kenya: EcoFlow and BLUETTI power stations and home systems for KPLC blackouts, grouped by home size, with live prices. M-Pesa accepted.'

export const metadata: Metadata = newPageMetadata(PATH, {
  title: { absolute: 'Home Backup Power in Kenya — For KPLC Blackouts | Batteriq' },
  description: DESCRIPTION,
})

export default async function HomeBackupPowerPage() {
  const products = withCatalogFallback(await getProductsByCategories(['Power Stations', 'Solar Home Systems']))
  const groups = NEEDS.map((need) => ({ need, items: stationsFor(need, products).slice(0, 8) }))
  const example = groups[1].items[0] ?? groups[0].items[0]
  const exWh = example ? capacityWh(example) : null

  const faqs = [
    {
      question: 'What is the best power backup for a home in Kenya?',
      answer: 'For most homes, a portable power station: it needs no installation, runs silently with no fuel, and recharges from the wall or solar panels. Choose its size by what you want to keep running during a KPLC outage; the sections above group our stations by home size.',
    },
    {
      question: 'How long will home backup last during a blackout?',
      answer: example && exWh
        ? `Roughly capacity × 0.85 ÷ the watts you use. The ${productDisplayName(example)} (${exWh.toLocaleString('en-KE')} Wh) runs a 150 W fridge for approximately ${runtimeHours(exWh, 150)} hours on its own; adding a TV and lights shortens that. Send us your appliance list on WhatsApp and we will estimate it for you.`
        : 'Roughly capacity × 0.85 ÷ the watts you use. Send us your appliance list on WhatsApp and we will estimate it for you.',
    },
    {
      question: 'Can I add solar to my home backup?',
      answer: 'Yes. Most of our power stations accept solar panels, so they recharge during the day without KPLC power. Check the station\'s solar input and choose panels within it; see our solar generator pairings for matched examples.',
    },
    { question: 'Is there a warranty, and how do I pay?', answer: `${warranty} ${delivery}` },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Home Backup Power', path: PATH }]))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(collectionPageJsonLd({ path: PATH, name: 'Home Backup Power in Kenya', description: DESCRIPTION, products: groups.flatMap((g) => g.items) }))}
      />
      <Header />
      <ToastContainer />
      <PageHero
        title="Home Backup Power in Kenya"
        subtitle="Keep the lights, Wi-Fi, TV and fridge on through KPLC blackouts. Power stations and home systems, grouped by home size."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Home Backup Power', href: PATH },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        height="small"
        align="left"
      />

      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12 space-y-16">
        {groups.map(({ need, items }) =>
          items.length ? (
            <section key={need.key} id={need.key}>
              <h2 className="h2-fluid text-gray-900 mb-2">{need.title}</h2>
              <p className="text-gray-500 mb-8">
                {need.range}: enough for {need.runs}. From {kes(items[0].price_kes)}.
              </p>
              <ProductGrid products={items} />
            </section>
          ) : null
        )}
      </div>

      <section className="bg-white border-t border-gray-100 py-16" aria-labelledby="hb-about">
        <div className="max-w-4xl mx-auto px-6">
          <h2 id="hb-about" className="text-2xl font-black text-gray-900 mb-4">About home backup power in Kenya</h2>
          <ReadMore lead={<p className="text-gray-600 leading-relaxed">KPLC outages can last minutes or a whole day. A home backup power station stores electricity in a battery and switches your essentials over to it, so the fridge keeps cold, the Wi-Fi stays up and the lights stay on — without the noise, fuel and fumes of a petrol generator.</p>}>
            <p className="text-gray-600 leading-relaxed">
              <Segments paragraph={[
                'Size it by what you want to run and for how long: add up the watts of your essentials and compare them with the station\'s capacity (Wh) and AC output (W). Our ',
                { text: 'power station sizing guide', href: '/answers/what-size-power-station' },
                ' walks through it, and ',
                { text: 'solar generator pairings', href: '/solar-generators' },
                ' show which panels recharge each station during the day. Browse every ',
                { text: 'power station', href: '/power-stations' },
                ' or compare models on our ',
                { text: 'comparison page', href: '/compare' },
                '.',
              ]} />
            </p>
            <p className="text-gray-600 leading-relaxed">{warranty} {delivery}</p>
          </ReadMore>
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Frequently asked questions</h2>
            <FaqList faqs={faqs} />
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
