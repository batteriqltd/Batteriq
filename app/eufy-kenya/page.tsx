import type { Metadata } from 'next'
import { BrandAccessoryPage } from '@/components/seo/BrandAccessoryPage'
import { newPageMetadata } from '@/lib/newPages'
import { BRAND_PAGES } from '@/lib/newPageContent'

export const revalidate = 300

const PATH = '/eufy-kenya'

export const metadata: Metadata = newPageMetadata(PATH, {
  title: { absolute: BRAND_PAGES[PATH].title },
  description: `Buy genuine Eufy ${BRAND_PAGES[PATH].blurb} in Kenya from Batteriq, an authorised Eufy dealer. Live prices, M-Pesa checkout and delivery to all 47 counties.`,
})

export default function EufyKenyaPage() {
  return <BrandAccessoryPage path={PATH} />
}
