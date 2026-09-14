'use client'

import { useState } from 'react'
import { Smartphone, Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react'

export function PromptForm() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ phone: string; amount: number; customerMessage: string; checkoutRequestId: string } | null>(null)
  const [error, setError] = useState('')

  const validPhone = phone.replace(/\D/g, '').length >= 9
  const validAmount = Number(amount) >= 1
  const canSubmit = validPhone && validAmount && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/mpesa/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, amount: Number(amount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send prompt')
      setSuccess({ phone: data.phone ?? phone, amount: data.amount ?? Number(amount), customerMessage: data.customerMessage ?? 'STK Push sent. Customer will receive a prompt.', checkoutRequestId: data.checkoutRequestId ?? '' })
      setPhone('')
      setAmount('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Card */}
      <div className="bg-white rounded-[32px] overflow-hidden" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #00004d 0%, #1e3a8a 100%)' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
            <Smartphone size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-white tracking-tight">Prompt Client — M-Pesa STK Push</h2>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Enter phone & amount → customer gets PIN prompt</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Client Phone</label>
              <div className="relative group">
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  inputMode="tel"
                  autoComplete="tel"
                  className={`w-full h-12 pl-11 pr-4 rounded-[16px] text-[14px] font-medium outline-none border-2 transition-all ${validPhone ? 'bg-green-50/50 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10' : 'bg-white border-gray-100 focus:border-[#0000ff] focus:ring-4 focus:ring-blue-500/10'}`}
                />
                <Smartphone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${validPhone ? 'text-green-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 ml-1">Accepts 07..., 01..., 2547... — we normalise automatically.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Amount — KES</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-400">KES</span>
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="5000"
                  inputMode="numeric"
                  className={`w-full h-12 pl-14 pr-4 rounded-[16px] text-[14px] font-black font-mono outline-none border-2 transition-all ${validAmount ? 'bg-green-50/50 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10' : 'bg-white border-gray-100 focus:border-[#0000ff] focus:ring-4 focus:ring-blue-500/10'}`}
                />
              </div>
              <p className="text-[11px] font-medium text-gray-400 ml-1">Whole shillings, 1 — 500,000.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] font-bold text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-green-800">Prompt sent to {success.phone}</p>
                  <p className="text-[12px] font-bold text-green-700 mt-1">KES {Number(success.amount).toLocaleString('en-KE')} — {success.customerMessage}</p>
                  {success.checkoutRequestId && <p className="text-[10px] font-mono font-bold text-green-600 mt-2 break-all">ID: {success.checkoutRequestId}</p>}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-[16px] text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            style={{ background: canSubmit ? 'linear-gradient(135deg, #0000ff, #00004d)' : '#e5e7eb', color: canSubmit ? 'white' : '#9ca3af', boxShadow: canSubmit ? '0 8px 24px rgba(0,0,255,0.25)' : 'none' }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending prompt...</> : <><Send size={16} /> Send M-Pesa Prompt</>}
          </button>

          <p className="text-center text-[11px] font-medium text-gray-400 leading-relaxed">Customer sees <span className="font-bold text-gray-600">BATTERIQ</span> on their phone and enters PIN to pay. No order creation — standalone Daraja push.</p>
        </form>
      </div>

      {/* Help card — same design */}
      <div className="mt-6 bg-white rounded-[24px] p-6 border border-gray-100" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">How it works</p>
        <ol className="space-y-1.5 text-[12px] font-medium text-gray-600 list-decimal list-inside">
          <li>Client ordered offline (call/WhatsApp/showroom) — no website checkout.</li>
          <li>You enter their M-Pesa number + agreed KES amount.</li>
          <li>Tap <span className="font-black text-gray-900">Send M-Pesa Prompt</span> — Safaricom pushes STK to their handset instantly.</li>
          <li>They enter PIN → you see funds at till <span className="font-mono font-black">4575142</span> and callback updates.</li>
        </ol>
      </div>
    </div>
  )
}
