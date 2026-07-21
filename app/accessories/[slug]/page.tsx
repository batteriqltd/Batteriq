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

  const title = `${product.name} Price in Kenya — KES ${product.price_kes.toLocaleString()} | Batteriq`
  const description = product.meta_description ?? `Buy ${product.name} in Kenya for KES ${product.price_kes.toLocaleString()} from Batteriq.`
  return {
    title,
    description,
    alternates: { canonical: `https://batteriq.com/accessories/${product.slug}` },
    openGraph: { title, description, images: product.images?.[0] ? [{ url: product.images[0] }] : [] },
  }
}

export default async function AccessoryProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()
  const related = await getRelatedProducts(product)

  return (
    <>
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
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
