import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'
import { BUSINESS } from '@/lib/business'

// The contact page is a client component and cannot export metadata itself,
// so without this it fell back to the generic homepage title.
export const metadata: Metadata = withCanonical('/contact', {
  title: { absolute: 'Contact Batteriq – EcoFlow & Bluetti Dealer, Nairobi' },
  // Phone, email and hours come from lib/business.ts.
  description: `Contact Batteriq, EcoFlow and Bluetti dealer in Nairobi. Call or WhatsApp ${BUSINESS.phone.international} or email ${BUSINESS.email}. Open ${BUSINESS.hoursLabel}.`,
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
