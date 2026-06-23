import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ProductGrid } from '@/components/product/ProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { Shield } from 'lucide-react'
import Script from 'next/script'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'EcoFlow Kenya — Official Authorised EcoFlow Dealer | Batteriq',
  description: 'Batteriq is the official EcoFlow dealer in Kenya. Buy genuine EcoFlow power stations as an authorised dealer. EcoFlow DELTA Pro, DELTA 2, RIVER 2, solar panels. Pay with M-Pesa. Same-day Nairobi delivery. 24-month warranty. From KES 27,259.',
  keywords: [
    'EcoFlow Kenya', 'official EcoFlow dealer', 'official EcoFlow dealer Kenya', 'buy EcoFlow Kenya', 'EcoFlow dealer Kenya', 'EcoFlow authorised dealer Kenya', 'authorised EcoFlow dealer',
    'EcoFlow distributor Kenya', 'EcoFlow power station Kenya', 'EcoFlow DELTA Pro Kenya',
    'EcoFlow DELTA 2 Kenya', 'EcoFlow RIVER 2 Kenya', 'EcoFlow solar panel Kenya',
    'power station Kenya', 'portable power station Kenya', 'home backup power Kenya',
    'solar power Kenya', 'M-Pesa power station', 'buy power station Nairobi',
    'EcoFlow Nairobi', 'Batteriq Kenya', 'EcoFlow official Kenya',
  ],
  alternates: { canonical: 'https://batteriq.com/ecoflow-kenya' },
  openGraph: {
    title: 'EcoFlow Kenya — Official Authorised EcoFlow Dealer | Batteriq',
    description: 'Buy genuine EcoFlow in Kenya. M-Pesa accepted. Same-day Nairobi delivery. From KES 27,259.',
    url: 'https://batteriq.com/ecoflow-kenya',
    siteName: 'Batteriq Kenya',
    locale: 'en_KE',
    type: 'website',
    images: [{ url: 'https://batteriq.com/heroes/hero-power-stations.jpg', width: 1200, height: 630, alt: 'EcoFlow Kenya — Batteriq Official Dealer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EcoFlow Kenya — Official Dealer | Batteriq',
    description: 'Buy genuine EcoFlow in Kenya. M-Pesa accepted. Same-day delivery.',
    images: ['https://batteriq.com/heroes/hero-power-stations.jpg'],
  },
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

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Batteriq Solutions Ltd',
  alternateName: 'Batteriq Kenya',
  url: 'https://batteriq.com',
  logo: 'https://batteriq.com/logo.png',
  description: "Kenya's official authorised EcoFlow and BLUETTI dealer",
  address: { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+254-716-822-014',
    contactType: 'customer service',
    areaServed: 'KE',
    availableLanguage: ['English', 'Swahili'],
  },
  sameAs: [
    'https://instagram.com/batteriqkenya',
    'https://facebook.com/batteriqkenya',
    'https://tiktok.com/@batteriqkenya',
    'https://linkedin.com/company/batteriq',
  ],
}

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Batteriq Solutions Ltd',
  description: "Kenya's official authorised EcoFlow and BLUETTI dealer. Portable power stations, solar panels, and home battery systems.",
  url: 'https://batteriq.com',
  telephone: '+254-716-822-014',
  email: 'info@batteriq.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Nairobi',
    addressRegion: 'Nairobi County',
    addressCountry: 'KE',
  },
  geo: { '@type': 'GeoCoordinates', latitude: -1.286389, longitude: 36.817223 },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:30', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '16:00' },
  ],
  priceRange: 'KES 27,259 - KES 1,049,999',
  paymentAccepted: 'M-Pesa, Cash on Delivery',
  currenciesAccepted: 'KES',
  areaServed: { '@type': 'Country', name: 'Kenya' },
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://batteriq.com' },
    { '@type': 'ListItem', position: 2, name: 'EcoFlow Kenya', item: 'https://batteriq.com/ecoflow-kenya' },
  ],
}

