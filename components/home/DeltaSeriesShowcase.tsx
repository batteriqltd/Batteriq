import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/supabase/types'

/**
 * DELTA Series — new EcoFlow lineup, shown above "Shop by Category".
 * Uses the same banner + ProductCard grid pattern as every other homepage
 * product section, so the DELTA models look identical to the rest of the site.
 * Renders nothing until the DELTA products exist in the DB (run the SQL).
 */
export function DeltaSeriesShowcase({ products }: { products: Product[] }) {
  if (!products || products.length === 0) return null

  const from = Math.min(...products.map(p => p.price_kes))

  return (
    <section className="max-w-8xl mx-auto px-4 lg:px-8 py-10 sm:py-14 lg:py-20">
      {/* Banner — same style as other sections, minimal copy */}
      <div
        className="relative w-full rounded-3xl overflow-hidden mb-8 group"
        style={{ height: '280px', background: 'linear-gradient(135deg, #00001a 0%, #000033 100%)' }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '58%', height: '100%', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/heroes/delta-series-hero.png"
            alt="EcoFlow DELTA Series"
            className="absolute right-0 top-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
            style={{ objectFit: 'cover', objectPosition: 'center center' }}
          />
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,26,1) 0%, rgba(0,0,26,0.96) 28%, rgba(0,0,26,0.8) 44%, rgba(0,0,26,0.35) 60%, rgba(0,0,26,0) 78%)' }} />
        <div className="absolute top-0 left-0 w-64 h-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at left center, #0000ff, transparent)' }} />

        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-14" style={{ maxWidth: '480px' }}>
          <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#6699ff' }}>EcoFlow · New</p>
          <h3 className="font-black text-white mb-3 leading-tight" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)', letterSpacing: '-0.03em' }}>DELTA Series</h3>
          <p className="text-sm font-bold mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>Home backup power · 1–11kWh</p>
          <a
            href="/power-stations"
            className="inline-flex items-center px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,255,0.55)] w-fit"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 4px 20px rgba(0,0,255,0.35)' }}
          >
            Shop DELTA
          </a>
        </div>

        <div className="absolute bottom-5 right-6 text-right">
          <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>From</p>
          <p className="text-xl font-black font-mono text-white">KES {from.toLocaleString('en-KE')}</p>
        </div>
      </div>

      {/* Product grid — identical ProductCard used everywhere else */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
