import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductCard } from '@/components/product/ProductCard'
import { FaqList } from '@/components/seo/FaqList'
import { ReadMore } from '@/components/seo/ReadMore'
import { Segments } from '@/components/product/ProductOverview'
import { newPageMetadata } from '@/lib/newPages'
import { getProductsByCategories } from '@/lib/productContentServer'
import { kes, pairingsByNeed, panelWattsOf, solarGeneratorFaqs, solarInputOf, delivery } from '@/lib/newPageContent'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'
import { productDisplayName } from '@/lib/seo'
import { withCatalogFallback } from '@/lib/delta-series'

export const revalidate = 300

const PATH = '/solar-generators'
const DESCRIPTION =
  'Solar generator prices in Kenya: a power station plus solar panels, paired from our live catalogue for apartments, family homes and whole-home backup. M-Pesa accepted.'

export const metadata: Metadata = newPageMetadata(PATH, {
  title: { absolute: 'Solar Generator Price in Kenya — Recommended Pairings | Batteriq' },
  description: DESCRIPTION,
})

export default async function SolarGeneratorsPage() {
  const products = withCatalogFallback(await getProductsByCategories(['Power Stations', 'Solar Home Systems', 'Solar Panels']))
  const stations = products.filter((p) => p.category !== 'Solar Panels')
  const panels = products.filter((p) => p.category === 'Solar Panels')
  const groups = pairingsByNeed(stations, panels)
  const listed = groups.flatMap((g) => g.pairings.flatMap((x) => [x.station, x.panel]))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Solar Generators', path: PATH }]))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(collectionPageJsonLd({ path: PATH, name: 'Solar Generators in Kenya', description: DESCRIPTION, products: listed }))}
      />
      <Header />
      <ToastContainer />
      <PageHero
        title="Solar Generators in Kenya"
        subtitle="A solar generator is a power station plus solar panels. Here are recommended pairings from our live catalogue, by home size."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Solar Generators', href: PATH },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        height="small"
        align="left"
      />

      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12 space-y-16">
        {groups.map(({ need, pairings }) =>
          pairings.length ? (
            <section key={need.key} id={need.key}>
              <h2 className="h2-fluid text-gray-900 mb-2">{need.title}</h2>
              <p className="text-gray-500 mb-8">
                Power stations of {need.range}: enough for {need.runs}.
              </p>
              <div className="space-y-10">
                {pairings.map((x) => (
                  <div key={x.station.slug}>
                    <p className="text-sm font-black text-gray-900 mb-1">
                      Recommended pairing · {kes(x.total)} together at today&apos;s prices
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Sold separately: {productDisplayName(x.station)} ({kes(x.station.price_kes)}) + {productDisplayName(x.panel)} ({kes(x.panel.price_kes)}).{' '}
                      {x.basis === 'listed'
                        ? 'Our product data lists this panel as compatible.'
                        : `The panel's ${panelWattsOf(x.panel)} W fits within the station's solar input (${solarInputOf(x.station)}).`}
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      <ProductCard product={x.station} />
                      <ProductCard product={x.panel} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null
        )}
      </div>

      <section className="bg-white border-t border-gray-100 py-16" aria-labelledby="sg-about">
        <div className="max-w-4xl mx-auto px-6">
          <h2 id="sg-about" className="text-2xl font-black text-gray-900 mb-4">About solar generators in Kenya</h2>
          <ReadMore lead={<p className="text-gray-600 leading-relaxed">A solar generator is not a different machine: it is a portable power station charged by solar panels. The power station stores energy in its battery and gives you normal sockets; the panels refill it from sunshine, so you can run lights, Wi-Fi, a TV and a fridge through KPLC outages with no fuel, noise or fumes.</p>}>
            <p className="text-gray-600 leading-relaxed">
              <Segments paragraph={[
                'To choose one, start with the power station: its capacity in watt-hours decides how long it runs your appliances, and its solar input decides which panels it can use. Then add panels whose combined watts fit within that input — more panel watts recharge it faster. Browse every ',
                { text: 'power station', href: '/power-stations' },
                ' and all our ',
                { text: 'solar panels', href: '/solar' },
                ', or read our ',
                { text: 'guide to sizing a power station', href: '/answers/what-size-power-station' },
                '.',
              ]} />
            </p>
            <p className="text-gray-600 leading-relaxed">
              These are recommended pairings, not bundles: each product is sold separately at its normal price, and the combined price above updates with our live prices. Always confirm the connector cable — we will check it for you on WhatsApp. {delivery}
            </p>
          </ReadMore>
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Frequently asked questions</h2>
            <FaqList faqs={solarGeneratorFaqs(stations, panels)} />
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
