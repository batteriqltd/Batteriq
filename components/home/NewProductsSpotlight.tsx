import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, BatteryCharging } from 'lucide-react'
import { formatKES } from '@/lib/utils'

const products = [
  {
    name: 'DELTA 3 Max',
    eyebrow: 'Maximum backup, still portable',
    href: '/ecoflow/delta-3-max',
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
    <section className="bg-white py-10 sm:py-16 lg:py-20" aria-labelledby="new-products-heading">
      <div className="mx-auto max-w-8xl px-4 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-bq-blue sm:mb-3">New from EcoFlow</p>
            <h2
              id="new-products-heading"
              className="max-w-xl text-3xl font-black leading-tight text-gray-900 sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: '-0.03em' }}
            >
              Just landed: the DELTA 3 newcomers
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 sm:mt-3 sm:text-base">
              Meet the latest backup options from our authorised EcoFlow distributor, now available for Kenya.
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl border border-blue-100 bg-[#f8f9ff] px-4 py-2.5 text-xs font-black text-[#0000ff] shadow-sm">
            <BatteryCharging size={15} /> Hot arrivals
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
          {products.map((product) => (
            <article
              key={product.name}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white transition-all duration-300 hover:border-blue-600/20 hover:shadow-ambient"
            >
              <div className="p-2.5 pb-0 sm:p-6 sm:pb-0">
                <div className="relative h-36 overflow-hidden rounded-xl bg-slate-50/80 transition-colors group-hover:bg-slate-100/50 sm:h-64 lg:h-72">
                  <span className="absolute left-2 top-2 z-10 rounded-full bg-bq-blue px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-blue-glow sm:left-3 sm:top-3 sm:px-3 sm:text-[10px]">
                    New
                  </span>
                  <Image
                    src={product.image}
                    alt={product.imageAlt}
                    fill
                    sizes="(max-width: 640px) 50vw, (min-width: 1024px) 45vw, 92vw"
                    className="object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-[1.04] mix-blend-multiply sm:p-6"
                  />
                </div>
              </div>

              <div className="relative flex flex-1 flex-col p-3 sm:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-bq-blue sm:mb-1.5 sm:text-xs">
                  {product.eyebrow}
                </p>
                <h3 className="min-h-[40px] text-base font-black leading-snug text-slate-900 line-clamp-2 sm:min-h-0 sm:text-3xl" style={{ letterSpacing: '-0.02em' }}>
                  EcoFlow {product.name}
                </h3>
                <p className="mt-1 font-mono text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">{formatKES(product.price)}</p>

                <div className="mb-4 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/60 bg-slate-200/60 sm:mb-6 sm:mt-4">
                  {product.specs.map(([value, label]) => (
                    <div key={label} className="bg-white px-2 py-2 sm:px-4 sm:py-3">
                      <p className="font-mono text-[13px] font-black text-slate-900 sm:text-lg">{value}</p>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:mt-1 sm:text-[11px]">{label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={product.href}
                  className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-black text-xs text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,255,0.55)] sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
                  style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 4px 20px rgba(0,0,255,0.35)' }}
                >
                  Shop Now <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
