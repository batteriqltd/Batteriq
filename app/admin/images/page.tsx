'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, CheckCircle, AlertTriangle, ImageIcon, RefreshCw } from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: 'EcoFlow' | 'Bluetti'
  slug: string
  category: string
  images: string[]
  in_stock: boolean
}

function ImageCard({ product, onUploaded }: { product: Product; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentImage = product.images?.[0] || null
  const hasImage = !!currentImage

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Must be an image file')
      return
    }
    setUploading(true)
    setError('')
    setSuccess(false)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('productId', product.id)
    fd.append('brand', product.brand)
    fd.append('slug', product.slug)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setSuccess(true)
      setTimeout(() => { onUploaded() }, 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const brandColor = product.brand === 'EcoFlow'
    ? 'linear-gradient(135deg, #0000ff, #00004d)'
    : 'linear-gradient(135deg, #7c3aed, #4c1d95)'

  return (
    <div
      className={`bg-white rounded-[20px] border overflow-hidden transition-all duration-200 ${dragging ? 'border-blue-400 shadow-lg shadow-blue-100' : 'border-gray-100'}`}
      style={{ boxShadow: dragging ? undefined : '0 2px 16px rgba(0,0,64,0.05)' }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Image Preview */}
      <div className="relative h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-contain p-3"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <ImageIcon size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {hasImage ? (
            <span className="flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full text-[9px] font-black text-green-600 uppercase tracking-widest">
              <CheckCircle size={8} />
              OK
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full text-[9px] font-black text-amber-600 uppercase tracking-widest">
              <AlertTriangle size={8} />
              Missing
            </span>
          )}
        </div>

        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 bg-blue-600/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-black text-xs uppercase tracking-widest">Drop to Upload</span>
          </div>
        )}
      </div>

      {/* Info + Upload */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-white" style={{ background: brandColor }}>
            {product.brand}
          </span>
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{product.category}</span>
        </div>
        <p className="text-[12px] font-black text-gray-900 leading-tight mb-1 line-clamp-2">{product.name}</p>
        <p className="text-[10px] font-mono text-gray-400 mb-3 truncate">{product.slug}</p>

        {error && (
          <p className="text-[10px] text-red-500 font-bold mb-2">{error}</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || success}
          className={`w-full h-9 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
            ${success
              ? 'bg-green-500 text-white'
              : uploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : hasImage
              ? 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
              : 'bg-[#0000ff] text-white hover:bg-blue-700 shadow-md shadow-blue-200'
            }`}
        >
          {success ? (
            <><CheckCircle size={12} /> Saved</>
          ) : uploading ? (
            <><div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> Uploading…</>
          ) : (
            <><Upload size={12} /> {hasImage ? 'Replace Image' : 'Upload Image'}</>
          )}
        </button>

        {!hasImage && (
          <p className="text-[9px] text-gray-400 text-center mt-1.5">
            Expected: <span className="font-mono text-blue-500">/products/{product.brand.toLowerCase()}/{product.slug}.jpg</span>
          </p>
        )}
      </div>
    </div>
  )
}

export default function AdminImagesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'missing' | 'ecoflow' | 'bluetti'>('all')

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

  const missing = products.filter(p => !p.images?.length || !p.images[0])
  const visible = filter === 'missing'
    ? missing
    : filter === 'ecoflow'
    ? products.filter(p => p.brand === 'EcoFlow')
    : filter === 'bluetti'
    ? products.filter(p => p.brand === 'Bluetti')
    : products

  const tabs: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'All Products', count: products.length },
    { key: 'missing', label: 'Missing Images', count: missing.length },
    { key: 'ecoflow', label: 'EcoFlow', count: products.filter(p => p.brand === 'EcoFlow').length },
    { key: 'bluetti', label: 'Bluetti', count: products.filter(p => p.brand === 'Bluetti').length },
  ]

  return (
    <div className="p-8 pb-16 bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Product Images</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${missing.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
            {missing.length > 0
              ? `${missing.length} product${missing.length > 1 ? 's' : ''} missing images`
              : 'All products have images'}
          </p>
        </div>
        <button
          onClick={loadProducts}
          disabled={loading}
          className="flex items-center gap-2 h-11 px-5 bg-white border border-gray-100 rounded-2xl text-[12px] font-black text-gray-500 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Drag & drop hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
        <Upload size={16} className="text-blue-400 flex-shrink-0" />
        <p className="text-[12px] text-blue-600 font-bold">
          Drag & drop an image directly onto any product card, or click &ldquo;Upload Image&rdquo; to browse.
          Images are saved to <span className="font-mono">public/products/[brand]/[slug].jpg</span> and Supabase is updated automatically.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`h-9 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all
              ${filter === tab.key
                ? 'bg-[#0000ff] text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }
              ${tab.key === 'missing' && tab.count > 0 ? 'ring-1 ring-amber-300' : ''}`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
              ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading catalog…</p>
        </div>
      ) : (
        <>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200">
              <CheckCircle size={32} className="text-green-400 mb-3" />
              <p className="text-[16px] font-black text-gray-900 tracking-tight">All good!</p>
              <p className="text-sm font-medium text-gray-400 mt-1">No products missing images in this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {visible.map(p => (
                <ImageCard key={p.id} product={p} onUploaded={loadProducts} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