async function getEcoFlowProducts() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'EcoFlow')
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
      <Header />
      <Script id="schema-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="schema-org" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <Script id="schema-local" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <Script id="schema-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ToastContainer />

      <PageHero
        title="EcoFlow Kenya"
        subtitle="Kenya's official EcoFlow distributor. Genuine products, full warranty, M-Pesa checkout."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'EcoFlow Kenya', href: '/ecoflow-kenya' },
        ]}
        bgImage="/heroes/hero-power-stations.jpg"
        badge="Official Authorised Dealer — Kenya"
        height="medium"
        align="left"
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

      {/* SEO Content Section */}
      <section className="bg-white border-t border-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">
                  Batteriq — The Official EcoFlow Dealer in Kenya
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  EcoFlow has become Kenya&apos;s most trusted portable power station brand, and Batteriq is the official
                  authorised EcoFlow dealer in Kenya. Whether you need home backup power during outages, a solar energy
                  system for your business, or a portable power station for camping and safari, EcoFlow has a product for
                  every need and budget — starting from KES 27,259.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Every EcoFlow product sold through Batteriq is 100% genuine, carries the full 24-month manufacturer
                  warranty, and is supported locally by our Nairobi-based team. Batteriq is Kenya&apos;s only authorised
                  EcoFlow distributor, giving you the confidence that you are buying an authentic product at the right price.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">
                  EcoFlow Products Available in Kenya
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Batteriq stocks the full EcoFlow range in Kenya including the DELTA Pro, DELTA 2, DELTA 3, RIVER 2,
                  RIVER 3, PowerStream, and the complete EcoFlow solar panel range from 45W to 400W. We also stock
                  EcoFlow smart home appliances, portable air conditioners, extra battery packs, and all official
                  EcoFlow accessories.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  For businesses and homes looking for a complete energy independence solution, we offer the EcoFlow
                  PowerKit — a modular whole-home energy system from 5kWh to 15kWh that combines solar panels,
                  battery storage, and smart home integration into one seamless system.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">
                  Buy EcoFlow in Kenya with M-Pesa
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Batteriq makes buying EcoFlow in Kenya simple. Add your chosen EcoFlow product to cart, proceed to
                  checkout, and pay using M-Pesa STK Push — you receive a payment prompt directly on your phone and
                  confirm with your PIN. No bank transfers, no running to an ATM. M-Pesa checkout is available for
                  all EcoFlow products from KES 7,599 to KES 1,049,999.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  For large purchases, we also offer M-Pesa at doorstep delivery, proforma invoicing for corporate
                  buyers, and a speak-to-sales option for customers who want to confirm stock and delivery before paying.
                  eTIMS KRA invoices are issued for all purchases within 24 hours of payment confirmation.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">
                  EcoFlow Delivery Across Kenya
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Batteriq delivers EcoFlow products across Kenya. Same-day and next-day delivery is available
                  within Nairobi for orders placed before 12PM. Nationwide shipping covers all 47 counties —
                  from Mombasa to Kisumu, Eldoret to Nakuru. All deliveries are handled by trusted courier
                  partners with tracking available. WhatsApp us on 0716 822 014 for delivery enquiries.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-[#f8f9ff] rounded-2xl p-6 border border-blue-50">
                <h4 className="font-black text-gray-900 text-base mb-5">Quick Facts</h4>
                {[
                  { label: 'Starting Price', value: 'KES 27,259' },
                  { label: 'Warranty', value: '24 months' },
                  { label: 'Delivery', value: 'Same-day Nairobi' },
                  { label: 'Payment', value: 'M-Pesa Accepted' },
                  { label: 'Invoice', value: 'eTIMS KRA Issued' },
                  { label: 'Authorised', value: 'Official EcoFlow Dealer' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500 font-medium">{label}</span>
                    <span className="text-sm font-black text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#f0fdf4] rounded-2xl p-6 border border-green-100">
                <h4 className="font-black text-gray-900 text-base mb-3">Contact Us</h4>
                <p className="text-sm text-gray-500 mb-4">Need help choosing the right EcoFlow product for your needs?</p>
                <div className="space-y-3">
                  <a href="https://wa.me/254716822014?text=Hi%20Batteriq!%20I%20need%20help%20choosing%20an%20EcoFlow%20product."
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full py-3 px-4 rounded-xl bg-[#25D366] text-white font-black text-sm hover:brightness-105 transition-all">
                    <span>💬</span>
                    WhatsApp Us
                  </a>
                  <a href="tel:+254716822014"
                    className="flex items-center gap-2 w-full py-3 px-4 rounded-xl bg-[#00004d] text-white font-black text-sm hover:bg-blue-900 transition-all">
                    📞 0716 822 014
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h4 className="font-black text-gray-900 text-base mb-3">Our Guarantee</h4>
                {[
                  '100% Genuine EcoFlow Products',
                  '24-Month Manufacturer Warranty',
                  'Official Authorised Dealer',
                  'Local After-Sales Support',
                  'eTIMS KRA Invoice Issued',
                  'M-Pesa Accepted',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-green-500 font-black text-base flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
