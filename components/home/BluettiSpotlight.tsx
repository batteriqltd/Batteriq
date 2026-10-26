import { BrandAnchor } from '@/components/home/BrandAnchor'
import { ProductCard } from '@/components/product/ProductCard'
import { BLUETTI_NEW_SLUGS } from '@/lib/bluetti-residential'
import type { Product } from '@/lib/supabase/types'

const FEATURED_SLUGS = BLUETTI_NEW_SLUGS.slice(0, 4)

/**
 * Bluetti new arrivals — replaces the old DELTA 3 spotlight with the four
 * latest Bluetti residential systems, using the same ProductCard as every
 * other homepage section.
 */
export function BluettiSpotlight({ products }: { products: Product[] }) {
  const featuredProducts = FEATURED_SLUGS
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product))

  if (featuredProducts.length === 0) return null

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-8xl px-4 lg:px-8">
        <BrandAnchor
          brand="Bluetti"
          category="Residential Backup"
          h2="New Bluetti Residential Backup"
          seeAllHref="/bluetti"
          subtitle="Homestar 3, HV6K, HV10K & HB500 — now in stock in Kenya. Pay with M-Pesa."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6 items-stretch">
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
