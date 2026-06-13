import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { PowerStationsClient } from '@/components/power-stations/PowerStationsClient'
import { PageWrapper } from '@/components/animations/PageWrapper'
import { PowerStationsAnimation } from '@/components/animations/PowerStationsAnimation'
import type { Product } from '@/lib/supabase/types'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Power Stations Kenya — EcoFlow DELTA Pro, DELTA 2, RIVER 2 | Batteriq',
  description: 'Buy power stations in Kenya. Official EcoFlow dealer. DELTA Pro, DELTA 2, RIVER 2, RIVER 3 in stock. Pay with M-Pesa. Same-day Nairobi delivery. 24-month warranty. From KES 27,259.',
  keywords: ['power station Kenya', 'buy power station Kenya', 'EcoFlow power station Kenya', 'EcoFlow DELTA Pro Kenya', 'EcoFlow DELTA 2 Kenya', 'EcoFlow RIVER 2 Kenya', 'portable power station Kenya', 'home backup power Kenya', 'power station Nairobi'],
  alternates: { canonical: 'https://batteriq.com/power-stations' },
  openGraph: {
    title: 'Power Stations Kenya | Batteriq',
    description: 'Official EcoFlow power stations in Kenya. M-Pesa accepted.',
    url: 'https://batteriq.com/power-stations',
    images: [{ url: 'https://batteriq.com/heroes/hero-power-stations.jpg', width: 1200, height: 630, alt: 'Power Stations Kenya' }],
  },
}

async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('category', ['Power Stations', 'Solar Home Systems'])
      .eq('in_stock', true)
      .order('sort_order')
    if (error) { console.error('Supabase error:', error.message); return [] }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

function GridSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default async function PowerStationsPage() {
  const products = await getProducts()
  const totalCount = products.length

  return (
    <PageWrapper>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'EcoFlow Power Stations Kenya',
            description: 'Buy EcoFlow power stations in Kenya with M-Pesa. Official authorised dealer.',
            url: 'https://batteriq.com/power-stations',
            provider: {
              '@type': 'Organization',
              name: 'Batteriq',
              description: "Kenya's Official Authorised EcoFlow Distributor",
            },
          }),
        }}
      />

      <Header />
      <ToastContainer />

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[70vh] sm:min-h-[75vh] flex items-end overflow-hidden">

        {/* Background image — use first power station product image */}
        {products[0]?.images?.[0] && (
          <img
            src={products[0].images[0]}
            alt="EcoFlow Power Stations Kenya"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
          />
        )}

        {/* Single clean overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Content — pinned to bottom left */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-14 sm:pb-20">
          <div className="max-w-xl">

            {/* Brand label */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                EcoFlow Kenya · Official Dealer
              </span>
            </div>

            {/* Headline — minimal, powerful */}
            <h1
              className="font-black text-white mb-4"
              style={{
                fontSize: 'clamp(1.85rem, 5vw, 3.4rem)',
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              Power<br />Stations
            </h1>

            {/* One line only */}
            <p className="text-sm sm:text-base mb-8" style={{ color: 'rgba(255,255,255,0.50)', maxWidth: '340px', lineHeight: 1.6, fontWeight: 500 }}>
              256Wh to 4096Wh. Pay with M-Pesa.
            </p>

            {/* SINGLE premium button */}
            <a
              href="#products"
              className="hero-cta-btn inline-flex items-center gap-3 font-black text-sm text-white rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                padding: '14px 32px',
                letterSpacing: '-0.01em',
              }}
            >
              View All Power Stations
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </span>
            </a>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-3 mt-6">

              {/* EcoFlow Authorised */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <img src="/logos/ecoflow-logo.jpg" alt="EcoFlow" className="w-5 h-5 object-contain rounded" style={{ background: 'white', padding: '2px' }} />
                <span className="text-xs font-bold text-white">Authorised Dealer</span>
              </div>

              {/* M-Pesa */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <img src="/logos/mpesa.png" alt="M-Pesa" className="h-4 object-contain" style={{ width: 'auto' }} />
                <span className="text-xs font-bold text-white">M-Pesa Checkout</span>
              </div>

              {/* Delivery */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <span className="text-xs font-bold text-white">Same-Day Nairobi</span>
              </div>

              {/* Warranty */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-bold text-white">24-Month Warranty</span>
              </div>

            </div>

          </div>
        </div>

        {/* Bottom fade into page */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f8f9fa)' }}
        />
      </section>

      {/* Products anchor */}
      <div id="products" />

      {/* Page heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-6 sm:pb-8" data-aos="fade-up" data-aos-duration="600" data-aos-once="true">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2">
              EcoFlow Kenya — Official Dealer
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight">
              EcoFlow Power Stations
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              Kenya's full range. Pay with M-Pesa. Genuine warranty.
            </p>
          </div>
          <p className="text-sm text-gray-400 font-medium flex-shrink-0">
            {totalCount} products in stock
          </p>
        </div>
      </div>

      {/* Filter tabs + animated grid */}
      <Suspense fallback={<GridSkeleton />}>
        <PowerStationsClient products={products} />
      </Suspense>

      {/* Bottom SEO section */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-4">
            Kenya's Official EcoFlow Dealer
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-2xl mx-auto">
            Batteriq is Kenya's officially appointed EcoFlow distributor. Every power station is sourced
            directly from EcoFlow, carries genuine international warranty honoured locally, and comes with
            EcoFlow-certified after-sales support. Pay with M-Pesa, get same-day delivery in Nairobi, and
            nationwide shipping across all 47 counties.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              { title: 'Genuine Products', sub: 'Direct from EcoFlow' },
              { title: '24-Month Warranty', sub: 'Honoured in Kenya' },
              { title: 'M-Pesa Accepted', sub: 'Instant STK Push' },
              { title: 'Nairobi Delivery', sub: 'Same-day available' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm text-center min-w-[140px]"
              >
                <p className="text-sm font-black text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
      <PowerStationsAnimation />
    </PageWrapper>
  )
}
