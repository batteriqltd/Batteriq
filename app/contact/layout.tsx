import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'

// The contact page is a client component and cannot export metadata itself,
// so without this it fell back to the generic homepage title.
export const metadata: Metadata = withCanonical('/contact', {
  title: 'Contact Us — EcoFlow & BLUETTI Dealer Nairobi',
  description:
    'Contact Batteriq, the authorised EcoFlow dealer in Kenya. Call or WhatsApp +254 716 822 014, email info@batteriq.com. Based in Nairobi, open Mon–Sat.',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
