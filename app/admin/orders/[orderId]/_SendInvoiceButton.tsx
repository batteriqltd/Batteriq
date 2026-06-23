'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle } from 'lucide-react'

export function SendInvoiceButton({ orderId, email }: { orderId: string; email?: string | null }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function handleSend() {
    if (!email) { setErr('No email on this order'); return }
    setSending(true)
    setErr('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/send-invoice`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      } else {
        setErr(data.error ?? 'Failed to send')
      }
    } catch {
      setErr('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={sending || !email}
        title={email ? `Send invoice to ${email}` : 'No email on this order'}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${sent
            ? 'bg-green-500'
            : 'hover:-translate-y-0.5 active:scale-[0.97]'
          }`}
        style={sent ? {} : { background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', boxShadow: '0 4px 16px rgba(109,40,217,0.3)' }}
      >
        {sending
          ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
          : sent
          ? <><CheckCircle size={14} /> Invoice Sent!</>
          : <><Send size={14} /> Send Invoice</>
        }
      </button>
      {err && <p className="text-[11px] font-bold text-red-500">{err}</p>}
    </div>
  )
}
