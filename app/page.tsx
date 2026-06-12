import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { BrandAnchor } from '@/components/home/BrandAnchor'
import { CategoryNav } from '@/components/home/CategoryNav'
import { ProductCard } from '@/components/product/ProductCard'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { HomepageNewsletter } from '@/components/home/HomepageNewsletter'
import { ReviewsSection } from '@/components/home/ReviewsSection'
import { StatsSection } from '@/components/home/StatsSection'
import { OffersSection } from '@/components/home/OffersSection'
import { PageWrapper } from '@/components/animations/PageWrapper'
import { HomeAnimations } from '@/components/animations/HomeAnimations'
import { SectionTransition } from '@/components/animations/SectionTransition'
import { CardReveal } from '@/components/animations/CardReveal'
import { HeroParallax } from '@/components/animations/HeroParallax'
import { SectionObserver } from '@/components/animations/SectionObserver'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Batteriq Kenya | Portable Power Stations & Solar Solutions',
  description: "Kenya's #1 authorised EcoFlow and BLUETTI dealer. Buy power stations, solar panels, and home battery systems. Pay with M-Pesa. Same-day Nairobi delivery. From KES 27,259. Official 24-month warranty.",
  keywords: [
    'EcoFlow Kenya', 'BLUETTI Kenya', 'power station Kenya', 'buy EcoFlow Kenya',
    'portable power station Kenya', 'solar panels Kenya', 'home backup power Kenya',
    'M-Pesa power station', 'EcoFlow dealer Kenya', 'BLUETTI dealer Kenya',
    'EcoFlow Nairobi', 'power backup Kenya', 'solar energy Kenya',
    'Batteriq Kenya', 'EcoFlow DELTA Pro Kenya', 'EcoFlow RIVER 2 Kenya',
    'buy power station M-Pesa', 'solar panel Kenya price', 'home battery Kenya',
  ],
  alternates: { canonical: 'https://batteriq.com' },
  openGraph: {
    title: "Batteriq Kenya — Kenya's Official EcoFlow & BLUETTI Dealer",
    description: "Buy genuine EcoFlow and BLUETTI in Kenya. M-Pesa accepted. Same-day Nairobi delivery. From KES 27,259.",
    url: 'https://batteriq.com',
    siteName: 'Batteriq Kenya',
    locale: 'en_KE',
    type: 'website',
    images: [{ url: 'https://batteriq.com/heroes/hero-power-stations.jpg', width: 1200, height: 630, alt: 'Batteriq Kenya — Official EcoFlow Dealer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Batteriq Kenya — Official EcoFlow Dealer',
    description: "Kenya's #1 EcoFlow dealer. M-Pesa accepted. Same-day delivery.",
    images: ['https://batteriq.com/heroes/hero-power-stations.jpg'],
  },
}

async function getProductsByCategory(brand?: string, category?: string, limit = 8) {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true })
      .limit(limit)

    if (brand) query = query.eq('brand', brand)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
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

const DIVIDER = (
  <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,255,0.12), rgba(0,0,255,0.12), transparent)' }} />
)

