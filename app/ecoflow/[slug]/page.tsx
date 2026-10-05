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
import { CATALOG_DELTA_SLUGS, FALLBACK_DELTA_PRODUCTS, isDeprecatedDelta, withDeltaFallback, withoutDeprecatedDelta } from '@/lib/delta-series'

// Product availability is managed in Supabase. Render this route per request
// so a newly published product cannot retain a previously cached 404 while the
// homepage already links to it.
export const dynamic = 'force-dynamic'

type PageProps = {
  params: { slug: string }
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('brand', 'EcoFlow')

    return (data ?? [])
      .filter((p) => !isDeprecatedDelta({ slug: p.slug, name: p.slug, brand: 'EcoFlow' }))
      .map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

// Shared corrected fallbacks (see lib/delta-series.ts). They render even when
// Supabase rows are missing or stale — no SQL Editor action required. Live DB
// price/stock win when the row exists; specs/descriptions/images always come
// from the corrected code data.
async function getProduct(slug: string): Promise<Product | null> {
  // Permanently removed: DELTA 3 Max Plus / Ultra Plus (and 100 Air) always 404,
  // even if a stale row still exists in Supabase.
  if (isDeprecatedDelta({ slug, name: slug, brand: 'EcoFlow' })) return null
  const isApproved = (CATALOG_DELTA_SLUGS as readonly string[]).includes(slug)
  const fallback = (isApproved ? FALLBACK_DELTA_PRODUCTS[slug] : undefined) ?? null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('brand', 'EcoFlow')
      .single()
    if (!data) return fallback
    if (isApproved) {
      const merged = withDeltaFallback([data as Product]).find((p) => p.slug === slug)
      return merged ?? (data as Product)
    }
    return data as Product
  } catch {
    // Database unreachable or row missing — fall through to local fallback.
    return fallback
  }
}

async function getRelatedProducts(product: Product): Promise<Product[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'EcoFlow')
      .eq('category', product.category)
      .neq('id', product.id)
      .eq('in_stock', true)
      .order('sort_order')
      .limit(4)
    return withoutDeprecatedDelta(data ?? [])
  } catch {
    return []
  }
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
    alternates: { canonical: productUrl('ecoflow', product.slug) },
    openGraph: {
      title,
      description,
      url: productUrl('ecoflow', product.slug),
      type: 'website',
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

export default async function EcoFlowProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const related = await getRelatedProducts(product)
  const faqs = buildProductFaqs(product)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, 'ecoflow')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(product, 'ecoflow')) }}
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
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">
              Related Products
            </h2>
            <ProductGrid products={related} />
          </section>
        )}
        <ProductFaq faqs={faqs} productName={product.name} />
      </div>
      <Footer />
    </>
  )
}
