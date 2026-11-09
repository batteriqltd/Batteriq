import type { Metadata } from 'next'

// Utility page: kept out of search results, links still followed.
export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Manage your Batteriq email preferences.',
  robots: { index: false, follow: true },
}

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children
}
