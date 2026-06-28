'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function DownloadReceiptButton({
  orderId,
  orderNumber,
}: {
  orderId: string
  orderNumber?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/download-receipt`)
      if (!res.ok) throw new Error('Failed to generate receipt')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Batteriq-Receipt-${orderNumber ?? orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Could not download receipt. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download PDF receipt to share via WhatsApp"
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      style={{
        background: loading
          ? '#15803d'
          : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        boxShadow: loading ? 'none' : '0 4px 16px rgba(22,163,74,0.3)',
      }}
    >
      {loading ? (
        <><Loader2 size={14} className="animate-spin" /> Generating...</>
      ) : (
        <><Download size={14} /> Download PDF</>
      )}
    </button>
  )
}
