'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

export function MarkPaidButton({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleMarkPaid() {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', fulfillment_status: 'processing' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to update')
      // also try list endpoint for broader compatibility
      fetch(`/api/admin/orders/list`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, payment_status: 'paid', fulfillment_status: 'processing' }),
      }).catch(() => {})
      router.refresh()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <div className="pt-3 border-t border-gray-100">
        {err && <p className="text-xs font-bold text-red-600 mb-2">{err}</p>}
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}
        >
          <CheckCircle size={14} />
          Mark as Paid — Offline
        </button>
        <p className="text-[10px] font-medium text-gray-400 mt-2 text-center leading-relaxed">For clients who paid offline (Paybill / Till / Cash). Updates invoice, receipt & timeline.</p>
      </div>
    )
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-900 mb-2">Confirm offline payment?</p>
      <p className="text-[11px] font-medium text-gray-500 mb-3 leading-relaxed">This will set payment to <span className="font-black text-green-700">PAID</span> and move fulfillment to Processing. Receipt & invoice will show as paid.</p>
      {err && <p className="text-xs font-bold text-red-600 mb-2">{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setConfirming(false); setErr('') }}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleMarkPaid}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: loading ? '#065f46' : 'linear-gradient(135deg, #059669, #047857)' }}
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : <><CheckCircle size={14} /> Confirm Paid</>}
        </button>
      </div>
    </div>
  )
}
