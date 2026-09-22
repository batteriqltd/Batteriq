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

    return (data ?? []).map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

// Local fallback so the homepage "Shop Now" cards never 404, even if these
// rows have not been inserted into Supabase yet (see DELTA_3_NEW_ARRIVALS.sql
// for the source of truth). The database always wins when the row exists.
const FALLBACK_PRODUCTS: Record<string, Product> = {
  'delta-3-max': {
    id: 'fallback-delta-3-max',
    sku: '5016501003',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Max',
    slug: 'delta-3-max',
    description:
      'The EcoFlow DELTA 3 Max delivers 2048Wh of LFP capacity and 2400W continuous AC output (5000W surge) with X-Boost to 3400W. Recharge to 80% in about 1.1 hours, add up to 6kWh with a smart extra battery, and monitor everything from the EcoFlow app. Built for Kenyan homes and businesses that need serious backup without a permanent installation.',
    specs: {
      capacity: '2048Wh',
      ac_output: '2400W (Surge 5000W)',
      chemistry: 'LFP (LiFePO4)',
      x_boost: '3400W',
      cycle_life: '3500+ cycles to 80%',
      weight: '22kg',
      dimensions: '497 x 264 x 360mm',
      solar_input: '1000W Max (11-60V, 15A)',
      ac_charging: '2000W Max, 0-80% in 1.1 hrs',
      usb_c: '2 x USB-C 140W',
      usb_a: '2 x USB-A 18W',
      expandable: 'Yes — up to 6kWh',
      app_control: 'Yes (Wi-Fi & Bluetooth)',
      ups_mode: 'Yes (<30ms switchover)',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-max.png'],
    price_kes: 148199,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 10,
    meta_title: 'EcoFlow DELTA 3 Max Kenya — 2048Wh KES 148,199 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Max in Kenya for KES 148,199. 2048Wh LFP, 2400W AC output, app control. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T00:00:00.000Z',
  },
  'delta-3-2000-air': {
    id: 'fallback-delta-3-2000-air',
    sku: '5023701006',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 2000 Air',
    slug: 'delta-3-2000-air',
    description:
      'The EcoFlow DELTA 3 2000 Air pairs 1920Wh of LFP capacity with 1000W of pure sine wave output in a compact, apartment-friendly frame. X-Stream charging reaches a full charge in about 2 hours, 800W solar input tops it up off-grid, and 10ms UPS switchover keeps fridge, router and lights on through outages. Quiet, portable backup for Kenyan homes.',
    specs: {
      capacity: '1920Wh',
      ac_output: '1000W (Surge 2000W)',
      chemistry: 'LFP (LiFePO4)',
      cycle_life: '3000+ cycles to 80%',
      solar_input: '800W Max',
      ac_charging: 'Up to 1600W, full in ~2 hrs',
      usb_c: '2 x USB-C 100W',
      usb_a: '2 x USB-A 18W',
      ups_mode: 'Yes (10ms switchover)',
      noise: 'Below 44 dB',
      app_control: 'Yes (Wi-Fi & Bluetooth)',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-2000-air.jpg'],
    price_kes: 106725,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 11,
    meta_title: 'EcoFlow DELTA 3 2000 Air Kenya — 1920Wh KES 106,725 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 2000 Air in Kenya for KES 106,725. 1920Wh LFP, 1000W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T00:00:00.000Z',
  },
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('brand', 'EcoFlow')
      .single()
    if (data) return data
  } catch {
    // Database unreachable or row missing — fall through to local fallback.
  }
  return FALLBACK_PRODUCTS[slug] ?? null
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
    return data ?? []
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
