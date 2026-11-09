import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'

export const metadata: Metadata = withCanonical('/support/warranty', {
  title: { absolute: 'EcoFlow & Bluetti Warranty Registration Kenya | Batteriq' },
  description:
    'Register an EcoFlow or Bluetti product bought from Batteriq for warranty support in Kenya, with local support from our team in Nairobi.',
})

export default function WarrantyLayout({ children }: { children: React.ReactNode }) {
  return children
}
