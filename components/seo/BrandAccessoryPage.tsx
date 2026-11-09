import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductGrid } from '@/components/product/ProductGrid'
import { CategoryAbout } from '@/components/seo/CategoryAbout'
import { getProductsByBrand } from '@/lib/productContentServer'
import { BRAND_PAGES, brandIntro } from '@/lib/newPageContent'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'

/** /anker-kenya, /soundcore-kenya, /eufy-kenya: the brand's products, intro below the grid. */
export async function BrandAccessoryPage({ path }: { path: keyof typeof BRAND_PAGES }) {
  const def = BRAND_PAGES[path]
  const products = await getProductsByBrand(def.brand)
  const description = `Genuine ${def.brand} ${def.blurb} in Kenya from Batteriq, an authorised ${def.brand} dealer.`
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Accessories', path: '/accessories' }, { name: def.h1, path }]))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(collectionPageJsonLd({ path, name: def.h1, description, products }))} />
      <Header />
      <ToastContainer />
      <PageHero
        title={def.h1}
        subtitle={`Genuine ${def.brand} ${def.blurb}. Pay with M-Pesa, delivered across Kenya.`}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accessories', href: '/accessories' },
          { label: def.h1, href: path },
        ]}
        height="small"
        align="left"
      />
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
        <ProductGrid products={products} />
      </div>
      <CategoryAbout content={{ heading: `About ${def.brand} in Kenya`, paragraphs: brandIntro(def.brand, def.blurb, products), faqs: [] }} />
      <Footer />
    </>
  )
}
