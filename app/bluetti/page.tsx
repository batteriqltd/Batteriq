import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'
import { Shield } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { withBluettiFallbacks } from '@/lib/bluetti-residential'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { ToastContainer } from '@/components/ui/Toast'

export const revalidate = 60

export const metadata: Metadata = withCanonical('/bluetti', {
  // absolute: skips the root "%s | Batteriq" template, which doubled the brand
  title: { absolute: 'BLUETTI Kenya — Official Dealer, Prices & Stock | Batteriq' },
  description: 'Buy genuine Bluetti power stations, residential backup systems, solar panels and batteries in Kenya from Batteriq. New Homestar 3, HV6K, HV10K and HB500 in stock. Official authorised dealer, M-Pesa payments, Nairobi delivery and manufacturer warranty.',
  keywords: ['Bluetti Kenya', 'buy Bluetti Kenya', 'Bluetti dealer Kenya', 'official Bluetti dealer Kenya', 'Bluetti power station Kenya', 'Bluetti solar generator Kenya', 'Bluetti Nairobi', 'Bluetti AC200PL Kenya', 'Bluetti AC300 Kenya', 'Bluetti AC500 Kenya', 'Bluetti Homestar 3 Kenya', 'Bluetti HV6K Kenya', 'Bluetti HV10K Kenya', 'Bluetti HB500 Kenya'],
  openGraph: {
    title: 'Bluetti Kenya | Official Bluetti Dealer | Batteriq',
    description: 'Buy genuine Bluetti power stations in Kenya. M-Pesa accepted, Nairobi delivery and local support.',
    images: [{ url: 'https://batteriq.com/heroes/hero-bluetti.jpg', width: 1200, height: 630, alt: 'Bluetti Kenya - Batteriq official dealer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bluetti Kenya | Official Bluetti Dealer | Batteriq',
    description: 'Genuine Bluetti power stations, solar panels and batteries in Kenya. M-Pesa accepted.',
    images: ['https://batteriq.com/heroes/hero-bluetti.jpg'],
  },
})

async function getBluettiData() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('products').select('*').eq('brand', 'Bluetti').order('sort_order')
    if (error) {
      console.error('Supabase error:', error.message)
      return []
    }
    return data ?? []
  } catch (error) {
    console.error('Fetch failed:', error)
    return []
  }
}

export default async function BluettiCollectionPage() {
  // Code fallbacks fill any residential row missing from the DB, newest first.
  const products = withBluettiFallbacks(await getBluettiData())

  return (
    <>
      <Header />
      {/* No FAQPage: these questions are not shown on this page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Bluetti Kenya', path: '/bluetti' }]))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          collectionPageJsonLd({
            path: '/bluetti',
            name: 'BLUETTI Kenya',
            description: 'Genuine BLUETTI power stations, residential backup systems, solar panels and expansion batteries in Kenya, from Batteriq.',
            products,
          })
        )}
      />
      <ToastContainer />
      <PageHero
        title="Bluetti Kenya"
        subtitle="Genuine Bluetti power stations, solar panels and batteries for reliable backup power across Kenya."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Bluetti Kenya', href: '/bluetti' }]}
        bgImage="/heroes/hero-bluetti.jpg"
        productImage="/products/bluetti/bluetti-ac200pl.jpg"
        productAlt="Bluetti AC200PL power station"
        badge="Official Bluetti Authorised Dealer"
        height="medium"
        align="left"
      />

      <div>
        <div className="max-w-8xl mx-auto px-4 lg:px-8 pt-12">
          <section aria-labelledby="bluetti-kenya-heading" className="bg-gradient-to-br from-violet-700 to-indigo-950 rounded-3xl p-8 lg:p-10 text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Shield className="w-4 h-4" /> Official authorised dealer
            </div>
            <h2 id="bluetti-kenya-heading" className="text-3xl lg:text-4xl font-black mb-3">Bluetti Power Stations in Kenya</h2>
            <p className="text-violet-100 text-lg max-w-3xl">Shop genuine Bluetti portable power stations, new residential backup systems (Homestar 3, HV6K, HV10K, HB500), solar panels and expansion batteries from Batteriq. Pay with M-Pesa, get Nairobi delivery, and receive local support for your backup-power setup.</p>
          </section>
        </div>

        <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
          <FilteredProductGrid products={products} filterType="bluetti" />
        </div>

        <section className="bg-white border-y border-slate-100 py-16">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Buy Bluetti in Kenya with confidence</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Bluetti power stations provide quiet, rechargeable backup power for homes, businesses, travel and off-grid use. Choose a compact unit for essential electronics or a higher-capacity AC or EP series system for demanding home backup requirements.</p>
              <p className="text-slate-600 leading-relaxed">Batteriq helps customers across Kenya choose compatible Bluetti power stations, solar panels and expansion batteries. We accept M-Pesa and arrange delivery in Nairobi and nationwide shipping.</p>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Bluetti Kenya frequently asked questions</h2>
              <div className="space-y-3">
                {[
                  ['Is Batteriq a Bluetti dealer in Kenya?', 'Yes. Batteriq supplies genuine Bluetti products in Kenya and provides local pre-sale and after-sales support.'],
                  ['Can I pay for a Bluetti power station with M-Pesa?', 'Yes. M-Pesa payment is available for Bluetti purchases through Batteriq.'],
                  ['Do you deliver Bluetti products outside Nairobi?', 'Yes. We arrange nationwide delivery across Kenya, with Nairobi delivery options available.'],
                ].map(([question, answer]) => (
                  <details key={question} className="group border border-slate-200 rounded-xl">
                    <summary className="cursor-pointer list-none px-5 py-4 font-bold text-slate-900">{question}</summary>
                    <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
