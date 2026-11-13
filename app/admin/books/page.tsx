import { BookOpen, ExternalLink, ShieldCheck, Zap } from 'lucide-react'
import { SyncButton } from './_SyncButton'

// Batteriq Books (Akaunting) runs as its own app on Railway.
// It opens in a new tab rather than an iframe: it has its own login session,
// and it refuses to be framed inside another site.
const BOOKS_URL =
  process.env.NEXT_PUBLIC_BOOKS_URL || 'https://books-production-6661ac5c.up.railway.app'

export const metadata = { title: 'Books | Batteriq Admin' }

export default function AdminBooksPage() {
  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
          <BookOpen size={22} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Books</h1>
      </div>
      <p className="text-gray-600 mb-8">
        Batteriq&apos;s accounting system: income, expenses, bank and M-Pesa accounts, customers
        and profit &amp; loss reports.
      </p>

      <a
        href={BOOKS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
      >
        Open Books <ExternalLink size={18} />
      </a>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="flex items-center gap-2 font-bold text-gray-900 mb-1">
          <Zap size={16} className="text-blue-600" /> Automatic order sync
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Every paid website order is recorded in Books as income, with the customer, the order
          number and the account the money came into (M-Pesa, Card or Cash on Delivery). It
          happens as soon as an order is paid, and again every night as a safety check.
        </p>
        <SyncButton />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 space-y-2">
        <p className="flex items-center gap-2 font-bold text-gray-900">
          <ShieldCheck size={16} className="text-green-600" /> Separate login
        </p>
        <p>
          Books has its own email and password, separate from this admin panel. Turn on
          two-factor authentication under your Books profile.
        </p>
      </div>
    </div>
  )
}
