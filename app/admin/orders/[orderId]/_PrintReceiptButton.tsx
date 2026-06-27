'use client'

import { useState } from 'react'
import { Printer, Loader2 } from 'lucide-react'

export function PrintReceiptButton({ orderId, orderNumber }: { orderId: string; orderNumber?: string }) {
  const [loading, setLoading] = useState(false)

  async function handlePrint() {
    setLoading(true)
    try {
      // Fetch the printable invoice HTML from the export API
      const res = await fetch(`/api/admin/export?type=invoice&orderId=${orderId}`)
      if (!res.ok) throw new Error('Failed')
      const html = await res.text()

      // Open a new window with the content and trigger print
      const win = window.open('', '_blank', 'width=800,height=900')
      if (!win) {
        // Fallback: navigate directly
        window.open(`/api/admin/export?type=invoice&orderId=${orderId}`, '_blank')
        return
      }
      win.document.write(html)
      win.document.close()
      // Wait for resources to load then print
      win.onload = () => {
        setTimeout(() => {
          win.print()
          // Close after print dialog (small delay)
          setTimeout(() => win.close(), 500)
        }, 400)
      }
    } catch {
      // Fallback to direct link
      window.open(`/api/admin/export?type=invoice&orderId=${orderId}`, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      title={`Print receipt for order ${orderNumber ?? orderId}`}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : <Printer size={14} />
      }
      Print
    </button>
  )
}
