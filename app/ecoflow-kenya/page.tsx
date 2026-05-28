import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ProductGrid } from '@/components/product/ProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { Shield } from 'lucide-react'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Buy EcoFlow in Kenya | Official EcoFlow Dealer — Batteriq',
  description:
    'Official EcoFlow dealer in Kenya. Buy EcoFlow DELTA Pro, DELTA 2, RIVER 2, and solar panels. Pay with M-Pesa. Nairobi delivery. 24-month warranty. Batteriq Kenya.',
  keywords: [
    'EcoFlow Kenya', 'buy EcoFlow Kenya', 'EcoFlow dealer Kenya', 'EcoFlow distributor Kenya',
    'EcoFlow DELTA Pro Kenya', 'EcoFlow DELTA 2 Kenya', 'EcoFlow RIVER 2 Kenya', 'EcoFlow solar panel Kenya',
  ],
  alternates: { canonical: 'https://batteriq.com/ecoflow-kenya' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Batteriq an authorised EcoFlow dealer in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Batteriq is Kenya\'s authorised EcoFlow distributor, offering the full range of EcoFlow power stations, solar panels, and accessories with genuine warranty and official after-sales support.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I pay for EcoFlow products with M-Pesa in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Batteriq offers instant M-Pesa STK Push checkout — you receive an M-Pesa prompt on your phone during checkout and confirm payment instantly with your PIN.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Batteriq deliver EcoFlow products in Nairobi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Batteriq offers same-day and next-day delivery within Nairobi, and nationwide shipping across Kenya via trusted courier partners.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I buy EcoFlow in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Simply browse Batteriq\'s EcoFlow product range, add items to your cart, and checkout using M-Pesa, cash on delivery, or M-Pesa on delivery. Our team will contact you to confirm delivery.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the EcoFlow warranty in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All EcoFlow products sold by Batteriq come with the official EcoFlow manufacturer warranty — typically 24 months for power stations and 12 months for accessories. Batteriq is the authorised warranty service partner for Kenya.',
      },
    },
  ],
}

