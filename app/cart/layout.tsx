import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the items in your Batteriq cart.',
  robots: { index: false, follow: true },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
