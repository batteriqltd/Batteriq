import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'EcoFlow Solar Panels Kenya — 45W to 400W | Batteriq',
  description:
    'Buy EcoFlow solar panels in Kenya. 45W to 400W foldable and rigid panels. Official dealer. M-Pesa accepted. Nairobi delivery.',
  alternates: { canonical: 'https://batteriq.com/solar' },
}

async function getSolarProducts() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'Solar Panels')
      .eq('in_stock', true)
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

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-14 sm:pb-20">
          <div className="max-w-xl">

            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8" style={{ background: '#0000ff' }} />
              <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#66aaff' }}>
                EcoFlow Solar · IP68 Waterproof
              </span>
            </div>

            <h1
              className="font-black text-white mb-4"
              style={{
                fontSize: 'clamp(2.2rem, 6vw, 4rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
              }}
            >
              Solar<br />Panels
            </h1>

            <p className="text-base sm:text-lg mb-8" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '340px', lineHeight: 1.5 }}>
              45W to 400W. Built for Kenyan sun.
            </p>

            <a
              href="#products"
              className="hero-cta-btn inline-flex items-center gap-3 font-black text-sm text-white rounded-2xl transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,255,0.4)] hover:shadow-[0_14px_44px_rgba(0,0,255,0.55)] hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)',
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

      <div id="products" />
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
        <FilteredProductGrid products={products} filterType="solar" />
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
