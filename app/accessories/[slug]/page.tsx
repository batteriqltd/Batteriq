import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ProductDetail } from '@/components/product/ProductDetail'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductFaq } from '@/components/product/ProductFaq'
import {
  buildTitle, buildDescription, productJsonLd, breadcrumbJsonLd,
  buildProductFaqs, faqJsonLd, productUrl,
} from '@/lib/seo'
import type { Product } from '@/lib/supabase/types'

// These pages are statically generated from generateStaticParams, so without
// ISR a price or meta change in the database stays invisible until the next
// deploy — including in the Product JSON-LD, where a stale price can trip
// Google's merchant price-mismatch checks.
export const revalidate = 3600

type PageProps = { params: { slug: string } }

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('category', 'Accessories')
    .single()
  return data ?? null
}

async function getRelatedProducts(product: Product): Promise<Product[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('category', 'Accessories')
    .eq('brand', product.brand)
    .neq('id', product.id)
    .eq('in_stock', true)
    .order('sort_order')
    .limit(4)
  return data ?? []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) return {}

  const title = buildTitle(product)
  const description = buildDescription(product)
  return {
    // absolute: the root layout appends "| Batteriq" via a title template, and
    // our stored meta_titles already carry their own branding. Without this the
    // suffix is applied twice and the title blows past 60 characters.
    title: { absolute: title },
    description,
    alternates: { canonical: productUrl('accessories', product.slug) },
    openGraph: {
      title,
      description,
      url: productUrl('accessories', product.slug),
      type: 'website',
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

export default async function AccessoryProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()
  const related = await getRelatedProducts(product)
  const faqs = buildProductFaqs(product)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, 'accessories')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(product, 'accessories')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <Header />
      <ToastContainer />
      <div className="pt-[72px] min-h-screen">
        <ProductDetail product={product} />
        {related.length > 0 && (
          <section className="max-w-8xl mx-auto px-4 lg:px-8 pb-16">
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">Related Products</h2>
            <ProductGrid products={related} />
          </section>
        )}
        <ProductFaq faqs={faqs} productName={product.name} />
      </div>
      <Footer />
    </>
  )
}
