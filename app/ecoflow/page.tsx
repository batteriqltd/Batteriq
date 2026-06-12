import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ProductGrid } from '@/components/product/ProductGrid'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'EcoFlow Power Stations Kenya — Buy with M-Pesa | Batteriq',
  description:
    'Shop all EcoFlow power stations in Kenya. RIVER series from KES 27,259, DELTA series from KES 85,539. Instant M-Pesa checkout. Authorised EcoFlow dealer.',
  alternates: { canonical: 'https://batteriq.com/ecoflow' },
}

async function getEcoFlowAll() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', 'EcoFlow')
      .eq('in_stock', true)
      .order('sort_order')
    if (error) {
      console.error('Supabase error:', error.message)
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('Fetch failed:', e)
    return []
  }
}

export default async function EcoFlowCollectionPage() {
  const products = await getEcoFlowAll()

  return (
    <>
      <Header />
      <ToastContainer />
      <PageHero
        title="EcoFlow Power Stations"
        subtitle="The complete EcoFlow range in Kenya. From the ultra-portable RIVER 2 to the powerful DELTA Pro. Instant M-Pesa checkout."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'EcoFlow', href: '/ecoflow' },
        ]}
        bgGradient="linear-gradient(135deg, #00001a 0%, #000080 100%)"
        productImage="/products/ecoflow/delta-pro-3.jpg"
        productAlt="EcoFlow DELTA Pro 3"
        badge="Official EcoFlow Authorised Dealer"
      />
      <div className="min-h-screen">
        <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12">
          <ProductGrid products={products} showKenyaContext />
        </div>
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
