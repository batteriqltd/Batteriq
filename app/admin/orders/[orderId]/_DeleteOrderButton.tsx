'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

export function DeleteOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setErr('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete order')
      router.push('/admin/orders')
      router.refresh()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong'
      setErr(message)
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6" style={{ boxShadow: '0 1px 8px rgba(220,38,38,0.08)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Delete this order?</h3>
            <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">
              Order <span className="font-mono font-bold text-gray-900">{orderNumber}</span> will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        {err && <p className="text-xs font-bold text-red-600 mb-3">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => { setConfirming(false); setErr('') }}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: deleting ? '#991b1b' : 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: deleting ? 'none' : '0 4px 16px rgba(220,38,38,0.3)' }}
          >
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : <><Trash2 size={14} /> Delete Order</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
      <h3 className="font-black text-gray-900 mb-1">Danger Zone</h3>
      <p className="text-xs font-medium text-gray-400 mb-4">Permanently delete this single order. Other orders are not affected.</p>
      {err && <p className="text-xs font-bold text-red-600 mb-3">{err}</p>}
      <button
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-white border-2 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all"
      >
        <Trash2 size={16} />
        Delete Order
      </button>
    </div>
  )
}
