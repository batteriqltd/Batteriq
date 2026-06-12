'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tag, Save, AlertTriangle, Loader2, Zap, X, Clock, Trash2, TrendingUp, TrendingDown, Percent, Settings2, CheckCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminNotify } from '@/components/admin/AdminNotify'

function fmt(n: number) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

function DiscountCountdown({ end }: { end: string }) {
  const [label, setLabel] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function tick() {
      const diff = new Date(end).getTime() - Date.now()
      if (diff <= 0) { setExpired(true); return }
      const s = Math.floor(diff / 1000)
      const d = Math.floor(s / 86400)
      const h = Math.floor((s % 86400) / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      setLabel(d > 0
        ? `${d}d ${h}h`
        : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [end])

  if (expired) return <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Expired</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-500 font-mono uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-md border border-red-100 shadow-sm">
      <Clock size={10} />{label}
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DiscountModal({ product, onClose, onApplied }: { product: any; onClose: () => void; onApplied: () => void }) {
  const [pct, setPct] = useState('10')
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState('24h')
  const [customEnd, setCustomEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const originalPrice = product.compare_price_kes ?? product.price_kes
  const previewPrice = Math.round(Number(originalPrice) * (1 - parseFloat(pct || '0') / 100))

  function resolveEnd(): string | null {
    if (duration === 'custom') return customEnd || null
    const map: Record<string, number> = { '1h': 1, '3h': 3, '6h': 6, '12h': 12, '24h': 24, '48h': 48, '72h': 72 }
    const hours = map[duration]
    if (!hours) return null
    return new Date(Date.now() + hours * 3600000).toISOString()
  }

  async function apply() {
    const p = parseFloat(pct)
    if (isNaN(p) || p <= 0 || p >= 100) { setErr('Enter a discount between 1–99%'); return }
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/pricing/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          discountPercent: p,
          discountLabel: label.trim() || null,
          discountEnd: resolveEnd(),
        }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Failed'); return }
      onApplied()
      onClose()
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 bg-[#00004d]/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-[28px] rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 sm:px-8 py-5 sm:py-7 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight mb-1">Set Discount</h3>
            <p className="text-xs sm:text-sm font-bold text-blue-600 truncate">{product.name}</p>
            <p className="text-xs text-gray-400 mt-1">Current: <span className="font-black text-gray-700">{fmt(product.price_kes)}</span>{product.compare_price_kes && <span className="ml-2 line-through text-gray-300">{fmt(product.compare_price_kes)}</span>}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-8 py-5 sm:py-7 space-y-6">

          {/* Discount % presets */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Discount Percentage</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {['5', '10', '15', '20', '25', '30', '50'].map(v => (
                <button key={v} onClick={() => setPct(v)}
                  className={`h-10 px-4 rounded-xl text-sm font-black transition-all ${pct === v ? 'bg-[#0000ff] text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {v}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input type="number" value={pct} onChange={e => setPct(e.target.value)} placeholder="Custom %" min="1" max="99"
                  className="w-full h-12 px-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">%</span>
              </div>
              {!isNaN(parseFloat(pct)) && parseFloat(pct) > 0 && (
                <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-center">
                  <p className="text-[10px] text-orange-500 font-black uppercase tracking-wider">New Price</p>
                  <p className="text-base font-black text-orange-600">{fmt(previewPrice)}</p>
                  <p className="text-[10px] text-orange-400 line-through">{fmt(originalPrice)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Badge Text <span className="text-gray-300 font-medium normal-case">(optional)</span></label>
            <div className="relative">
              <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. FLASH SALE, HOT DEAL, LIMITED OFFER" maxLength={20}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Offer Duration</label>
            <div className="flex gap-2 flex-wrap">
              {['1h', '6h', '12h', '24h', '48h', '72h', 'custom'].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`h-10 px-3 sm:px-4 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${duration === d ? 'bg-[#00004d] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {d}
                </button>
              ))}
            </div>
            {duration === 'custom' && (
              <input type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="mt-3 w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            )}
          </div>

          {err && <p className="text-red-500 text-xs font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={apply} disabled={saving}
            className="w-full h-14 rounded-2xl bg-[#0000ff] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-200">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Applying...</> : <><Zap size={16} /> Apply Discount</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}


export default function PricingEnginePage() {
  const supabase = useMemo(() => createClient(), [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustPct, setAdjustPct] = useState('')
  const [filterBrand, setFilterBrand] = useState('all')
  const [toast, setToast] = useState('')
  const { notify } = useAdminNotify()
  const [applying, setApplying] = useState(false)
  const [preview, setPreview] = useState<{ id: string; newPrice: number }[]>([])
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [discountTarget, setDiscountTarget] = useState<any | null>(null)
  const [removingDiscount, setRemovingDiscount] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('sort_order', { ascending: true })
    setProducts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('pricing-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, payload => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProducts(prev => prev.map((p: any) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, load])

  function showToast(msg: string) {
    notify('success', msg)
  }

  function generatePreview() {
    const pct = parseFloat(adjustPct)
    if (isNaN(pct) || pct === 0) return
    const filtered = products.filter(p => filterBrand === 'all' || p.brand === filterBrand)
    setPreview(filtered.map(p => ({
      id: p.id,
      newPrice: Math.round(Number(p.price_kes) * (1 + pct / 100)),
    })))
  }

  async function applyBulkChange() {
    if (preview.length === 0) return
    setApplying(true)
    try {
      const res = await fetch('/api/admin/pricing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: preview.map(p => p.id), adjustPct: parseFloat(adjustPct) }),
      })
      if (!res.ok) throw new Error('Bulk update failed')
      setProducts(prev => prev.map(p => {
        const change = preview.find(c => c.id === p.id)
        return change ? { ...p, price_kes: change.newPrice } : p
      }))
      showToast(`${preview.length} products updated — prices live on storefront now`)
      setPreview([])
      setAdjustPct('')
      setEditedPrices({})
    } catch {
      showToast('Bulk update failed. Try again.')
    } finally {
      setApplying(false)
    }
  }

  async function updateSinglePrice(productId: string, newPrice: number) {
    if (isNaN(newPrice) || newPrice <= 0) return
    const res = await fetch('/api/admin/pricing/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, newPrice }),
    })
    const data = await res.json()
    if (data.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price_kes: newPrice } : p))
      showToast('Price updated')
    }
  }

  async function toggleStock(productId: string, currentStock: boolean) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_stock: !currentStock }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, in_stock: !currentStock } : p))
      showToast(!currentStock ? 'Product marked as In Stock' : 'Product marked as Out of Stock')
    }
  }

  async function removeDiscount(productId: string) {
    setRemovingDiscount(productId)
    try {
      const res = await fetch('/api/admin/pricing/discount', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (res.ok) {
        await load()
        showToast('Discount removed')
      }
    } finally {
      setRemovingDiscount(null)
    }
  }

  const filteredProducts = products.filter(p => filterBrand === 'all' || p.brand === filterBrand)
  const activeDiscounts = products.filter(p => p.discount_percent && p.discount_percent > 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen">

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-8 right-8 z-[110] px-6 py-4 rounded-[20px] shadow-2xl text-white text-[13px] font-black border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discount modal */}
      <AnimatePresence>
        {discountTarget && (
          <DiscountModal
            product={discountTarget}
            onClose={() => setDiscountTarget(null)}
            onApplied={() => { load(); showToast(`Discount applied to ${discountTarget.name}`) }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Revenue Control</p>
          <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Pricing Engine</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Global market control — {products.length} entries managed
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm text-gray-900 font-black text-[11px] uppercase tracking-widest">
            <Percent size={16} className="text-blue-600" />
            {activeDiscounts.length} ACTIVE DISCOUNTS
          </div>
        </div>
      </div>

      {/* Bulk price tool */}
      <div className="bg-white rounded-[32px] p-8 mb-8" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Settings2 size={20} />
          </div>
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Bulk Adjustment Console</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">TARGET SEGMENT</label>
            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="w-full px-5 h-14 rounded-2xl border border-gray-100 text-[14px] font-bold text-gray-900 bg-gray-50 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all appearance-none shadow-sm"
            >
              <option value="all">ALL BRANDS & CATEGORIES</option>
              <option value="EcoFlow">ECOFLOW ECOSYSTEM</option>
              <option value="Bluetti">BLUETTI ENERGY</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">VARIANCE PERCENTAGE (%)</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 font-mono font-black text-lg">
                {parseFloat(adjustPct) < 0 ? '-' : '+'}
              </div>
              <input
                type="number"
                value={adjustPct.replace('-', '')}
                onChange={e => setAdjustPct(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-6 h-14 rounded-2xl border border-gray-100 bg-gray-50 text-[16px] font-mono font-black text-gray-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 shadow-sm transition-all"
              />
            </div>
          </div>
          <div className="lg:col-span-2 flex gap-4">
            <button
              onClick={generatePreview}
              className="h-14 px-8 rounded-2xl text-[13px] font-black text-white flex-1 transition-all shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 uppercase tracking-widest"
              style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
            >
              Simulate Market Impact
            </button>
            {preview.length > 0 && (
              <button onClick={() => setPreview([])} className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shadow-sm border border-gray-100">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {preview.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-8 border-t border-gray-50 overflow-hidden"
            >
              <div className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${parseFloat(adjustPct) > 0 ? 'bg-red-500 shadow-red-100' : 'bg-green-500 shadow-green-100'}`}>
                    {parseFloat(adjustPct) > 0 ? <TrendingUp size={24} className="text-white" /> : <TrendingDown size={24} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-2">Ready for deployment?</p>
                    <p className="text-[13px] font-medium text-gray-500 uppercase tracking-widest">
                      Applying <span className={`font-black ${parseFloat(adjustPct) > 0 ? 'text-red-600' : 'text-green-600'}`}>{adjustPct}%</span> variance across <span className="font-black text-blue-600">{preview.length} active SKUs</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={applyBulkChange}
                  disabled={applying}
                  className="h-14 px-10 rounded-[18px] text-[13px] font-black text-white flex items-center gap-3 transition-all disabled:opacity-60 shadow-xl uppercase tracking-[0.15em]"
                  style={{ background: 'linear-gradient(135deg, #059669, #065f46)', boxShadow: '0 8px 32px rgba(5,150,105,0.3)' }}
                >
                  {applying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  COMMIT CHANGES TO FRONT-END
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-[32px]" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)', overflow: 'hidden' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">SKU Pricing Ledger</h2>
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
            {['all', 'EcoFlow', 'Bluetti'].map(b => (
              <button
                key={b}
                onClick={() => setFilterBrand(b)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterBrand === b ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div style={{overflowX:"auto",overflowY:"visible",WebkitOverflowScrolling:"touch",width:"100%"}}>
          <table style={{minWidth:"1100px",width:"100%"}}>
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['SKU Identity', 'Current Retail', 'Market Variance', 'Live Discount', 'Logistics', 'Operations'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-4 py-5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Scanning Catalog…</p>
                  </div>
                </td></tr>
              )}
              {filteredProducts.map(p => {
                const previewItem = preview.find(pr => pr.id === p.id)
                const editedVal = editedPrices[p.id]
                const hasDiscount = p.discount_percent && p.discount_percent > 0
                return (
                  <tr key={p.id} className={`hover:bg-blue-50/30 transition-all cursor-default ${hasDiscount ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1 truncate max-w-[240px]">{p.name}</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">{p.brand} · {p.category}</p>
                        {hasDiscount && p.discount_end && <DiscountCountdown end={p.discount_end} />}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative group/price">
                        <input
                          key={`${p.id}-${p.price_kes}`}
                          type="number"
                          defaultValue={Number(p.price_kes)}
                          onChange={e => setEditedPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onFocus={e => (e.target.style.borderColor = '#0000ff')}
                          onBlur={e => {
                            e.target.style.borderColor = '#e5e7eb'
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v > 0 && v !== Number(p.price_kes)) updateSinglePrice(p.id, v)
                          }}
                          className="w-36 h-10 px-4 rounded-xl border border-gray-100 bg-gray-50 text-[14px] font-mono font-black text-gray-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 shadow-sm transition-all"
                        />
                      </div>
                      {p.compare_price_kes && (
                        <p className="text-[10px] text-gray-300 line-through font-mono mt-1 ml-1">{fmt(p.compare_price_kes)}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {previewItem ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[14px] font-black font-mono text-orange-600 leading-none">{fmt(previewItem.newPrice)}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${parseFloat(adjustPct) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {parseFloat(adjustPct) > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(parseFloat(adjustPct))}% SHIFT
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.2em]">STABLE PRICE</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {hasDiscount ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black px-3 py-1 rounded-xl bg-red-600 text-white shadow-lg shadow-red-100 w-fit">
                            -{p.discount_percent}% OFF
                          </span>
                          {p.discount_badge && <p className="text-[9px] font-black text-red-400 uppercase tracking-widest ml-1">{p.discount_badge}</p>}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.2em]">NO CAMPAIGN</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleStock(p.id, p.in_stock)}
                        className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest transition-all border shadow-sm ${
                          p.in_stock ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}
                      >
                        {p.in_stock ? 'TRACKING' : 'SUSPENDED'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const val = parseInt(editedVal ?? String(p.price_kes))
                            if (!isNaN(val) && val > 0) updateSinglePrice(p.id, val)
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-gray-50 text-gray-400 hover:bg-[#0000ff] hover:text-white hover:shadow-lg hover:shadow-blue-200"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => setDiscountTarget(p)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-gray-50 text-gray-400 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200"
                        >
                          <Zap size={16} />
                        </button>
                        {hasDiscount && (
                          <button
                            onClick={() => removeDiscount(p.id)}
                            disabled={removingDiscount === p.id}
                            title="Remove discount and restore original price"
                            className="flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all bg-green-50 text-green-700 border border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 text-[11px] font-black whitespace-nowrap"
                          >
                            {removingDiscount === p.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <RotateCcw size={13} />}
                            <span>Restore {p.compare_price_kes ? fmt(p.compare_price_kes) : 'Original'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
