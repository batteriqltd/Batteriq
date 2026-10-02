import { BatteryCharging } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/supabase/types'

const FEATURED_SLUGS = ['delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3']

/**
 * New arrivals — uses the exact same ProductCard as every other homepage
 * section, so all four sit at the same measure, four in a row on phones,
 * tablets, laptops and desktops alike.
 */
export function NewProductsSpotlight({ products }: { products: Product[] }) {
  const featuredProducts = FEATURED_SLUGS
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product))

  if (featuredProducts.length === 0) return null

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

        {/* Same card + same 4-in-a-row measure as every other section */}
        <div className="grid grid-cols-4 gap-2 sm:gap-5 lg:gap-6 items-stretch">
          {featuredProducts.map((product) => (
            <div key={product.id} className="h-full min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
