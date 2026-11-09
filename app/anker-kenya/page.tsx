import type { Metadata } from 'next'
import { BrandAccessoryPage } from '@/components/seo/BrandAccessoryPage'
import { newPageMetadata } from '@/lib/newPages'
import { BRAND_PAGES } from '@/lib/newPageContent'

export const revalidate = 300

const PATH = '/anker-kenya'

export const metadata: Metadata = newPageMetadata(PATH, {
  title: { absolute: BRAND_PAGES[PATH].title },
  description: `Buy genuine Anker ${BRAND_PAGES[PATH].blurb} in Kenya from Batteriq, an authorised Anker dealer. Live prices, M-Pesa checkout and delivery to all 47 counties.`,
})

export default function AnkerKenyaPage() {
  return <BrandAccessoryPage path={PATH} />
}
