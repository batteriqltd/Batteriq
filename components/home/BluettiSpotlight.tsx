import { BrandAnchor } from '@/components/home/BrandAnchor'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductRail } from '@/components/product/ProductRail'
import type { Product } from '@/lib/supabase/types'

/**
 * Bluetti spotlight — four featured products in the order supplied by the
 * homepage, using the same ProductCard as every other shop section.
 */
export function BluettiSpotlight({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="bg-white py-5 sm:py-6">
      <div className="mx-auto max-w-8xl px-4 lg:px-8">
        <BrandAnchor
          brand="Bluetti Kenya"
          category="Power Stations"
          h2="Bluetti"
          seeAllHref="/bluetti"
          subtitle="Homestar 3, Homestar 5, AC50P and AC200PL — genuine Bluetti backup, pay with M-Pesa."
        />

        <ProductRail>
          {products.map((product) => (
            <div key={product.id} className="h-full min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </ProductRail>
      </div>
    </section>
  )
}
