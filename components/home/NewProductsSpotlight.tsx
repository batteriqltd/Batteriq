import { ArrowUpRight, BatteryCharging, Zap } from 'lucide-react'

const products = [
  {
    name: 'DELTA 3 Max',
    eyebrow: 'Maximum backup, still portable',
    href: '/ecoflow/delta-3-max',
    accent: '#74a7ff',
    specs: [
      ['2,048Wh', 'LFP capacity'],
      ['2,400W', 'AC output'],
      ['5,000W', 'Surge power'],
      ['1,000W', 'Solar input'],
    ],
  },
  {
    name: 'DELTA 3 2000 Air',
    eyebrow: 'Compact everyday backup',
    href: '/ecoflow/delta-3-2000-air',
    accent: '#a9d8ff',
    specs: [
      ['1,920Wh', 'LFP capacity'],
      ['1,000W', 'AC output'],
      ['LFP', 'Battery chemistry'],
      ['Portable', 'Backup power'],
    ],
  },
]

export function NewProductsSpotlight() {
  return (
    <section className="relative overflow-hidden bg-[#050b1d] py-12 sm:py-16 lg:py-20" aria-labelledby="new-products-heading">
      <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.28), transparent 36%), radial-gradient(circle at 90% 80%, rgba(0,194,255,0.16), transparent 32%)' }} />
      <div className="relative mx-auto max-w-8xl px-4 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#82b4ff]">New from EcoFlow</p>
            <h2 id="new-products-heading" className="max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl" style={{ letterSpacing: '-0.03em' }}>
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

        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((product) => (
            <article key={product.name} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 transition-colors hover:border-white/25 sm:p-7">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl" style={{ background: product.accent }} />
              <div className="relative">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: product.accent }}>{product.eyebrow}</p>
                    <h3 className="text-2xl font-black text-white sm:text-3xl">EcoFlow {product.name}</h3>
                  </div>
                  <Zap size={22} style={{ color: product.accent }} aria-hidden="true" />
                </div>

                <div className="mb-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  {product.specs.map(([value, label]) => (
                    <div key={label} className="bg-[#0b1430]/90 px-4 py-3">
                      <p className="font-mono text-lg font-black text-white">{value}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>

                <a href={product.href} className="inline-flex items-center gap-2 text-sm font-black text-white transition-colors hover:text-blue-200">
                  View product <ArrowUpRight size={17} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}