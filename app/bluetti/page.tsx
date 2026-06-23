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
  title: 'BLUETTI Power Stations Kenya — Official Dealer | Buy with M-Pesa | Batteriq',
  description: 'Buy BLUETTI power stations in Kenya. Official authorised BLUETTI dealer. AC200PL, AC300, AC500, EP500 in stock. Pay with M-Pesa. Same-day Nairobi delivery. 24-month warranty.',
  keywords: ['BLUETTI Kenya', 'buy BLUETTI Kenya', 'BLUETTI dealer Kenya', 'BLUETTI power station Kenya', 'BLUETTI AC200PL Kenya', 'BLUETTI Nairobi', 'portable power station Kenya'],
  alternates: { canonical: 'https://batteriq.com/bluetti' },
  openGraph: {
    title: 'BLUETTI Kenya — Official Dealer | Batteriq',
    description: 'Official BLUETTI power stations in Kenya. M-Pesa accepted.',
    url: 'https://batteriq.com/bluetti',
    images: [{ url: 'https://batteriq.com/heroes/battery-hero.jpg', width: 1200, height: 630, alt: 'BLUETTI Kenya — Batteriq Official Dealer' }],
  },
}

async function getBluesttiData() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'Bluetti')
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
        productImage="/products/bluetti/bluetti-ac200pl.jpg"
        productAlt="BLUETTI AC200PL"
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
