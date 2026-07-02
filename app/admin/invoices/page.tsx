'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Plus, Trash2, Search, Download, Send, Loader2,
  User, Package, StickyNote, CheckCircle, Clock, X,
} from 'lucide-react'

interface LineItem { brand: string; name: string; quantity: number; unitPrice: number }
interface PickerProduct { id: string; brand: string; name: string; price_kes: number }
interface RecentInvoice {
  id: string; invoice_number: string; customer_name: string
  customer_email: string | null; total_kes: number; payment_status: string; created_at: string
}

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE')}`

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ brand: '', name: '', quantity: 1, unitPrice: 0 }])
  const [notes, setNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')

  const [products, setProducts] = useState<PickerProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [recent, setRecent] = useState<RecentInvoice[]>([])

  const [busy, setBusy] = useState<'' | 'download' | 'email'>('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invoices', { cache: 'no-store' })
      const data = await res.json()
      setRecent(data.invoices ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('products') as any)
        .select('id, brand, name, price_kes').order('name', { ascending: true })
      setProducts(data ?? [])
    }
    load()
    loadRecent()
  }, [supabase, loadRecent])

  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0)

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addBlankItem() { setItems(prev => [...prev, { brand: '', name: '', quantity: 1, unitPrice: 0 }]) }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }
  function addProduct(p: PickerProduct) {
    setItems(prev => {
      const blankIdx = prev.findIndex(it => !it.name.trim())
      const row = { brand: p.brand, name: p.name, quantity: 1, unitPrice: Number(p.price_kes) || 0 }
      if (blankIdx >= 0) return prev.map((it, i) => (i === blankIdx ? row : it))
      return [...prev, row]
    })
  }

  const filteredProducts = products.filter(p =>
    (p.name + ' ' + p.brand).toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 40)

  async function generate(action: 'download' | 'email') {
    if (!name.trim()) { showToast('Enter the customer name', false); return }
    const validItems = items.filter(i => i.name.trim())
    if (validItems.length === 0) { showToast('Add at least one line item', false); return }
    if (action === 'email' && !email.trim()) { showToast('Enter the customer email to send', false); return }

    setBusy(action)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name, customerEmail: email, customerPhone: phone, customerAddress: address,
          items: validItems, notes, paymentStatus, action,
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Failed', false); return }

      if (action === 'download') {
        downloadBase64Pdf(data.pdf, data.filename)
        showToast(`Invoice ${data.invoiceNumber} downloaded`)
      } else {
        showToast(`Invoice emailed to ${data.to}`)
      }
      loadRecent()
    } catch {
      showToast('Network error', false)
    } finally {
      setBusy('')
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-800'

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl font-black text-sm shadow-2xl animate-fade-in text-white ${toast.ok ? 'bg-[#00004d]' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Billing</p>
        <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none flex items-center gap-3">
          <FileText size={28} className="text-[#0000ff]" /> Create Invoice
        </h1>
        <p className="text-gray-400 text-sm mt-1.5">Generate a branded invoice for a client before they order — download it or email it instantly.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT — form */}
        <div className="xl:col-span-2 space-y-6">

          {/* Customer */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2 text-base">
              <User size={16} className="text-blue-500" /> Bill To
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Customer Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe / Acme Ltd" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="client@email.com" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, County" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-gray-900 flex items-center gap-2 text-base">
                <Package size={16} className="text-blue-500" /> Items
              </h2>
              <button onClick={addBlankItem} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black transition-colors">
                <Plus size={13} /> Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.name} onChange={e => updateItem(idx, { name: e.target.value })} placeholder="Product / description"
                    className="col-span-12 sm:col-span-5 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium" />
                  <input value={it.brand} onChange={e => updateItem(idx, { brand: e.target.value })} placeholder="Brand"
                    className="col-span-4 sm:col-span-2 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium" />
                  <input value={it.quantity} onChange={e => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} type="number" min={1} title="Qty"
                    className="col-span-3 sm:col-span-1 px-2 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-bold text-center" />
                  <input value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} type="number" min={0} placeholder="Unit price"
                    className="col-span-4 sm:col-span-2 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-right" />
                  <div className="col-span-4 sm:col-span-1 text-right text-sm font-black text-gray-900 font-mono tabular-nums whitespace-nowrap">
                    {((Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)).toLocaleString('en-KE')}
                  </div>
                  <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                    className="col-span-1 flex items-center justify-center text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes + status */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><StickyNote size={13} /> Note (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="e.g. Quotation valid for 14 days. Pay via M-Pesa to confirm."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium resize-none" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Payment status</label>
                <div className="flex gap-2">
                  {(['pending', 'paid'] as const).map(s => (
                    <button key={s} onClick={() => setPaymentStatus(s)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-black capitalize transition-all border ${paymentStatus === s ? (s === 'paid' ? 'bg-green-500 text-white border-green-500' : 'bg-amber-500 text-white border-amber-500') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {s === 'paid' ? <CheckCircle size={14} /> : <Clock size={14} />} {s}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Use <b>Pending</b> for a pre-order invoice/quote the client still needs to pay.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — quick add, summary, actions, recent */}
        <div className="space-y-6">

          {/* Quick add products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Add a product…"
                  className="flex-1 bg-transparent text-sm font-medium outline-none text-gray-700" />
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="p-5 text-center text-xs text-gray-400 font-bold">No products</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors text-left">
                  <Plus size={13} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase">{p.brand}</p>
                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                  </div>
                  <span className="text-xs font-black text-[#0000ff] font-mono flex-shrink-0">{fmt(p.price_kes)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary + actions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-400">Subtotal</span>
              <span className="text-sm font-black text-gray-700 font-mono">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
              <span className="text-base font-black text-gray-900">Total</span>
              <span className="text-2xl font-black text-[#0000ff] font-mono">{fmt(subtotal)}</span>
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={() => generate('download')} disabled={!!busy}
                className="w-full h-14 rounded-2xl bg-[#00004d] text-white font-black text-sm shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2.5">
                {busy === 'download' ? <><Loader2 size={18} className="animate-spin" /> Generating…</> : <><Download size={18} /> Download PDF</>}
              </button>
              <button onClick={() => generate('email')} disabled={!!busy}
                className="w-full h-14 rounded-2xl text-white font-black text-sm shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2.5"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
                {busy === 'email' ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : <><Send size={18} /> Email to Client</>}
              </button>
            </div>
          </div>

          {/* Recent invoices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900">Recent Invoices</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {recent.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-400 font-bold">No invoices yet</p>
              ) : recent.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 font-mono truncate">{inv.invoice_number}</p>
                    <p className="text-[11px] text-gray-400 font-bold truncate">{inv.customer_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-gray-800 font-mono">{fmt(inv.total_kes)}</p>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