async function getEcoFlowProducts() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'EcoFlow')
      .eq('in_stock', true)
      .order('sort_order')
    if (error) {
      console.error('Supabase error:', error.message)
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

export default async function EcoFlowKenyaPage() {
  const allEcoFlow = await getEcoFlowProducts()

  const powerStations = allEcoFlow.filter((p) => p.category === 'Power Stations')
  const solarPanels = allEcoFlow.filter((p) => p.category === 'Solar Panels')
  const batteries = allEcoFlow.filter((p) => p.category === 'Batteries')
  const solarHomeSystems = allEcoFlow.filter((p) => p.category === 'Solar Home Systems')
  const accessories = allEcoFlow.filter((p) => p.category === 'Accessories' || p.category === 'Appliances')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      <ToastContainer />

      <PageHero
        title="EcoFlow Kenya"
        subtitle="Kenya's official EcoFlow distributor. Genuine products, full warranty, M-Pesa checkout."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'EcoFlow Kenya', href: '/ecoflow-kenya' },
        ]}
        bgGradient="linear-gradient(135deg, #000033 0%, #0000ff 100%)"
      />

      {/* Hidden SEO content */}
      <div className="sr-only">
        <h1>EcoFlow Kenya — Authorised Dealer &amp; Distributor</h1>
        <p>Nairobi Delivery &amp; Nationwide Shipping</p>
        <p>Official EcoFlow Warranty in Kenya</p>
      </div>

      <div className="min-h-screen">
        {/* Official distributor badge */}
        <div className="max-w-8xl mx-auto px-4 lg:px-8 pt-12">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-10 text-white text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Shield className="w-4 h-4" />
              Official Partnership
            </div>
            <h2 className="text-3xl lg:text-4xl font-black mb-3">
              Kenya&apos;s #1 Authorised EcoFlow Distributor
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Batteriq is EcoFlow&apos;s officially appointed distributor for Kenya. Every product comes with
              full EcoFlow international warranty, genuine certification, and authorised after-sales support.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              {[
                'Genuine EcoFlow Products',
                'International Warranty Honoured',
                'EcoFlow-Certified Technicians',
                'Official Spare Parts Available',
              ].map((text) => (
                <div key={text} className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-green-400 font-bold">✓</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12 space-y-16">
          {/* About EcoFlow in Kenya */}
          <section className="prose max-w-none">
            <h2 className="h2-fluid text-gray-900">Buy EcoFlow Power Stations in Kenya</h2>
            <div className="grid md:grid-cols-2 gap-8 text-gray-600 text-base leading-relaxed">
              <p>
                EcoFlow is the world&apos;s leading portable power station brand, trusted by over 4 million customers globally.
                In Kenya, EcoFlow products have become the go-to solution for home backup power, off-grid living,
                camping, and solar energy storage. Kenya&apos;s frequent power outages make EcoFlow an essential investment
                for homes and businesses alike.
              </p>
              <p>
                Batteriq is Kenya&apos;s only authorised EcoFlow dealer and distributor. As the official channel,
                we guarantee genuine products, official warranty coverage, and local after-sales support.
                All purchases can be made with <strong className="text-gray-900">instant M-Pesa STK Push</strong> —
                simply enter your phone number and confirm with your M-Pesa PIN.
              </p>
            </div>
          </section>

          {/* Power Stations */}
          {powerStations.length > 0 && (
            <section id="power-stations">
              <h2 className="h2-fluid text-gray-900 mb-2">EcoFlow Power Stations Kenya</h2>
              <p className="text-gray-500 mb-8">From compact RIVER series to powerful DELTA Pro — find your perfect power station.</p>
              <ProductGrid products={powerStations} showKenyaContext />
            </section>
          )}

          {/* Solar Panels */}
          {solarPanels.length > 0 && (
            <section id="solar-panels">
              <h2 className="h2-fluid text-gray-900 mb-2">EcoFlow Solar Panels Kenya</h2>
              <p className="text-gray-500 mb-8">Portable and rigid solar panels compatible with all EcoFlow power stations.</p>
              <ProductGrid products={solarPanels} showKenyaContext />
            </section>
          )}

          {/* Batteries */}
          {batteries.length > 0 && (
            <section id="batteries">
              <h2 className="h2-fluid text-gray-900 mb-2">EcoFlow Extra Batteries Kenya</h2>
              <ProductGrid products={batteries} />
            </section>
          )}

          {/* Solar Home Systems */}
          {solarHomeSystems.length > 0 && (
            <section id="solar-home-systems">
              <h2 className="h2-fluid text-gray-900 mb-2">Solar Home Systems Kenya</h2>
              <p className="text-gray-500 mb-8">Complete whole-home energy systems from 5kWh to 15kWh. Solar-ready modular design.</p>
              <ProductGrid products={solarHomeSystems} />
            </section>
          )}

          {/* Accessories */}
          {accessories.length > 0 && (
            <section id="accessories">
              <h2 className="h2-fluid text-gray-900 mb-2">EcoFlow Accessories &amp; Appliances Kenya</h2>
              <ProductGrid products={accessories} />
            </section>
          )}

          {/* FAQ Section */}
          <section id="faq">
            <h2 className="h2-fluid text-gray-900 mb-8">Frequently Asked Questions — EcoFlow Kenya</h2>
            <div className="space-y-3 max-w-3xl">
              {[
                {
                  q: 'Is Batteriq an authorised EcoFlow dealer in Kenya?',
                  a: 'Yes. Batteriq is Kenya\'s official authorised EcoFlow distributor. All products are 100% genuine with official EcoFlow warranty coverage and local after-sales support.',
                },
                {
                  q: 'How do I buy EcoFlow in Kenya?',
                  a: 'Browse our EcoFlow range, add to cart, and checkout. We accept M-Pesa STK Push (instant, pay now), cash on delivery, and M-Pesa on delivery. Our team confirms your order within minutes.',
                },
                {
                  q: 'Can I pay for EcoFlow with M-Pesa?',
                  a: 'Yes! Batteriq offers instant M-Pesa STK Push checkout. Enter your Safaricom number at checkout, and you\'ll receive a payment prompt on your phone. Confirm with your M-Pesa PIN and your order is paid instantly.',
                },
                {
                  q: 'Does EcoFlow deliver in Nairobi?',
                  a: 'Yes. Batteriq offers same-day and next-day delivery within Nairobi, and nationwide shipping across all 47 counties in Kenya.',
                },
                {
                  q: 'What is the EcoFlow warranty in Kenya?',
                  a: 'All EcoFlow products come with the official manufacturer warranty — typically 24 months for power stations, 12 months for accessories. Batteriq is the authorised warranty service partner in Kenya.',
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  className="group bg-white border border-gray-200 rounded-[8px] overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 list-none hover:bg-gray-50 transition-colors">
                    {q}
                    <span className="text-bq-blue text-lg group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-5 pb-4 text-gray-500 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
