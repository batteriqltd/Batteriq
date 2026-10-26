import { BrandAnchor } from '@/components/home/BrandAnchor'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/supabase/types'

/**
 * Bluetti spotlight — four featured products in the order supplied by the
 * homepage, using the same ProductCard as every other shop section.
 */
export function BluettiSpotlight({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-8xl px-4 lg:px-8">
        <BrandAnchor
          brand="Bluetti Kenya"
          category="Power Stations"
          h2="Bluetti"
          seeAllHref="/bluetti"
          subtitle="Homestar 3, HB500, AC50P and AC200PL — genuine Bluetti backup, pay with M-Pesa."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6 items-stretch">
          {products.map((product) => (
            <div key={product.id} className="h-full min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