export default async function HomePage() {
  const [
    ecoflowPowerStations,
    ecoflowSolar,
    ecoflowSolarHomeSystems,
    ecoflowAppliances,
    bluettiStations,
    powerBanks,
    accessories,
  ] = await Promise.all([
    getProductsByCategory('EcoFlow', 'Power Stations', 8),
    getProductsByCategory('EcoFlow', 'Solar Panels', 8),
    getProductsByCategory('EcoFlow', 'Solar Home Systems', 3),
    getProductsByCategory('EcoFlow', 'Appliances', 2),
    getProductsByCategory('Bluetti', 'Power Stations', 8),
    getProductsByCategory('EcoFlow', 'Power Banks', 6),
    getProductsByCategory('EcoFlow', 'Accessories', 6),
  ])

  return (
    <PageWrapper>
      <Header />
      <ToastContainer />

      {/* Hero */}
      <HeroParallax>
        <HeroSection />
      </HeroParallax>

      <StatsSection />

      <OffersSection />

      <CategoryNav />

      <div className="max-w-8xl mx-auto px-4 lg:px-8">

        {/* ── EcoFlow Power Stations ── */}
        <SectionTransition id="power-stations" className="py-10 sm:py-14 lg:py-20">
          <div
            className="relative w-full rounded-3xl overflow-hidden mb-8 group"
            style={{ height: '280px', background: 'linear-gradient(135deg, #00001a 0%, #000033 100%)' }}
          >
            {ecoflowPowerStations[0]?.images?.[0] && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ecoflowPowerStations[0].images[0]}
                  alt="EcoFlow Power Station"
                  className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                  style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,26,1) 0%, rgba(0,0,26,0.98) 30%, rgba(0,0,26,0.85) 45%, rgba(0,0,26,0.4) 60%, rgba(0,0,26,0) 75%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,26,0.6) 0%, transparent 50%)' }} />
            <div className="absolute top-0 left-0 w-64 h-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #0000ff, transparent)' }} />
            <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
              <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#6699ff' }}>EcoFlow Kenya &middot; Official Dealer</p>
              <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Power Stations</h3>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                From 256Wh to 4096Wh. Backup your home or power your adventure. Pay with M-Pesa.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="/power-stations"
                  className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,255,0.55)]"
                  style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 4px 20px rgba(0,0,255,0.35)' }}
                >
                  Shop Power Stations
                </a>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{ecoflowPowerStations.length} products</span>
              </div>
            </div>
            {ecoflowPowerStations.length > 0 && (
              <div className="absolute bottom-5 right-6 text-right">
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                <p className="text-xl font-black font-mono text-white">KES {Math.min(...ecoflowPowerStations.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
              </div>
            )}
          </div>
          <BrandAnchor
            brand="EcoFlow"
            category="Power Stations"
            h2="EcoFlow Power Stations — Buy in Kenya with M-Pesa"
            seeAllHref="/ecoflow"
            subtitle="Kenya's most popular portable power stations. From KES 27,259."
          />
          <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {ecoflowPowerStations.map((product) => (
              <ProductCard key={product.id} product={product} showKenyaContext />
            ))}
          </CardReveal>
          {ecoflowPowerStations.length === 0 && (
            <div className="py-12 text-center"><p className="text-gray-400 text-sm">Products loading&hellip;</p></div>
          )}
        </SectionTransition>

        {DIVIDER}

        {/* ── EcoFlow Solar Panels ── */}
        <SectionTransition id="solar-panels" className="py-10 sm:py-14 lg:py-20">
          <div
            className="relative w-full rounded-3xl overflow-hidden mb-8 group"
            style={{ height: '280px', background: 'linear-gradient(135deg, #001a00 0%, #002800 100%)' }}
          >
            {ecoflowSolar[0]?.images?.[0] && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ecoflowSolar[0].images[0]}
                  alt="EcoFlow Solar Panel"
                  className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                  style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,26,0,1) 0%, rgba(0,26,0,0.98) 30%, rgba(0,26,0,0.85) 45%, rgba(0,26,0,0.4) 60%, rgba(0,26,0,0) 75%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,26,0,0.6) 0%, transparent 50%)' }} />
            <div className="absolute top-0 left-0 w-64 h-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #00ff44, transparent)' }} />
            <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
              <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#66ff99' }}>EcoFlow Solar &middot; Kenya</p>
              <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Solar Panels</h3>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                From 45W foldable to 400W rigid panels. IP68 waterproof. Built for Kenyan sun.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="/solar"
                  className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,170,51,0.55)]"
                  style={{ background: 'linear-gradient(135deg, #00aa33, #002800)', boxShadow: '0 4px 20px rgba(0,170,51,0.35)' }}
                >
                  Shop Solar Panels
                </a>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{ecoflowSolar.length} products</span>
              </div>
            </div>
            {ecoflowSolar.length > 0 && (
              <div className="absolute bottom-5 right-6 text-right">
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                <p className="text-xl font-black font-mono text-white">KES {Math.min(...ecoflowSolar.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
              </div>
            )}
          </div>
          <BrandAnchor
            brand="EcoFlow"
            category="Solar Panels"
            h2="EcoFlow Solar Panels Kenya"
            seeAllHref="/solar"
            subtitle="From 45W portable panels to 400W powerhouses. IP68 waterproof."
          />
          <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {ecoflowSolar.map((product) => (
              <ProductCard key={product.id} product={product} showKenyaContext />
            ))}
          </CardReveal>
          {ecoflowSolar.length === 0 && (
            <div className="py-12 text-center"><p className="text-gray-400 text-sm">Products loading&hellip;</p></div>
          )}
        </SectionTransition>

      </div>

      {/* REVIEWS SECTION — after solar panels */}
      <ReviewsSection />

      <div className="max-w-8xl mx-auto px-4 lg:px-8">

        {/* ── Solar Home Systems ── */}
        {ecoflowSolarHomeSystems.length > 0 && (
          <>
            {DIVIDER}
            <SectionTransition id="powerkits" className="py-10 sm:py-14 lg:py-20">
              <div
                className="relative w-full rounded-3xl overflow-hidden mb-8 group"
                style={{ height: '280px', background: 'linear-gradient(135deg, #00001a 0%, #000d33 100%)' }}
              >
                {ecoflowSolarHomeSystems[0]?.images?.[0] && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ecoflowSolarHomeSystems[0].images[0]}
                      alt="EcoFlow Solar Home System"
                      className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                      style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                    />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,26,1) 0%, rgba(0,0,26,0.98) 30%, rgba(0,0,26,0.85) 45%, rgba(0,0,26,0.4) 60%, rgba(0,0,26,0) 75%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,13,51,0.6) 0%, transparent 50%)' }} />
                <div className="absolute top-0 left-0 w-64 h-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #0066ff, transparent)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#6699ff' }}>EcoFlow Solar Home Systems &middot; Whole-Home</p>
                  <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Solar Home Systems</h3>
                  <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                    Modular home energy from 5kWh to 15kWh. Solar-ready. 24/7 monitoring.
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="/power-stations"
                      className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,102,255,0.55)]"
                      style={{ background: 'linear-gradient(135deg, #0066ff, #000d33)', boxShadow: '0 4px 20px rgba(0,102,255,0.35)' }}
                    >
                      Shop Solar Home Systems
                    </a>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{ecoflowSolarHomeSystems.length} products</span>
                  </div>
                </div>
                {ecoflowSolarHomeSystems.length > 0 && (
                  <div className="absolute bottom-5 right-6 text-right">
                    <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                    <p className="text-xl font-black font-mono text-white">KES {Math.min(...ecoflowSolarHomeSystems.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
                  </div>
                )}
              </div>
              <BrandAnchor
                brand="EcoFlow"
                category="Solar Home Systems"
                h2="EcoFlow Solar Home Systems — Whole-Home Energy Systems"
                seeAllHref="/ecoflow#solar-home-systems"
                subtitle="Modular home energy systems from 5kWh to 15kWh. Solar-ready."
              />
              <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {ecoflowSolarHomeSystems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CardReveal>
            </SectionTransition>
          </>
        )}

        {/* ── EcoFlow Appliances ── */}
        {ecoflowAppliances.length > 0 && (
          <>
            {DIVIDER}
            <SectionTransition id="appliances" className="py-10 sm:py-14 lg:py-20">
              <div
                className="relative w-full rounded-3xl overflow-hidden mb-8 group"
                style={{ height: '280px', background: 'linear-gradient(135deg, #001111 0%, #002222 100%)' }}
              >
                {ecoflowAppliances[0]?.images?.[0] && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ecoflowAppliances[0].images[0]}
                      alt="EcoFlow Appliance"
                      className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                      style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                    />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,17,17,1) 0%, rgba(0,17,17,0.98) 30%, rgba(0,17,17,0.85) 45%, rgba(0,17,17,0.4) 60%, rgba(0,17,17,0) 75%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,34,34,0.6) 0%, transparent 50%)' }} />
                <div className="absolute top-0 left-0 w-64 h-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #00cccc, transparent)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#66ffff' }}>EcoFlow Appliances &middot; Kenya</p>
                  <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Smart Appliances</h3>
                  <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                    Solar-compatible portable fridge and air conditioner. Energy A+++ rated.
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="/accessories"
                      className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,153,170,0.55)]"
                      style={{ background: 'linear-gradient(135deg, #0099aa, #001111)', boxShadow: '0 4px 20px rgba(0,153,170,0.35)' }}
                    >
                      Shop Appliances
                    </a>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{ecoflowAppliances.length} products</span>
                  </div>
                </div>
                {ecoflowAppliances.length > 0 && (
                  <div className="absolute bottom-5 right-6 text-right">
                    <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                    <p className="text-xl font-black font-mono text-white">KES {Math.min(...ecoflowAppliances.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
                  </div>
                )}
              </div>
              <BrandAnchor
                brand="EcoFlow"
                category="Appliances"
                h2="EcoFlow Appliances"
                seeAllHref="/accessories#appliances"
                subtitle="Solar-compatible portable fridge and air conditioner."
              />
              <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {ecoflowAppliances.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CardReveal>
            </SectionTransition>
          </>
        )}

        {/* ── Bluetti Power Stations ── */}
        {bluettiStations.length > 0 && (
          <>
            {DIVIDER}
            <SectionTransition id="bluetti" className="py-10 sm:py-14 lg:py-20">
              <div
                className="relative w-full rounded-3xl overflow-hidden mb-8 group"
                style={{ height: '280px', background: 'linear-gradient(135deg, #0a0a1a 0%, #12122a 100%)' }}
              >
                {bluettiStations[0]?.images?.[0] && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bluettiStations[0].images[0]}
                      alt="Bluetti Power Station"
                      className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                      style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                    />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,10,26,1) 0%, rgba(10,10,26,0.98) 30%, rgba(10,10,26,0.85) 45%, rgba(10,10,26,0.4) 60%, rgba(10,10,26,0) 75%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,18,42,0.6) 0%, transparent 50%)' }} />
                <div className="absolute top-0 left-0 w-64 h-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #4444ff, transparent)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#9999ff' }}>Bluetti Kenya &middot; Authorised Dealer</p>
                  <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Bluetti Power Stations</h3>
                  <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                    Quality LFP power backup. AC series for home, EB series for outdoor adventures.
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="/bluetti"
                      className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(99,102,241,0.55)]"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #0a0a1a)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
                    >
                      Shop Bluetti
                    </a>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{bluettiStations.length} products</span>
                  </div>
                </div>
                {bluettiStations.length > 0 && (
                  <div className="absolute bottom-5 right-6 text-right">
                    <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                    <p className="text-xl font-black font-mono text-white">KES {Math.min(...bluettiStations.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
                  </div>
                )}
              </div>
              <BrandAnchor
                brand="Bluetti"
                category="Power Stations"
                h2="Bluetti Power Stations Available in Kenya"
                seeAllHref="/bluetti"
                subtitle="Quality power backup from Kenya's authorised Bluetti dealer."
              />
              <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {bluettiStations.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CardReveal>
            </SectionTransition>
          </>
        )}

        {/* ── Power Banks ── */}
        {powerBanks.length > 0 && (
          <>
            {DIVIDER}
            <SectionTransition id="power-banks" className="py-10 sm:py-14 lg:py-20">
              <BrandAnchor
                brand="EcoFlow"
                category="Power Banks"
                h2="EcoFlow Power Banks Kenya"
                seeAllHref="/accessories/power-banks"
                subtitle="Stay charged on the go with RAPID magnetic charging technology."
              />
              <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {powerBanks.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CardReveal>
            </SectionTransition>
          </>
        )}

        {/* ── Accessories ── */}
        {accessories.length > 0 && (
          <>
            {DIVIDER}
            <SectionTransition id="accessories" className="py-10 sm:py-14 lg:py-20">
              <div
                className="relative w-full rounded-3xl overflow-hidden mb-8 group"
                style={{ height: '280px', background: 'linear-gradient(135deg, #001a1a 0%, #002233 100%)' }}
              >
                {accessories[0]?.images?.[0] && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={accessories[0].images[0]}
                      alt="EcoFlow Accessories"
                      className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
                      style={{ objectFit: 'cover', objectPosition: 'center center', width: '100%', height: '100%', position: 'absolute', top: 0, right: 0 }}
                    />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,26,26,1) 0%, rgba(0,26,26,0.98) 30%, rgba(0,26,26,0.85) 45%, rgba(0,26,26,0.4) 60%, rgba(0,26,26,0) 75%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,34,51,0.6) 0%, transparent 50%)' }} />
                <div className="absolute top-0 left-0 w-64 h-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #0099ff, transparent)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#66ccff' }}>EcoFlow Accessories &middot; Official</p>
                  <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}>Accessories & Add-ons</h3>
                  <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px', lineHeight: '1.6' }}>
                    Complete your EcoFlow ecosystem. Cables, mounts, adapters and more.
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="/accessories"
                      className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,119,170,0.55)]"
                      style={{ background: 'linear-gradient(135deg, #0077aa, #001a1a)', boxShadow: '0 4px 20px rgba(0,119,170,0.35)' }}
                    >
                      Shop Accessories
                    </a>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{accessories.length} products</span>
                  </div>
                </div>
                {accessories.length > 0 && (
                  <div className="absolute bottom-5 right-6 text-right">
                    <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Starting from</p>
                    <p className="text-xl font-black font-mono text-white">KES {Math.min(...accessories.map(p => p.price_kes)).toLocaleString('en-KE')}</p>
                  </div>
                )}
              </div>
              <BrandAnchor
                brand="EcoFlow"
                category="Accessories"
                h2="EcoFlow Accessories & Add-ons"
                seeAllHref="/accessories"
                subtitle="Complete your EcoFlow system with official accessories."
              />
              <CardReveal className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {accessories.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CardReveal>
            </SectionTransition>
          </>
        )}
      </div>

      {/* Why Batteriq section */}
      <section className="py-16 px-4 sm:px-6" style={{ background: '#f8f9ff' }}>
        <div className="max-w-5xl mx-auto">

          {/* Top label + heading */}
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#0000ff' }}>
              Why Buy From Batteriq
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>
              Kenya&apos;s Official EcoFlow Distributor
            </h2>
          </div>

          {/* 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Card 1 — EcoFlow */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 flex flex-col items-center text-center"
              style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 overflow-hidden"
                style={{ background: '#f0f0f0' }}>
                <img src="/logos/ecoflow-logo.jpg" alt="EcoFlow" className="w-10 h-10 object-contain" />
              </div>
              <p className="font-black text-gray-900 text-base mb-2">100% Genuine</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Official authorised dealer. Every product comes with full manufacturer warranty.
              </p>
            </div>

            {/* Card 2 — M-Pesa */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 flex flex-col items-center text-center"
              style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 overflow-hidden"
                style={{ background: '#f0fdf4' }}>
                <img src="/logos/mpesa.png" alt="M-Pesa" className="w-12 h-8 object-contain" />
              </div>
              <p className="font-black text-gray-900 text-base mb-2">Pay with M-Pesa</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Instant STK Push to your phone. Confirm with your PIN. Done.
              </p>
            </div>

            {/* Card 3 — Delivery */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 flex flex-col items-center text-center"
              style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: '#eff6ff' }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#0000ff" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <p className="font-black text-gray-900 text-base mb-2">Fast Delivery</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Same-day Nairobi delivery. Nationwide shipping across all 47 counties.
              </p>
            </div>

          </div>

          {/* Bottom trust bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-gray-200">
            {[
              '✓ Official EcoFlow Distributor',
              '✓ 24-Month Warranty',
              '✓ M-Pesa Accepted',
              '✓ Same-Day Nairobi Delivery',
              '✓ 47 Counties Covered',
            ].map(item => (
              <span key={item} className="text-xs font-bold text-gray-500">{item}</span>
            ))}
          </div>

        </div>
      </section>

      {/* Newsletter section */}
      <section className="bg-bq-navy py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center" data-aos="fade-up" data-aos-delay="100" data-aos-once="true">
          <h2 className="h2-fluid text-white mb-4">Get Exclusive EcoFlow Deals</h2>
          <p className="text-blue-200 mb-8">
            Subscribe to Batteriq&apos;s newsletter for exclusive promotions, new product launches,
            and expert power backup guides.
          </p>
          <HomepageNewsletter />
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
      <HomeAnimations />
      <SectionObserver />
    </PageWrapper>
  )
}
