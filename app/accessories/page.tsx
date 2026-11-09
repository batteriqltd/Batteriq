import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { ToastContainer } from '@/components/ui/Toast'
import { CategoryAbout } from '@/components/seo/CategoryAbout'
import { accessoriesContent } from '@/lib/categoryContent'

export const revalidate = 60

export const metadata: Metadata = withCanonical('/accessories', {
  // absolute: skips the root "%s | Batteriq" template, which doubled the brand
  title: { absolute: 'EcoFlow Extra Batteries & Accessories Kenya | Batteriq' },
  description:
    'Buy EcoFlow extra batteries, cables, appliances and accessories in Kenya. M-Pesa checkout. Authorised EcoFlow dealer.',
})

async function getAccessoriesData() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('category', ['Batteries', 'Accessories', 'Appliances', 'Power Banks'])
      .order('sort_order')
    if (error) { console.error('Supabase error:', error.message); return [] }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

export default async function AccessoriesPage() {
  const products = await getAccessoriesData()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Accessories', path: '/accessories' }]))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          collectionPageJsonLd({
            path: '/accessories',
            name: 'Accessories in Kenya',
            description: 'Extra batteries, cables, chargers, audio and smart-home accessories from EcoFlow, Anker, Soundcore and Eufy in Kenya, from Batteriq.',
            products: products,
          })
        )}
      />
      <Header />
      <ToastContainer />
      <PageHero
        title="Accessories & Add-ons"
        subtitle="Complete your EcoFlow system with official batteries, chargers, cables and smart accessories."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accessories', href: '/accessories' },
        ]}
        bgImage="/heroes/delta-pro-hero.jpg"
        productImage="/products/ecoflow/glacier-portable-fridge-freezer.jpg"
        productAlt="EcoFlow GLACIER Portable Fridge"
        badge="Official EcoFlow Accessories"
        height="medium"
        align="left"
      />
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
        <FilteredProductGrid products={products} filterType="accessories" />
      </div>
      {/* About + FAQ — below the grid only */}
      <CategoryAbout content={accessoriesContent(products)} />
      <Footer />
    </>
  )
}
