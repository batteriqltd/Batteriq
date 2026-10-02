import { BrandAnchor } from '@/components/home/BrandAnchor'
import { ProductCard } from '@/components/product/ProductCard'
import { CATALOG_DELTA_SLUGS } from '@/lib/delta-series'
import type { Product } from '@/lib/supabase/types'

const FEATURED_SLUGS = [...CATALOG_DELTA_SLUGS]

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
    <section className="bg-white py-10 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-8xl px-4 lg:px-8">
        {/* Same header as every other shop section */}
        <BrandAnchor
          brand="EcoFlow"
          category="Power Stations"
          h2="Just landed: the DELTA 3 newcomers"
          seeAllHref="/ecoflow"
          subtitle="Meet the latest backup options from our authorised EcoFlow distributor, now available for Kenya."
        />

        {/* 2 in a row on phones/tablets, 5 in a row on laptops/desktops */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-6 items-stretch">
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
