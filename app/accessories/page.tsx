import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { FilteredProductGrid } from '@/components/product/FilteredProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'EcoFlow Accessories Kenya — Batteries, Cables & Appliances | Batteriq',
  description:
    'Buy EcoFlow extra batteries, cables, appliances and accessories in Kenya. Extra batteries from KES 27,899. M-Pesa checkout. Authorised EcoFlow dealer.',
  alternates: { canonical: 'https://batteriq.com/accessories' },
}

async function getAccessoriesData() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('category', ['Batteries', 'Accessories', 'Appliances', 'Power Banks'])
      .eq('in_stock', true)
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
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
