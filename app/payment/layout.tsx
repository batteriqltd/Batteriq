import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Payment',
  description: 'Batteriq payment status.',
  robots: { index: false, follow: true },
}

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children
}
