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
  title: 'BLUETTI Power Stations Kenya — AC200PL, AC300, AC500 | Batteriq',
  description:
    'Buy BLUETTI power stations in Kenya. AC200PL, AC300, AC500, EB3A and more. Official BLUETTI dealer. M-Pesa accepted. Nairobi delivery.',
  alternates: { canonical: 'https://batteriq.com/bluetti' },
}

async function getBluesttiData() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'Bluetti')
      .eq('in_stock', true)
      .order('sort_order')
    if (error) { console.error('Supabase error:', error.message); return [] }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

export default async function BluesttiCollectionPage() {
  const products = await getBluesttiData()

  return (
    <>
      <Header />
      <ToastContainer />
      <PageHero
        title="Bluetti Power Stations"
        subtitle="The full range of BLUETTI portable power stations, solar panels and batteries available in Kenya."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Bluetti', href: '/bluetti' },
        ]}
        bgImage="/heroes/battery-hero.jpg"
        badge="Official BLUETTI Authorised Dealer"
        height="medium"
        align="left"
      />
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
        <FilteredProductGrid products={products} filterType="bluetti" />
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
