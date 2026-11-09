import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Check the status of your Batteriq order with your order number and email.',
  robots: { index: false, follow: true },
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
