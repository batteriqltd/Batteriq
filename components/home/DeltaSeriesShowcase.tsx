import Link from 'next/link'

/**
 * DELTA Series showcase — curated, editorial homepage section.
 * Sits directly above "Shop by Category". Product cards link to the EcoFlow
 * detail pages (/ecoflow/[slug]); those pages + images resolve from the DB once
 * the accompanying SQL is run.
 */

const DELTA_PRODUCTS = [
  { name: 'DELTA 3 100 Air', slug: 'delta-3-100-air', img: '/products/ecoflow/delta-3-100-air.png', tag: 'Grab-and-go backup' },
  { name: 'DELTA 3 Classic', slug: 'delta-3-classic', img: '/products/ecoflow/delta-3-classic.png', tag: 'Everyday home backup' },
  { name: 'DELTA 3 Max Plus', slug: 'delta-3-max-plus', img: '/products/ecoflow/delta-3-max-plus.png', tag: 'Expandable capacity' },
  { name: 'DELTA 3 Ultra Plus', slug: 'delta-3-ultra-plus', img: '/products/ecoflow/delta-3-ultra-plus.png', tag: 'Whole-home ready' },
]

const Arrow = ({ color = '#0000ff' }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function DeltaSeriesShowcase() {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f5f8ff 55%, #eef2fb 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* ── Header ─────────────────────────────── */}
        <div className="text-center mb-9 sm:mb-12" data-aos="fade-up" data-aos-once="true">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: '#eaf0ff', border: '1px solid #d6e2ff' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0000ff' }} />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#0000ff' }}>
              Just Landed · EcoFlow DELTA Series
            </span>
          </div>
          <h2 className="font-black text-gray-900" style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            The DELTA Series
          </h2>
          <p
            className="mt-4 text-gray-500 font-medium max-w-2xl mx-auto"
            style={{ fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)', lineHeight: 1.6 }}
          >
            Compact &amp; reliable emergency home backup power — from{' '}
            <span className="font-black text-gray-900">1kWh to 11kWh</span>. Keep the lights, fridge and Wi-Fi
            running through any blackout.
          </p>
        </div>

        {/* ── Editorial hero banner ──────────────── */}
        <div
          className="relative rounded-[28px] overflow-hidden mb-10 sm:mb-14 group"
          data-aos="fade-up" data-aos-once="true"
          style={{ boxShadow: '0 30px 80px rgba(0,0,60,0.20)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/heroes/delta-series-hero.png"
            alt="EcoFlow DELTA Series lineup — emergency home backup power"
            className="w-full h-auto block transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
          />
          {/* Legibility scrims */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(0,0,22,0.62) 0%, rgba(0,0,22,0.2) 34%, transparent 58%)' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(0,0,22,0.5) 0%, transparent 42%)' }} />

          {/* Floating kWh badge */}
          <div
            className="absolute top-5 right-5 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 6px 20px rgba(0,0,40,0.15)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0000ff' }} />
            <span className="text-[11px] font-black" style={{ color: '#00004d', letterSpacing: '0.02em' }}>1kWh → 11kWh</span>
          </div>

          {/* Copy + CTA */}
          <div className="absolute left-0 bottom-0 p-6 sm:p-10 max-w-xl">
            <p className="text-white/75 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-2 hidden sm:block">
              Emergency Home Backup · 1–11kWh
            </p>
            <h3 className="text-white font-black leading-tight mb-5" style={{ fontSize: 'clamp(1.35rem, 3vw, 2.25rem)', letterSpacing: '-0.03em' }}>
              Power that shows up<br className="hidden sm:block" /> when the grid doesn&apos;t.
            </h3>
            <Link
              href="/power-stations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 10px 30px rgba(0,0,255,0.45)' }}
            >
              Explore the Series
              <Arrow color="#ffffff" />
            </Link>
          </div>
        </div>

        {/* ── Product lineup ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {DELTA_PRODUCTS.map((p, i) => (
            <Link
              key={p.slug}
              href={`/ecoflow/${p.slug}`}
              data-aos="fade-up" data-aos-delay={String(i * 70)} data-aos-once="true"
              className="group relative flex flex-col rounded-[22px] overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1.5"
              style={{ border: '1px solid #edf1f8', boxShadow: '0 4px 24px rgba(0,0,50,0.06)' }}
            >
              {/* Product image tile — white to match the on-white renders */}
              <div className="relative aspect-square flex items-center justify-center p-5" style={{ background: '#ffffff' }}>
                <span
                  className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                  style={{ background: '#0000ff', color: '#fff' }}
                >
                  New
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  style={{ filter: 'drop-shadow(0 12px 26px rgba(0,0,40,0.16))' }}
                />
              </div>

              {/* Text */}
              <div className="p-4 sm:p-5 flex flex-col flex-1" style={{ borderTop: '1px solid #f1f4fa' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-1.5" style={{ color: '#93a0b5' }}>{p.tag}</p>
                <h3
                  className="font-black text-gray-900 leading-tight mb-3"
                  style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)', letterSpacing: '-0.02em' }}
                >
                  {p.name}
                </h3>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-black" style={{ color: '#0000ff' }}>
                  View details
                  <span className="transition-transform duration-200 group-hover:translate-x-1"><Arrow /></span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
