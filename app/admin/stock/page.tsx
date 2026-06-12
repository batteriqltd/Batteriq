'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Save, Loader2, Search, Package, ArrowRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStockStatus(product: any) {
  const qty = Number(product.stock_qty)
  const threshold = Number(product.low_stock_threshold ?? 3)
  if (!product.in_stock || qty === 0) return 'out'
  if (qty <= threshold) return 'low'
  return 'ok'
}

export default function StockManagementPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')
  const [editQty, setEditQty] = useState<Record<string, string>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/stock')
      const data = await res.json()
      setProducts(data.products ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveStock(productId: string) {
    const rawQty = editQty[productId]
    if (rawQty === undefined) return
    const qty = parseInt(rawQty)
    if (isNaN(qty) || qty < 0) { showToast('Invalid quantity'); return }

    setSavingIds(prev => new Set(prev).add(productId))
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, stockQty: qty, inStock: qty > 0 }),
      })
      if (!res.ok) throw new Error('Update failed')
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: qty, in_stock: qty > 0 } : p))
      setEditQty(prev => { const n = { ...prev }; delete n[productId]; return n })
      showToast(`Stock updated to ${qty} units`)
    } catch {
      showToast('Failed to update stock')
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(productId); return n })
    }
  }

  async function quickSetStock(productId: string, inStock: boolean) {
    const qty = inStock ? 10 : 0
    setSavingIds(prev => new Set(prev).add(productId))
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, stockQty: qty, inStock }),
    })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: qty, in_stock: inStock } : p))
    setSavingIds(prev => { const n = new Set(prev); n.delete(productId); return n })
    showToast(inStock ? 'Marked as In Stock' : 'Marked as Out of Stock')
  }

  const filtered = products.filter(p => {
    const status = getStockStatus(p)
    const matchStatus = filterStatus === 'all' ? true : filterStatus === status
    const matchBrand = filterBrand === 'all' || p.brand === filterBrand
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchBrand && matchSearch
  })

  const outCount = products.filter(p => getStockStatus(p) === 'out').length
  const lowCount = products.filter(p => getStockStatus(p) === 'low').length
  const okCount = products.filter(p => getStockStatus(p) === 'ok').length

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Inventory Synchronization…</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen">

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-8 right-8 z-50 px-6 py-4 rounded-[20px] shadow-2xl text-white text-[13px] font-black border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Stock Management</p>
          <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Inventory Control</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Stock Tracking — {products.length} cataloged SKUs
          </p>
        </div>
        <div className="flex items-center gap-4">
          {outCount > 0 && (
            <div className="h-11 px-5 rounded-2xl bg-white border border-red-100 flex items-center gap-2 shadow-sm">
              <XCircle size={16} className="text-red-500" />
              <span className="text-[11px] font-black text-red-600 uppercase tracking-widest">{outCount} DEPLETED</span>
            </div>
          )}
          {lowCount > 0 && (
            <div className="h-11 px-5 rounded-2xl bg-white border border-orange-100 flex items-center gap-2 shadow-sm">
              <AlertTriangle size={16} className="text-orange-500" />
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">{lowCount} CRITICAL</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Available Stock', count: okCount, color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', icon: CheckCircle },
          { label: 'Low Threshold', count: lowCount, color: '#d97706', bg: 'rgba(217, 119, 6, 0.05)', icon: AlertTriangle },
          { label: 'Out of Stock', count: outCount, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', icon: XCircle },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: s.bg }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <p className="text-[32px] font-black text-gray-900 leading-none tracking-tight font-mono mb-1">{s.count}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px] max-w-md group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter inventory by SKU name…"
            className="w-full pl-12 pr-6 h-12 rounded-[16px] border border-gray-100 text-[14px] font-medium outline-none bg-white shadow-sm transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5"
          />
        </div>
        <div className="flex p-1.5 bg-white rounded-[20px] border border-gray-100 shadow-sm gap-1">
          {[
            { label: 'All', value: 'all' },
            { label: 'Healthy', value: 'ok' },
            { label: 'Low', value: 'low' },
            { label: 'Empty', value: 'out' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-5 py-2 rounded-[14px] text-[11px] font-black transition-all uppercase tracking-widest ${filterStatus === f.value ? 'bg-[#0000ff] text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex p-1.5 bg-white rounded-[20px] border border-gray-100 shadow-sm gap-1">
          {['all', 'EcoFlow', 'Bluetti'].map(b => (
            <button
              key={b}
              onClick={() => setFilterBrand(b)}
              className={`px-5 py-2 rounded-[14px] text-[11px] font-black transition-all uppercase tracking-widest ${filterBrand === b ? 'bg-[#00004d] text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              {b === 'all' ? 'All Brands' : b}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] overflow-hidden"
        style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Inventory Ledger</h2>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">GLOBAL STOCK ENGINE</span>
          </div>
        </div>
        <div className="overflow-x-auto w-full" style={{WebkitOverflowScrolling:"touch"}}>
          <table style={{minWidth:"800px"}} className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['SKU Identity', 'Market Price', 'Inventory Status', 'Available Units', 'Operations'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-8 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const status = getStockStatus(p)
                const isEdited = editQty[p.id] !== undefined
                const isSaving = savingIds.has(p.id)
                return (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-all cursor-default">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-lg"
                          style={{ background: p.brand === 'EcoFlow' ? 'linear-gradient(135deg,#0000ff,#00004d)' : 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}>
                          {p.brand === 'EcoFlow' ? 'EF' : 'BT'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1">{p.name}</p>
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{p.brand} · {p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[14px] font-black font-mono text-gray-900 leading-none">KES {Number(p.price_kes).toLocaleString('en-KE')}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest inline-flex border shadow-sm ${
                        status === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
                        : status === 'low' ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {status === 'ok' ? 'IN STOCK' : status === 'low' ? 'LOW STOCK' : 'OUT OF STOCK'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="number" min="0"
                            value={editQty[p.id] ?? String(p.stock_qty ?? 0)}
                            onChange={e => setEditQty(prev => ({ ...prev, [p.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveStock(p.id)}
                            className={`w-24 h-10 px-4 rounded-xl border text-[14px] font-mono font-black text-center outline-none transition-all shadow-sm ${
                              isEdited ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/5' : 'bg-gray-50 border-gray-100'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">UNITS</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => saveStock(p.id)} 
                          disabled={!isEdited || isSaving}
                          className={`h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
                            isEdited 
                              ? 'bg-[#0000ff] text-white shadow-blue-200 hover:scale-105 active:scale-95' 
                              : 'bg-gray-50 text-gray-300 border border-gray-100'
                          }`}
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Save
                        </button>
                        <div className="h-8 w-px bg-gray-100 mx-1" />
                        {p.in_stock ? (
                          <button onClick={() => quickSetStock(p.id, false)} disabled={isSaving}
                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            Deplete
                          </button>
                        ) : (
                          <button onClick={() => quickSetStock(p.id, true)} disabled={isSaving}
                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                            Restock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                        <Package size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[16px] font-black text-gray-900 tracking-tight">No stock records found</p>
                      <p className="text-sm font-medium text-gray-400 mt-1">Adjust your search or filters to see results.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}