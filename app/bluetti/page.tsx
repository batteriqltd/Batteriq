import type { Metadata } from 'next'
import Script from 'next/script'
import { Shield } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Bluetti Kenya | Official Bluetti Dealer & Power Stations',
  description: 'Buy genuine Bluetti power stations, solar panels and batteries in Kenya from Batteriq. Official authorised dealer, M-Pesa payments, Nairobi delivery and manufacturer warranty.',
  keywords: ['Bluetti Kenya', 'buy Bluetti Kenya', 'Bluetti dealer Kenya', 'official Bluetti dealer Kenya', 'Bluetti power station Kenya', 'Bluetti solar generator Kenya', 'Bluetti Nairobi', 'Bluetti AC200PL Kenya', 'Bluetti AC300 Kenya', 'Bluetti AC500 Kenya'],
  alternates: { canonical: 'https://batteriq.com/bluetti' },
  openGraph: {
    title: 'Bluetti Kenya | Official Bluetti Dealer | Batteriq',
    description: 'Buy genuine Bluetti power stations in Kenya. M-Pesa accepted, Nairobi delivery and local support.',
    url: 'https://batteriq.com/bluetti',
    images: [{ url: 'https://batteriq.com/heroes/hero-bluetti.jpg', width: 1200, height: 630, alt: 'Bluetti Kenya - Batteriq official dealer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bluetti Kenya | Official Bluetti Dealer | Batteriq',
    description: 'Genuine Bluetti power stations, solar panels and batteries in Kenya. M-Pesa accepted.',
    images: ['https://batteriq.com/heroes/hero-bluetti.jpg'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Where can I buy genuine Bluetti power stations in Kenya?', acceptedAnswer: { '@type': 'Answer', text: 'Batteriq supplies genuine Bluetti power stations, solar panels and expansion batteries in Kenya, with local customer support and manufacturer warranty coverage.' } },
    { '@type': 'Question', name: 'Can I pay for Bluetti products with M-Pesa?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Batteriq accepts M-Pesa for Bluetti purchases and offers delivery in Nairobi as well as nationwide shipping across Kenya.' } },
    { '@type': 'Question', name: 'Which Bluetti power station is right for home backup in Kenya?', acceptedAnswer: { '@type': 'Answer', text: 'The right model depends on the appliances and runtime you need. Compact models suit routers and small electronics, while AC and EP series systems support larger home backup requirements. Batteriq can help you select a suitable system.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://batteriq.com' },
    { '@type': 'ListItem', position: 2, name: 'Bluetti Kenya', item: 'https://batteriq.com/bluetti' },
  ],
}

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
  const products = await getBluettiData()

  return (
    <>
      <Header />
      <Script id="bluetti-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="bluetti-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
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
            <h1 id="bluetti-kenya-heading" className="text-3xl lg:text-4xl font-black mb-3">Bluetti Power Stations in Kenya</h1>
            <p className="text-violet-100 text-lg max-w-3xl">Shop genuine Bluetti portable power stations, solar panels and expansion batteries from Batteriq. Pay with M-Pesa, get Nairobi delivery, and receive local support for your backup-power setup.</p>
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
      <GeminiChatWidget />
    </>
  )
}
