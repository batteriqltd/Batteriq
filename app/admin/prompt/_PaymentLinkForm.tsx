'use client'

import { useState } from 'react'
import { AlertCircle, Check, Copy, CreditCard, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { calculateCardFee, formatKesExact, parsePaymentLinkAmount, PAYMENT_LINK_MAX_KES, PAYMENT_LINK_MIN_KES } from '@/lib/cardFee'

type LinkResult = {
  authorizationUrl: string
  orderId: string
  orderNumber: string
  subtotalKes: number
  cardFeeKes: number
  totalChargedKes: number
}

export function PaymentLinkForm() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LinkResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const validAmount = parsePaymentLinkAmount(amount) !== null
  const canSubmit = validAmount && !loading
  const preview = validAmount ? calculateCardFee(amount) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)
    try {
      const res = await fetch('/api/admin/paystack/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create the link')
      setResult(data)
      setAmount('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.authorizationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy automatically. Select the link and copy it.')
    }
  }

  const whatsappUrl = result
    ? `https://wa.me/?text=${encodeURIComponent(
        `Batteriq card payment of ${formatKesExact(result.totalChargedKes)} (order ${result.orderNumber}). Pay securely here: ${result.authorizationUrl}`
      )}`
    : ''

  return (
    <div className="max-w-2xl mt-6">
      <div className="bg-white rounded-[32px] overflow-hidden" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #00004d 0%, #1e3a8a 100%)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
            <CreditCard size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-white tracking-tight">Card Payment Link</h2>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Enter amount → share link → client pays by card</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="payment-link-amount" className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Amount — KES</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-400">KES</span>
              <input
                id="payment-link-amount"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="140800"
                inputMode="numeric"
                className={`w-full h-12 pl-14 pr-4 rounded-[16px] text-[14px] font-black font-mono outline-none border-2 transition-all ${validAmount ? 'bg-green-50/50 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10' : 'bg-white border-gray-100 focus:border-[#0000ff] focus:ring-4 focus:ring-blue-500/10'}`}
              />
            </div>
            <p className="text-[11px] font-medium text-gray-400 ml-1">
              {preview
                ? `Client pays ${formatKesExact(preview.totalChargedKes)}: ${formatKesExact(preview.subtotalKes)} + ${formatKesExact(preview.feeKes)} card fee (${preview.ratePercentLabel}).`
                : `Whole shillings, ${PAYMENT_LINK_MIN_KES} to ${PAYMENT_LINK_MAX_KES.toLocaleString('en-KE')}. The card fee is added on top.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] font-bold text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-[13px] font-black text-green-800">Link ready: client pays {formatKesExact(result.totalChargedKes)}</p>
                <a href={`/admin/orders/${result.orderId}`} className="text-[12px] font-bold text-green-700 underline mt-1 inline-block">Order {result.orderNumber}</a>
              </div>
              <p className="text-[12px] font-mono font-bold text-green-900 break-all bg-white rounded-xl px-3 py-2 border border-green-100">{result.authorizationUrl}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={copyLink} className="h-11 rounded-[14px] text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors">
                  {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
                </button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="h-11 rounded-[14px] text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-white text-green-700 border-2 border-green-200 hover:border-green-400 transition-colors">
                  <ExternalLink size={15} /> Share on WhatsApp
                </a>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-[16px] text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            style={{ background: canSubmit ? 'linear-gradient(135deg, #0000ff, #00004d)' : '#e5e7eb', color: canSubmit ? 'white' : '#9ca3af', boxShadow: canSubmit ? '0 8px 24px rgba(0,0,255,0.25)' : 'none' }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating link...</> : <><Link2 size={16} /> Generate Payment Link</>}
          </button>

          <p className="text-center text-[11px] font-medium text-gray-400 leading-relaxed">Each link creates a pending order in Orders. The receipt goes to sales@batteriq.com, so forward it to the client.</p>
        </form>
      </div>
    </div>
  )
}
