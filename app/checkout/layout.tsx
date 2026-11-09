import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Batteriq order with M-Pesa, card or cash on delivery.',
  robots: { index: false, follow: true },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
