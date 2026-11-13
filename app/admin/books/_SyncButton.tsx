'use client'
import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

type Summary = {
  configured: boolean
  paidOrders: number
  alreadyInBooks: number
  created: number
  failed: number
  remaining: number
  errors?: string[]
}

export function SyncButton() {
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  async function sync() {
    setBusy(true)
    setError('')
    try {
      let total: Summary | null = null
      // Large backlogs are pushed in rounds; keep going until nothing remains.
      for (let round = 0; round < 20; round++) {
        const res = await fetch('/api/cron/books-sync', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Sync failed')
        total = total
          ? { ...data, created: total.created + data.created, failed: total.failed + data.failed }
          : data
        setSummary(total)
        if (!data.remaining || data.created === 0) break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 h-11 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-bold transition-colors disabled:opacity-60"
      >
        <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Syncing orders…' : 'Sync orders now'}
      </button>

      {summary && !summary.configured && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle size={16} /> Books connection is not set up on the server yet.
        </p>
      )}

      {summary && summary.configured && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Paid orders', summary.paidOrders],
            ['Added now', summary.created],
            ['Already in Books', summary.alreadyInBooks],
            ['Failed', summary.failed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-black text-gray-900 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {summary && summary.configured && summary.failed === 0 && summary.remaining === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} /> Books is up to date with every paid order.
        </p>
      )}
      {summary?.errors && summary.errors.length > 0 && (
        <p className="mt-3 text-sm text-red-600">{summary.errors[0]}</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
