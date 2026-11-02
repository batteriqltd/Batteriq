import type { Metadata } from 'next'

// The contact page is a client component and cannot export metadata itself,
// so without this it fell back to the generic homepage title.
export const metadata: Metadata = {
  title: 'Contact Us — EcoFlow & BLUETTI Dealer Nairobi',
  description:
    'Contact Batteriq, the authorised EcoFlow dealer in Kenya. Call or WhatsApp +254 716 822 014, email info@batteriq.com. Based in Nairobi, open Mon–Sat.',
  alternates: { canonical: 'https://batteriq.com/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
