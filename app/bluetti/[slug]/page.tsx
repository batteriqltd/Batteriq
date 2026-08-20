import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ProductDetail } from '@/components/product/ProductDetail'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ToastContainer } from '@/components/ui/Toast'
import type { Product } from '@/lib/supabase/types'
import { ProductFaq } from '@/components/product/ProductFaq'
import {
  buildTitle, buildDescription, productJsonLd, breadcrumbJsonLd,
  buildProductFaqs, faqJsonLd, productUrl,
} from '@/lib/seo'

// These pages are statically generated from generateStaticParams, so without
// ISR a price or meta change in the database stays invisible until the next
// deploy — including in the Product JSON-LD, where a stale price can trip
// Google's merchant price-mismatch checks.
export const revalidate = 3600

type PageProps = {
  params: { slug: string }
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('brand', 'Bluetti')
  return (data ?? []).map((p) => ({ slug: p.slug }))
}

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('brand', 'Bluetti')
    .single()
  return data ?? null
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
    alternates: { canonical: productUrl('bluetti', product.slug) },
    openGraph: {
      title,
      description,
      url: productUrl('bluetti', product.slug),
      type: 'website',
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

export default async function BluesttiProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const supabase = createAdminClient()
  const { data: related } = await supabase
    .from('products')
    .select('*')
    .eq('brand', 'Bluetti')
    .neq('id', product.id)
    .eq('in_stock', true)
    .order('sort_order')
    .limit(4)

  const faqs = buildProductFaqs(product)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, 'bluetti')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(product, 'bluetti')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <Header />
      <ToastContainer />
      <div className="pt-[72px] min-h-screen">
        <ProductDetail product={product} />
        {related && related.length > 0 && (
          <section className="max-w-8xl mx-auto px-4 lg:px-8 pb-16">
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">Related Bluetti Products</h2>
            <ProductGrid products={related} />
          </section>
        )}
        <ProductFaq faqs={faqs} productName={product.name} />
      </div>
      <Footer />
    </>
  )
}
