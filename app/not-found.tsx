import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="pt-[72px] min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-bq-blue font-mono text-8xl font-bold mb-4">404</p>
          <h1 className="font-display font-bold text-white text-3xl mb-3">Page not found</h1>
          <p className="text-bq-gray-400 mb-8 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist. Browse our full range of EcoFlow and Bluetti products.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-bq-blue text-white font-bold rounded-[8px] hover:bg-bq-blue-dim transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
      <Footer />
    </>
  )
}
