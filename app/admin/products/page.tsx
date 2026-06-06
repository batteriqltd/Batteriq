'use client'
import { useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Edit3, Save, X, ImageIcon, Zap, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Product Edit Row (existing) ────────────────────────────────────────────

function ProductEditRow({ product, onSave }: { product: any; onSave: () => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(product.price_kes))
  const [imageUrl, setImageUrl] = useState(product.featured_image || product.images?.[0] || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(''); setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('productId', product.id)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setImageUrl(data.url)
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 3000)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Try again.')
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_kes: Number(price), featured_image: imageUrl || undefined }),
    })
    setSaving(false); setEditing(false); onSave()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-5">
        <div className="w-[56px] h-[56px] rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 shadow-sm transition-transform hover:scale-110">
          {(product.featured_image || product.images?.[0]) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.featured_image || product.images?.[0]} alt={product.name} className="w-full h-full object-contain p-1.5" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[#00004d] text-[10px] font-black uppercase tracking-widest">
              {product.brand?.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-sm"
              style={{ background: product.brand === 'EcoFlow' ? 'linear-gradient(135deg, #0000ff, #00004d)' : 'linear-gradient(135deg, #7c3aed, #4c1d95)', color: '#ffffff' }}>
              {product.brand}
            </span>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{product.category}</span>
          </div>
          <p className="text-[15px] font-black text-gray-900 truncate tracking-tight">{product.name}</p>
          <p className="text-[13px] text-blue-600 font-mono font-black mt-1">KES {Number(product.price_kes).toLocaleString('en-KE')}</p>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            {product.in_stock ? (
              <span className="flex items-center justify-end gap-1.5 text-green-600 text-[11px] font-black uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {product.stock_qty != null ? `${product.stock_qty} IN STOCK` : 'IN STOCK'}
              </span>
            ) : (
              <span className="flex items-center justify-end gap-1.5 text-red-500 text-[11px] font-black uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                OUT OF STOCK
              </span>
            )}
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">INVENTORY STATUS</p>
          </div>
          <button onClick={() => setEditing(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-gray-50 text-gray-400 hover:bg-[#0000ff] hover:text-white hover:shadow-lg hover:shadow-blue-200">
            <Edit3 size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50/50 rounded-[28px] p-6 border border-blue-100 shadow-inner">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} className="text-blue-600" /> Quick Editor
        </h3>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block ml-1">RETAIL PRICE (KES)</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm font-black">KES</div>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full pl-14 pr-6 h-12 rounded-2xl border border-gray-100 text-sm font-mono font-black focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 shadow-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block ml-1">FEATURED IMAGE ASSET</label>
          <div className="relative">
            <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://... or upload below"
              className="w-full pl-12 pr-6 h-12 rounded-2xl border border-gray-100 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 shadow-sm" />
          </div>
          <div className="relative">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" disabled={uploading} />
            <div className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed transition-all"
              style={{ borderColor: uploading ? '#93c5fd' : uploadProgress === 100 ? '#86efac' : '#e5e7eb', background: uploading ? '#eff6ff' : uploadProgress === 100 ? '#f0fdf4' : '#fafafa' }}>
              {uploading ? (
                <><svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span className="text-xs font-black text-blue-600">Uploading...</span></>
              ) : uploadProgress === 100 ? (
                <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg><span className="text-xs font-black text-green-600">Uploaded successfully</span></>
              ) : (
                <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span className="text-xs font-black text-gray-500">Tap to upload from device</span><span className="text-[10px] text-gray-400">JPG, PNG, WebP · Max 5MB</span></>
              )}
            </div>
          </div>
          {imageUrl && (
            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Preview" className="w-full h-full object-contain p-2" onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>
          )}
          {uploadError && <p className="text-xs text-red-500 font-black">{uploadError}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-blue-100">
        <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{product.name.slice(0, 40)}...</p>
        <div className="flex gap-3">
          <button onClick={() => setEditing(false)}
            className="h-11 px-6 bg-white text-gray-400 text-xs font-black rounded-xl border border-gray-100 hover:bg-gray-50 transition-all uppercase tracking-widest">
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-11 px-8 bg-[#0000ff] text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-blue-200 uppercase tracking-widest">
            {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add New Product Form ────────────────────────────────────────────────────

const BRANDS = ['EcoFlow', 'Bluetti'] as const
const CATEGORIES = ['Power Stations', 'Solar Panels', 'Accessories', 'Batteries', 'Appliances', 'Solar Home Systems', 'Power Banks'] as const

interface SpecRow { key: string; value: string }

interface NewProductData {
  brand: string; category: string; name: string; sku: string
  description: string; price_kes: string; compare_price_kes: string
  discount_badge: string; in_stock: boolean; featured: boolean
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-3 group">
      <div className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-[#0000ff]' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-[12px] font-black text-gray-700 uppercase tracking-widest">{label}</span>
    </button>
  )
}

function AddProductForm({ onSuccess }: { onSuccess: () => void }) {
  const [data, setData] = useState<NewProductData>({
    brand: 'EcoFlow', category: 'Power Stations', name: '', sku: '',
    description: '', price_kes: '', compare_price_kes: '',
    discount_badge: '', in_stock: true, featured: false,
  })
  const [specs, setSpecs] = useState<SpecRow[]>([{ key: '', value: '' }])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function set(field: keyof NewProductData, value: string | boolean) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function addSpec() { setSpecs(prev => [...prev, { key: '', value: '' }]) }
  function removeSpec(i: number) { setSpecs(prev => prev.filter((_, idx) => idx !== i)) }
  function updateSpec(i: number, field: 'key' | 'value', value: string) {
    setSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.name.trim()) { setError('Product name is required'); return }
    if (!data.price_kes) { setError('Price is required'); return }
    setSubmitting(true); setError(''); setSuccess('')

    // Convert specs array to object
    const specsObj: Record<string, string> = {}
    specs.forEach(s => { if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim() })

    const createRes = await fetch('/api/admin/products/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, specs: specsObj }),
    })
    const createData = await createRes.json()

    if (!createRes.ok || !createData.product) {
      setError(createData.error ?? 'Failed to create product')
      setSubmitting(false)
      return
    }

    // Upload image if selected
    if (imageFile && createData.product.id) {
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('productId', createData.product.id)
      await fetch('/api/admin/upload', { method: 'POST', body: formData }).catch(() => {})
    }

    setSuccess(`"${data.name}" created successfully!`)
    setData({ brand: 'EcoFlow', category: 'Power Stations', name: '', sku: '', description: '', price_kes: '', compare_price_kes: '', discount_badge: '', in_stock: true, featured: false })
    setSpecs([{ key: '', value: '' }])
    setImageFile(null); setImagePreview('')
    setSubmitting(false)
    onSuccess()
  }

  const inputCls = "w-full px-4 h-11 rounded-[14px] border border-gray-200 text-[14px] font-medium outline-none bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/8 transition-all"
  const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[28px] border border-blue-100 p-8 mb-8" style={{ boxShadow: '0 4px 32px rgba(0,0,255,0.08)' }}>

      {/* Row 1 — Brand + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className={labelCls}>Brand *</label>
          <select value={data.brand} onChange={e => set('brand', e.target.value)} className={inputCls}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category *</label>
          <select value={data.category} onChange={e => set('category', e.target.value)} className={inputCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2 — Name + SKU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className={labelCls}>Product Name *</label>
          <input value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. EcoFlow DELTA 2 Max" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>SKU</label>
          <input value={data.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. EF-DELTA2MAX" className={inputCls} />
        </div>
      </div>

      {/* Row 3 — Description */}
      <div className="mb-5">
        <label className={labelCls}>Description</label>
        <textarea value={data.description} onChange={e => set('description', e.target.value)} rows={3}
          placeholder="Product description..."
          className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] font-medium outline-none bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/8 transition-all resize-none" />
      </div>

      {/* Row 4 — Prices + Badge */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <div>
          <label className={labelCls}>Price KES *</label>
          <input type="number" value={data.price_kes} onChange={e => set('price_kes', e.target.value)} placeholder="e.g. 89000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Compare Price KES</label>
          <input type="number" value={data.compare_price_kes} onChange={e => set('compare_price_kes', e.target.value)} placeholder="Original price" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Discount Badge</label>
          <input value={data.discount_badge} onChange={e => set('discount_badge', e.target.value)} placeholder="e.g. HOT DEAL" className={inputCls} />
        </div>
      </div>

      {/* Row 5 — Toggles + Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
        <div className="flex flex-col gap-4 justify-center">
          <Toggle on={data.in_stock} onChange={v => set('in_stock', v)} label="In Stock" />
          <Toggle on={data.featured} onChange={v => set('featured', v)} label="Featured" />
        </div>
        <div>
          <label className={labelCls}>Product Image (JPG, PNG, WebP · Max 5MB)</label>
          <div className="relative">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
            <div className="flex items-center justify-center gap-2 w-full py-3 rounded-[14px] border-2 border-dashed border-gray-200 bg-gray-50 hover:border-blue-400 transition-colors">
              <ImageIcon size={14} className="text-gray-400" />
              <span className="text-xs font-black text-gray-500">{imageFile ? imageFile.name : 'Click to select image'}</span>
            </div>
          </div>
          {imagePreview && (
            <div className="mt-2 w-full h-24 rounded-[12px] overflow-hidden border border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
            </div>
          )}
        </div>
      </div>

      {/* Row 6 — Specs */}
      <div className="mb-6">
        <label className={labelCls}>Technical Specs (key-value pairs)</label>
        <div className="space-y-2">
          {specs.map((spec, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={spec.key} onChange={e => updateSpec(i, 'key', e.target.value)} placeholder="e.g. Capacity"
                className="flex-1 px-4 h-10 rounded-[12px] border border-gray-200 text-[13px] font-medium outline-none focus:border-blue-500 transition-all" />
              <input value={spec.value} onChange={e => updateSpec(i, 'value', e.target.value)} placeholder="e.g. 2048Wh"
                className="flex-1 px-4 h-10 rounded-[12px] border border-gray-200 text-[13px] font-medium outline-none focus:border-blue-500 transition-all" />
              <button type="button" onClick={() => removeSpec(i)} disabled={specs.length === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addSpec}
          className="mt-2 flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
          <Plus size={12} /> Add Spec
        </button>
      </div>

      {/* Status messages */}
      {error && <p className="mb-4 text-sm font-black text-red-600 bg-red-50 rounded-[12px] px-4 py-3">{error}</p>}
      {success && <p className="mb-4 text-sm font-black text-green-600 bg-green-50 rounded-[12px] px-4 py-3">✓ {success}</p>}

      {/* Submit */}
      <div className="flex justify-end">
        <button type="submit" disabled={submitting}
          className="h-12 px-10 bg-[#0000ff] text-white text-xs font-black rounded-[14px] hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-blue-200 uppercase tracking-widest">
          {submitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
          {submitting ? 'Creating...' : 'Create Product →'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  const ecoflowCount = products.filter(p => p.brand === 'EcoFlow').length
  const bluettiCount = products.filter(p => p.brand === 'Bluetti').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 bg-[#f8f9fa] min-h-full">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Catalog Inventory</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Managing {products.length} products in stock
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 h-12 rounded-2xl border border-gray-100 flex items-center shadow-sm">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#0000ff]" />
              ECOFLOW: <span className="text-gray-900">{ecoflowCount}</span>
            </p>
          </div>
          <div className="bg-white px-6 h-12 rounded-2xl border border-gray-100 flex items-center shadow-sm">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
              BLUETTI: <span className="text-gray-900">{bluettiCount}</span>
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="h-12 px-6 rounded-2xl flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
            style={{ background: showForm ? '#e5e7eb' : '#0000ff', color: showForm ? '#374151' : '#ffffff', boxShadow: showForm ? 'none' : '0 4px 16px rgba(0,0,255,0.3)' }}
          >
            {showForm ? <><ChevronUp size={14} /> Close Form</> : <><Plus size={14} /> Add New Product</>}
          </button>
        </div>
      </div>

      {showForm && <AddProductForm onSuccess={loadProducts} />}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Accessing Catalog Database…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-[24px] border border-gray-100 overflow-hidden px-6 py-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 group"
              style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <ProductEditRow product={p} onSave={loadProducts} />
            </div>
          ))}
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                <ImageIcon size={24} className="text-gray-300" />
              </div>
              <p className="text-[16px] font-black text-gray-900 tracking-tight">No products listed</p>
              <p className="text-sm font-medium text-gray-400 mt-1">Use the Add New Product button above to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
