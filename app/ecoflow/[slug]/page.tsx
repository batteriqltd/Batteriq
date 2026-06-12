import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ProductDetail } from '@/components/product/ProductDetail'
import { ProductGrid } from '@/components/product/ProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import type { Product } from '@/lib/supabase/types'

type PageProps = {
  params: { slug: string }
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('brand', 'EcoFlow')

  return (data ?? []).map((p) => ({ slug: p.slug }))
}

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('brand', 'EcoFlow')
    .single()
  return data ?? null
}

async function getRelatedProducts(product: Product): Promise<Product[]> {
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
  return data ?? []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) return {}

  const title = `${product.name} Price in Kenya — KES ${product.price_kes.toLocaleString()} | Batteriq`
  const description = product.meta_description ??
    `Buy the EcoFlow ${product.name} in Kenya for KES ${product.price_kes.toLocaleString()}. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://batteriq.com/ecoflow/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

const breadcrumbSchema = (product: Product) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://batteriq.com' },
    { '@type': 'ListItem', position: 2, name: 'EcoFlow Kenya', item: 'https://batteriq.com/ecoflow-kenya' },
    { '@type': 'ListItem', position: 3, name: product.name, item: `https://batteriq.com/ecoflow/${product.slug}` },
  ],
})

const productSchema = (product: Product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: product.images ?? [],
  description: product.description,
  brand: { '@type': 'Brand', name: product.brand },
  sku: product.sku,
  offers: {
    '@type': 'Offer',
    url: `https://batteriq.com/ecoflow/${product.slug}`,
    priceCurrency: 'KES',
    price: product.price_kes,
    availability: product.in_stock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', name: 'Batteriq' },
  },
  ...(product.schema_rating && product.schema_review_count && product.schema_review_count > 0 ? {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.schema_rating,
      reviewCount: product.schema_review_count,
      bestRating: 5,
      worstRating: 1,
    }
  } : {}),
})

export default async function EcoFlowProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const related = await getRelatedProducts(product)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(product)) }}
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
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
