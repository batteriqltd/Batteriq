import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'

export const metadata: Metadata = withCanonical('/support/warranty', {
  title: 'Warranty Registration — EcoFlow & BLUETTI Kenya',
  description:
    'Register your EcoFlow, BLUETTI, Anker, Soundcore or Eufy product bought from Batteriq, the authorised dealer in Kenya. 24-month warranty with local support in Nairobi.',
})

export default function WarrantyLayout({ children }: { children: React.ReactNode }) {
  return children
}
