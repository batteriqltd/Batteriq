import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Order Confirmation',
  description: 'Your Batteriq order confirmation.',
  robots: { index: false, follow: true },
}

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children
}
