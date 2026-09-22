import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, BatteryCharging } from 'lucide-react'
import { formatKES } from '@/lib/utils'

const products = [
  {
    name: 'DELTA 3 Max',
    eyebrow: 'Maximum backup, still portable',
    href: '/ecoflow/delta-3-max',
    accent: '#74a7ff',
    image: '/products/ecoflow/delta-3-max.png',
    imageAlt: 'EcoFlow DELTA 3 Max portable power station — 2048Wh LFP, 2400W output',
    price: 148199,
    specs: [
      ['2,048Wh', 'LFP capacity'],
      ['2,400W', 'AC output'],
      ['4,800W', 'Surge power'],
      ['800W', 'Solar input'],
    ],
  },
  {
    name: 'DELTA 3 2000 Air',
    eyebrow: 'Compact everyday backup',
    href: '/ecoflow/delta-3-2000-air',
    accent: '#a9d8ff',
    image: '/products/ecoflow/delta-3-2000-air.jpg',
    imageAlt: 'EcoFlow DELTA 3 2000 Air portable power station — 1920Wh LFP, 1000W output',
    price: 106725,
    specs: [
      ['1,920Wh', 'LFP capacity'],
      ['1,000W', 'AC output'],
      ['800W', 'Solar input'],
      ['10ms', 'UPS switchover'],
    ],
  },
]

export function NewProductsSpotlight() {
  return (
    <section className="relative overflow-hidden bg-[#050b1d] py-14 sm:py-16 lg:py-20" aria-labelledby="new-products-heading">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.28), transparent 36%), radial-gradient(circle at 90% 80%, rgba(0,194,255,0.16), transparent 32%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.55), transparent)' }} />

      <div className="relative mx-auto max-w-8xl px-4 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#82b4ff]">New from EcoFlow</p>
            <h2
              id="new-products-heading"
              className="max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: '-0.03em' }}
            >
              Just landed: the DELTA 3 newcomers
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Meet the latest backup options from our authorised EcoFlow distributor, now available for Kenya.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/25 bg-blue-300/10 px-3 py-2 text-xs font-bold text-blue-100">
            <BatteryCharging size={15} /> Hot arrivals
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] transition-all duration-300 hover:border-blue-400/30 hover:shadow-blue-glow-lg"
            >
              <div
                className="absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-30"
                style={{ background: product.accent }}
              />

              <div className="relative p-5 sm:p-6 pb-0">
                <div className="relative h-56 overflow-hidden rounded-xl bg-gradient-to-b from-white via-white to-slate-100 sm:h-64 lg:h-72">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-bq-blue px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-blue-glow">
                    New
                  </span>
                  <Image
                    src={product.image}
                    alt={product.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 45vw, 92vw"
                    className="object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
              </div>

              <div className="relative p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: product.accent }}>
                      {product.eyebrow}
                    </p>
                    <h3 className="text-2xl font-black text-white sm:text-3xl" style={{ letterSpacing: '-0.02em' }}>
                      EcoFlow {product.name}
                    </h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price</p>
                    <p className="font-mono text-xl font-black text-white sm:text-2xl">{formatKES(product.price)}</p>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  {product.specs.map(([value, label]) => (
                    <div key={label} className="bg-[#0b1430]/90 px-4 py-3">
                      <p className="font-mono text-lg font-black text-white">{value}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={product.href}
                  className="inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3 font-black text-sm text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,255,0.55)]"
                  style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 4px 20px rgba(0,0,255,0.35)' }}
                >
                  View product <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
