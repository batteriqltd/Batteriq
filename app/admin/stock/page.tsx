'use client'

import { Fragment, useState, useEffect, useMemo, useRef } from 'react'
import {
  AlertTriangle, CheckCircle, XCircle, Save, Loader2, Search, Package,
  X, Tag, SearchX, Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { normalize, tokenize, buildHaystack, scoreMatch } from '@/lib/productSearch'
import { Highlight } from '@/components/admin/Highlight'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Prod = any

function getStockStatus(product: Prod) {
  const qty = Number(product.stock_qty)
  const threshold = Number(product.low_stock_threshold ?? 3)
  if (!product.in_stock || qty === 0) return 'out'
  if (qty <= threshold) return 'low'
  return 'ok'
}

function fmt(n: number) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

/** Brand marks — every brand gets a badge, not just the two we ship most of. */
const BRAND_STYLE: Record<string, string> = {
  EcoFlow: 'linear-gradient(135deg,#0000ff,#00004d)',
  Bluetti: 'linear-gradient(135deg,#7c3aed,#4c1d95)',
  Anker: 'linear-gradient(135deg,#0ea5e9,#0c4a6e)',
  Soundcore: 'linear-gradient(135deg,#f97316,#7c2d12)',
  Eufy: 'linear-gradient(135deg,#10b981,#064e3b)',
  Nebula: 'linear-gradient(135deg,#ec4899,#831843)',
}

function brandStyle(brand: string) {
  return BRAND_STYLE[brand] ?? 'linear-gradient(135deg,#64748b,#1e293b)'
}

function brandMark(brand: string) {
  const b = String(brand ?? '').trim()
  if (!b) return '??'
  const parts = b.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : b.slice(0, 2)).toUpperCase()
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Prod[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [editQty, setEditQty] = useState<Record<string, string>>({})
  const [editPrice, setEditPrice] = useState<Record<string, string>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

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

  // "/" or Ctrl/Cmd+K jumps to search; Esc clears it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape' && el === searchRef.current) setSearch('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── Dirty tracking ──────────────────────────────────────────
   * A field counts as edited only when it differs from what is stored, so
   * typing a value back to its original disarms Save instead of writing a
   * no-op row to the price audit log.
   */
  function pendingQty(p: Prod): number | null {
    const raw = editQty[p.id]
    if (raw === undefined) return null
    const qty = parseInt(raw)
    if (isNaN(qty) || qty < 0 || qty === Number(p.stock_qty ?? 0)) return null
    return qty
  }

  function pendingPrice(p: Prod): number | null {
    const raw = editPrice[p.id]
    if (raw === undefined) return null
    const price = parseInt(raw)
    if (isNaN(price) || price <= 0 || price === Number(p.price_kes)) return null
    return price
  }

  async function saveRow(p: Prod) {
    const qty = pendingQty(p)
    const price = pendingPrice(p)
    if (qty === null && price === null) return

    // Guard against a fat-fingered price — a stray zero on a KES 461,799 unit
    // is the difference between a sale and a loss.
    if (price !== null) {
      const current = Number(p.price_kes)
      const swing = Math.abs(price - current) / (current || 1)
      if (swing > 0.5 && !window.confirm(
        `${p.name}\n\nPrice change of ${(swing * 100).toFixed(0)}%\n${fmt(current)}  →  ${fmt(price)}\n\nApply this to the live storefront?`
      )) return
    }

    setSavingIds(prev => new Set(prev).add(p.id))
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = { productId: p.id }
      if (qty !== null) { payload.stockQty = qty; payload.inStock = qty > 0 }
      if (price !== null) payload.priceKes = price

      const res = await fetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Update failed')

      setProducts(prev => prev.map(row => row.id !== p.id ? row : {
        ...row,
        ...(qty !== null ? { stock_qty: qty, in_stock: qty > 0 } : {}),
        ...(price !== null ? { price_kes: price } : {}),
      }))
      setEditQty(prev => { const n = { ...prev }; delete n[p.id]; return n })
      setEditPrice(prev => { const n = { ...prev }; delete n[p.id]; return n })

      const bits: string[] = []
      if (price !== null) bits.push(`price set to ${fmt(price)}`)
      if (qty !== null) bits.push(`stock set to ${qty} units`)
      showToast(`${p.name} — ${bits.join(' · ')}. Live on the storefront now.`)
    } catch {
      showToast('Update failed. Nothing was changed.')
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(p.id); return n })
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
    // Drop any half-typed quantity so the input reflects what was just written.
    setEditQty(prev => { const n = { ...prev }; delete n[productId]; return n })
    setSavingIds(prev => { const n = new Set(prev); n.delete(productId); return n })
    showToast(inStock ? 'Marked as In Stock' : 'Marked as Out of Stock')
  }

  /* ── Facets ──────────────────────────────────────────────────
   * Brands and categories are read off the catalogue, never hardcoded, so a
   * newly added brand shows up here on its own.
   */
  const brands = useMemo(() => {
    const seen = new Map<string, number>()
    for (const p of products) {
      const b = String(p.brand ?? '').trim()
      if (b) seen.set(b, (seen.get(b) ?? 0) + 1)
    }
    return Array.from(seen.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [products])

  // Categories narrow to the selected brand — picking EcoFlow should not offer
  // a category that only Soundcore stocks.
  const categories = useMemo(() => {
    const seen = new Map<string, number>()
    for (const p of products) {
      if (filterBrand !== 'all' && p.brand !== filterBrand) continue
      const c = String(p.category ?? '').trim()
      if (c) seen.set(c, (seen.get(c) ?? 0) + 1)
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products, filterBrand])

  // Switching to a brand that lacks the active category would show an empty
  // table with no obvious cause, so reset the category instead.
  useEffect(() => {
    if (filterCategory !== 'all' && !categories.some(([c]) => c === filterCategory)) {
      setFilterCategory('all')
    }
  }, [categories, filterCategory])

  const query = normalize(search)
  const tokens = tokenize(query)

  const filtered = useMemo(() => {
    const scored = products
      .filter(p => filterBrand === 'all' || p.brand === filterBrand)
      .filter(p => filterCategory === 'all' || p.category === filterCategory)
      .filter(p => filterStatus === 'all' || getStockStatus(p) === filterStatus)
      .map(p => ({ p, score: scoreMatch(buildHaystack(p), tokens, query) }))
      .filter(x => x.score > 0)

    if (tokens.length === 0) {
      return scored
        .map(x => x.p)
        .sort((a, b) =>
          String(a.category ?? '').localeCompare(String(b.category ?? '')) ||
          String(a.name ?? '').localeCompare(String(b.name ?? '')))
    }
    return scored.sort((a, b) => b.score - a.score).map(x => x.p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, filterBrand, filterCategory, filterStatus, query])

  // With no query the ledger is grouped under category headers; a search
  // flattens it so the best match is always the first row.
  const groups = useMemo(() => {
    if (tokens.length > 0) return [{ category: '', rows: filtered }]
    const map = new Map<string, Prod[]>()
    for (const p of filtered) {
      const c = String(p.category ?? 'Uncategorised')
      if (!map.has(c)) map.set(c, [])
      map.get(c)!.push(p)
    }
    return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, tokens.length])

  const outCount = products.filter(p => getStockStatus(p) === 'out').length
  const lowCount = products.filter(p => getStockStatus(p) === 'low').length
  const okCount = products.filter(p => getStockStatus(p) === 'ok').length
  const dirtyCount = products.filter(p => pendingQty(p) !== null || pendingPrice(p) !== null).length

  const filtersActive = filterBrand !== 'all' || filterCategory !== 'all' || filterStatus !== 'all' || search.trim() !== ''

  function clearFilters() {
    setFilterBrand('all')
    setFilterCategory('all')
    setFilterStatus('all')
    setSearch('')
  }

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
            className="fixed bottom-8 right-8 z-50 max-w-md px-6 py-4 rounded-[20px] shadow-2xl text-white text-[13px] font-black border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="flex-shrink-0" />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Stock &amp; Pricing</p>
          <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Inventory Control</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live stock &amp; price editing — {products.length} cataloged SKUs across {brands.length} brands
          </p>
        </div>
        <div className="flex items-center gap-4">
          {dirtyCount > 0 && (
            <div className="h-11 px-5 rounded-2xl bg-white border border-blue-100 flex items-center gap-2 shadow-sm">
              <Save size={16} className="text-blue-600" />
              <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{dirtyCount} UNSAVED</span>
            </div>
          )}
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

      {/* Ledger */}
      <div className="bg-white rounded-[32px] overflow-hidden" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>

        {/* Filter bar */}
        <div className="px-5 sm:px-8 py-6 border-b border-gray-50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Inventory &amp; Price Ledger</h2>
            <div className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-50 border border-blue-100 text-[11px] font-black uppercase tracking-widest text-blue-600">
              <Layers size={14} />
              {filtered.length} SKU{filtered.length === 1 ? '' : 's'} shown
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[260px] max-w-lg group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU, brand or category…"
                className="w-full pl-12 pr-12 h-12 rounded-[16px] border border-gray-100 text-[14px] font-medium outline-none bg-white shadow-sm transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5"
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center h-5 px-1.5 rounded-md bg-white border border-gray-200 text-[10px] font-black text-gray-300">
                  /
                </kbd>
              )}
            </div>

            {/* Stock status */}
            <div className="flex p-1.5 bg-gray-50 rounded-[16px] border border-gray-100 gap-1">
              {[
                { label: 'All', value: 'all' },
                { label: 'Healthy', value: 'ok' },
                { label: 'Low', value: 'low' },
                { label: 'Empty', value: 'out' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-4 py-1.5 rounded-[12px] text-[10px] font-black transition-all uppercase tracking-widest ${filterStatus === f.value ? 'bg-[#0000ff] text-white shadow-md shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand tabs — every brand in the catalogue, with its SKU count */}
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
            <button
              onClick={() => setFilterBrand('all')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterBrand === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All Brands <span className="text-gray-300">{products.length}</span>
            </button>
            {brands.map(([b, count]) => (
              <button
                key={b}
                onClick={() => setFilterBrand(b)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterBrand === b ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {b} <span className={filterBrand === b ? 'text-blue-300' : 'text-gray-300'}>{count}</span>
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`h-8 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                filterCategory === 'all'
                  ? 'bg-[#0000ff] text-white border-[#0000ff] shadow-md shadow-blue-100'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
              }`}
            >
              All Categories
            </button>
            {categories.map(([c, count]) => (
              <button
                key={c}
                onClick={() => setFilterCategory(filterCategory === c ? 'all' : c)}
                className={`h-8 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
                  filterCategory === c
                    ? 'bg-[#0000ff] text-white border-[#0000ff] shadow-md shadow-blue-100'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                }`}
              >
                {c}
                <span className={filterCategory === c ? 'text-white/60' : 'text-gray-300'}>{count}</span>
              </button>
            ))}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="h-8 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all flex items-center gap-1.5 ml-auto"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: '980px' }} className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['SKU Identity', 'Retail Price', 'Inventory Status', 'Available Units', 'Operations'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-6 py-5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(group => (
                <Fragment key={group.category || '__flat'}>
                  {group.category && (
                    <tr className="bg-gray-50/70">
                      <td colSpan={5} className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{group.category}</span>
                          <span className="text-[10px] font-black text-gray-300">{group.rows.length}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {group.rows.map(p => {
                    const status = getStockStatus(p)
                    const newQty = pendingQty(p)
                    const newPrice = pendingPrice(p)
                    const isDirty = newQty !== null || newPrice !== null
                    const isSaving = savingIds.has(p.id)
                    return (
                      <tr key={p.id} className={`transition-all cursor-default ${isDirty ? 'bg-blue-50/40' : 'hover:bg-blue-50/30'}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-lg"
                              style={{ background: brandStyle(p.brand) }}>
                              {brandMark(p.brand)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1 truncate max-w-[280px]" title={p.name}>
                                <Highlight text={String(p.name ?? '')} tokens={tokens} />
                              </p>
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                {p.brand} · {p.category}
                                {p.sku ? <span className="font-mono normal-case tracking-normal"> · {p.sku}</span> : null}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Editable retail price */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">KES</span>
                            <input
                              type="number" min="1" step="1"
                              value={editPrice[p.id] ?? String(p.price_kes ?? '')}
                              onChange={e => setEditPrice(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveRow(p) }}
                              aria-label={`Retail price for ${p.name}`}
                              className={`w-36 h-10 px-3 rounded-xl border text-[14px] font-mono font-black text-right outline-none transition-all shadow-sm ${
                                newPrice !== null ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/5 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-900'
                              }`}
                            />
                          </div>
                          {newPrice !== null && (
                            <p className="text-[10px] font-black text-gray-400 font-mono mt-1.5 ml-9">
                              was {fmt(Number(p.price_kes))}
                            </p>
                          )}
                          {/* A live discount is driven from the Pricing Engine — say so, so
                              nobody edits this field wondering why the storefront disagrees. */}
                          {Number(p.discount_percent) > 0 && newPrice === null && (
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1.5 ml-9">
                              −{p.discount_percent}% discount active
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest inline-flex border shadow-sm ${
                            status === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
                            : status === 'low' ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {status === 'ok' ? 'IN STOCK' : status === 'low' ? 'LOW STOCK' : 'OUT OF STOCK'}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <input
                              type="number" min="0"
                              value={editQty[p.id] ?? String(p.stock_qty ?? 0)}
                              onChange={e => setEditQty(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveRow(p) }}
                              aria-label={`Stock quantity for ${p.name}`}
                              className={`w-24 h-10 px-4 rounded-xl border text-[14px] font-mono font-black text-center outline-none transition-all shadow-sm ${
                                newQty !== null ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/5 text-blue-700' : 'bg-gray-50 border-gray-100'
                              }`}
                            />
                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">UNITS</span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => saveRow(p)}
                              disabled={!isDirty || isSaving}
                              className={`h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
                                isDirty
                                  ? 'bg-[#0000ff] text-white shadow-blue-200 hover:scale-105 active:scale-95'
                                  : 'bg-gray-50 text-gray-300 border border-gray-100 shadow-none'
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
                </Fragment>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                        {search ? <SearchX size={24} className="text-gray-300" /> : <Package size={24} className="text-gray-300" />}
                      </div>
                      <p className="text-[16px] font-black text-gray-900 tracking-tight">No stock records found</p>
                      <p className="text-sm font-medium text-gray-400 mt-1 mb-5">
                        {search
                          ? <>Nothing matched &ldquo;<span className="font-black text-gray-600">{search}</span>&rdquo;</>
                          : 'Adjust your brand, category or status filters to see results.'}
                      </p>
                      {filtersActive && (
                        <button
                          onClick={clearFilters}
                          className="h-10 px-5 rounded-xl bg-[#0000ff] text-white text-[11px] font-black uppercase tracking-widest hover:-translate-y-0.5 transition-transform shadow-lg shadow-blue-100"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 border-t border-gray-50 flex items-center gap-2">
          <Tag size={12} className="text-gray-300" />
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
            Price &amp; stock edits publish to the storefront immediately
          </span>
        </div>
      </div>
    </div>
  )
}
