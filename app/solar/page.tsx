import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Hero3DProduct } from '@/components/layout/Hero3DProduct'
import { Footer } from '@/components/layout/Footer'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { SolarSelectionGuide } from '@/components/solar/SolarSelectionGuide'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'EcoFlow Solar Panels Kenya — 45W to 400W | Buy with M-Pesa | Batteriq',
  description: 'Buy EcoFlow solar panels in Kenya. 45W to 400W. IP68 waterproof. Compatible with all EcoFlow power stations. Pay with M-Pesa. Official EcoFlow dealer. Same-day Nairobi delivery.',
  keywords: ['solar panels Kenya', 'EcoFlow solar panel Kenya', 'buy solar panel Kenya', 'portable solar panel Kenya', 'solar panel Nairobi', 'EcoFlow 400W solar Kenya', 'solar power Kenya'],
  alternates: { canonical: 'https://batteriq.com/solar' },
  openGraph: {
    title: 'EcoFlow Solar Panels Kenya | Batteriq',
    description: 'Official EcoFlow solar panels in Kenya. M-Pesa accepted.',
    url: 'https://batteriq.com/solar',
    images: [{ url: 'https://batteriq.com/heroes/hero-solar.jpg', width: 1200, height: 630, alt: 'EcoFlow Solar Panels Kenya' }],
  },
}

async function getSolarProducts() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'Solar Panels')
      .order('sort_order')
    if (error) { console.error('Supabase error:', error.message); return [] }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

export default async function SolarPanelsPage() {
  const products = await getSolarProducts()

  return (
    <>
      <Header />
      <ToastContainer />
      {/* ── SOLAR HERO ── */}
      <section className="relative min-h-[70vh] sm:min-h-[75vh] flex items-end overflow-hidden">

        {/* Background image */}
        {products[0]?.images?.[0] && (
          <img
            src={products[0].images[0]}
            alt="EcoFlow Solar Panels Kenya"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
          />
        )}

        {/* Single clean overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* 3D interactive solar panel */}
        <div className="absolute z-10 hidden md:flex items-center justify-center right-[5%] lg:right-[8%] top-1/2 -translate-y-1/2">
          <Hero3DProduct src="/products/ecoflow/solar-panel-400w.jpg" alt="EcoFlow 400W Solar Panel" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-14 sm:pb-20">
          <div className="max-w-xl">

            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                EcoFlow Solar · IP68 Waterproof
              </span>
            </div>

            <h1
              className="font-black text-white mb-4"
              style={{
                fontSize: 'clamp(1.85rem, 5vw, 3.4rem)',
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              Solar<br />Panels
            </h1>

            <p className="text-sm sm:text-base mb-8" style={{ color: 'rgba(255,255,255,0.50)', maxWidth: '340px', lineHeight: 1.6, fontWeight: 500, letterSpacing: '0.005em' }}>
              45W to 400W. Built for Kenyan sun.
            </p>

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
              View All Solar Panels
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </span>
            </a>

          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f8faff)' }}
        />
      </section>

      <SolarSelectionGuide />

      <div id="products" className="scroll-mt-20" />
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bq-blue">Shop the collection</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">Solar panels for every setup.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500">Choose by format, output, or the setup you have in mind.</p>
        </div>
        <FilteredProductGrid products={products} filterType="solar" />
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
