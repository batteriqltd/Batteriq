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
  'delta-3-classic': {
    id: 'fallback-delta-3-classic',
    sku: '5025901009',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Classic',
    slug: 'delta-3-classic',
    description:
      'The EcoFlow DELTA 3 Classic is EcoFlow’s best-value 1kWh portable power station for Kenyan homes, outdoor work and everyday backup. With 1024Wh LiFePO4 capacity and 1800W AC output (3600W surge, X-Boost to 2400W), it powers essentials like lights, Wi‑Fi, TVs, fridges and power tools. Charges 0–80% in 45 mins via 1400W AC, 500W solar max, 10ms UPS switchover, 5 outlets, whisper-quiet 30dB operation.',
    specs: {
      capacity: '1024Wh',
      ac_output: '1800W (Surge 3600W)',
      x_boost: '2400W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '500W Max',
      ac_charging: '1400W (0-80% in 45 mins)',
      ups_mode: 'Yes (10ms switchover)',
      outlets: '5',
      weight: '12.1kg',
      dimensions: '398 x 200 x 283mm',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-classic.png'],
    price_kes: 84379,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 10,
    meta_title: 'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T00:00:00.000Z',
  },
  'delta-3-ultra': {
    id: 'fallback-delta-3-ultra',
    sku: '5024201005',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA 3 Ultra',
    slug: 'delta-3-ultra',
    description:
      'The EcoFlow DELTA 3 Ultra is the 3072Wh whole-home backup station for bigger Kenyan homes and businesses. With 3600W AC output (7200W surge, X-Boost to 4600W), 10ms UPS auto-switch, 4 charging methods (0-80% in 89 mins via AC), whisper-quiet 25dB operation and OASIS app control with Storm Guard, it keeps fridges, microwaves, office loads and essentials running through long outages.',
    specs: {
      capacity: '3072Wh',
      ac_output: '3600W (Surge 7200W)',
      x_boost: '4600W',
      chemistry: 'LFP (LiFePO4)',
      battery_life: '4000 cycles to 80%',
      solar_input: '1600W Max',
      ac_charging: '0-80% in 89 mins',
      ups_mode: 'Yes (10ms switchover)',
      expandable: 'No',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-3-ultra-plus.png'],
    price_kes: 250799,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 11,
    meta_title: 'EcoFlow DELTA 3 Ultra Kenya — 3072Wh KES 250,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3072Wh LFP, 3600W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T00:00:00.000Z',
  },
  'delta-pro': {
    id: 'fallback-delta-pro',
    sku: '5004501016',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro',
    slug: 'delta-pro',
    description:
      'The EcoFlow DELTA Pro is a serious home backup battery for Kenyan homes, offices and light commercial setups. With 3600Wh of LiFePO4 storage and 3600W AC output, it runs major appliances during outages, recharges fast, and can be expanded with additional batteries for longer runtime.',
    specs: {
      capacity: '3600Wh',
      ac_output: '3600W (Surge 7200W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '1600W Max',
      ports: '13',
      weight: '45kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro.jpg'],
    price_kes: 291399,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 12,
    meta_title: 'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
    schema_rating: 0,
    schema_review_count: 0,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T00:00:00.000Z',
  },
  'delta-pro-3': {
    id: 'fallback-delta-pro-3',
    sku: '5013701013',
    brand: 'EcoFlow',
    category: 'Power Stations',
    subcategory: 'DELTA Series',
    name: 'EcoFlow DELTA Pro 3',
    slug: 'delta-pro-3',
    description:
      'The EcoFlow DELTA Pro 3 is the flagship DELTA model for demanding backup needs, combining 4096Wh of LiFePO4 capacity with 4000W AC output and deep-coverage port selection. It is designed for larger homes, offices, server rooms and backup-heavy environments that need serious reliability during outages.',
    specs: {
      capacity: '4096Wh',
      ac_output: '4000W (Surge 8000W)',
      chemistry: 'LFP (LiFePO4)',
      solar_input: '2000W Max',
      ports: '12',
      weight: '51.5kg',
      warranty: '24 months',
    },
    images: ['/products/ecoflow/delta-pro-3.jpg'],
    price_kes: 461799,
    compare_price_kes: null,
    discount_percent: null,
    discount_badge: null,
    in_stock: true,
    stock_qty: 10,
    featured: false,
    sort_order: 13,
    meta_title: 'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
    meta_description:
      'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.',
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
