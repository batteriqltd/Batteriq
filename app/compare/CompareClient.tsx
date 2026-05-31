'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import type { Product } from '@/lib/supabase/types'
import { X, Plus, ShoppingCart, Check, ArrowLeft } from 'lucide-react'

const MAX_COMPARE = 3

const SPEC_ROWS = [
  { key: 'capacity',       label: 'Battery Capacity',    unit: 'Wh' },
  { key: 'power_output',   label: 'AC Output Power',     unit: 'W' },
  { key: 'surge_power',    label: 'Surge Power',         unit: 'W' },
  { key: 'battery_type',   label: 'Battery Type',        unit: '' },
  { key: 'weight',         label: 'Weight',              unit: '' },
  { key: 'solar_input',    label: 'Solar Input',         unit: '' },
  { key: 'charge_time',    label: 'Charge Time (AC)',    unit: '' },
  { key: 'ac_outlets',     label: 'AC Outlets',          unit: '' },
  { key: 'usb_ports',      label: 'USB Ports',           unit: '' },
  { key: 'app_control',    label: 'App Control',         unit: '' },
  { key: 'expandable',     label: 'Expandable Battery',  unit: '' },
  { key: 'warranty',       label: 'Warranty',            unit: '' },
]

function getSpec(product: Product, key: string): string {
  const specs = (product.specs as Record<string, string>) ?? {}
  return specs[key] ?? specs[key.replace(/_/g, '')] ?? '—'
}

function isBest(products: Product[], key: string, current: Product): boolean {
  if (['capacity', 'power_output', 'surge_power'].includes(key)) {
    const nums = products.map(p => parseFloat(getSpec(p, key).replace(/[^0-9.]/g, '')))
    const max = Math.max(...nums.filter(n => !isNaN(n)))
    const mine = parseFloat(getSpec(current, key).replace(/[^0-9.]/g, ''))
    return !isNaN(mine) && mine === max && max > 0
  }
  if (key === 'weight') {
    const nums = products.map(p => parseFloat(getSpec(p, key).replace(/[^0-9.]/g, '')))
    const min = Math.min(...nums.filter(n => !isNaN(n)))
    const mine = parseFloat(getSpec(current, key).replace(/[^0-9.]/g, ''))
    return !isNaN(mine) && mine === min && min > 0
  }
  return false
}

interface CompareClientProps {
  products: Product[]
}

export function CompareClient({ products }: CompareClientProps) {
  const addItem = useCartStore(s => s.addItem)
  const openCart = useUIStore(s => s.openCart)
  const [selected, setSelected] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const filtered = useMemo(() =>
    products.filter(p =>
      !selected.find(s => s.id === p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.brand.toLowerCase().includes(search.toLowerCase()))
    ), [products, selected, search])

  function addProduct(p: Product) {
    if (selected.length >= MAX_COMPARE) return
    setSelected(prev => [...prev, p])
    setShowPicker(false)
    setSearch('')
  }

  function removeProduct(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  function handleAddToCart(product: Product) {
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      slug: product.slug,
      price_kes: product.price_kes,
      quantity: 1,
      image: getProductImageUrl(product),
    })
    showToast(`${product.name} added to cart`, 'success')
    openCart()
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8f9fa] pb-20">

        {/* Page Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Compare Power Stations</h1>
            <p className="text-gray-500 mt-2">Select up to {MAX_COMPARE} products to compare side by side</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

          {/* Product selector slots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {selected.map(product => (
              <div key={product.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative">
                <button onClick={() => removeProduct(product.id)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
                  <X size={14} />
                </button>
                <div className="aspect-square relative mb-3 bg-gray-50 rounded-xl overflow-hidden">
                  <Image src={getProductImageUrl(product)} alt={product.name} fill
                    className="object-contain p-4" sizes="200px" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{product.brand}</p>
                <p className="text-sm font-black text-gray-900 leading-tight line-clamp-2">{product.name}</p>
                <p className="text-base font-black text-[#0000ff] mt-2 font-mono">{formatKES(product.price_kes)}</p>
              </div>
            ))}

            {/* Add slot */}
            {selected.length < MAX_COMPARE && (
              <div className="relative">
                <button onClick={() => setShowPicker(!showPicker)}
                  className="w-full aspect-square sm:aspect-auto sm:h-full min-h-[160px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-2 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Plus size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-sm font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                    Add Product
                  </span>
                </button>

                {/* Picker dropdown */}
                {showPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 overflow-hidden" style={{ minWidth: '280px' }}>
                    <div className="p-3 border-b border-gray-100">
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none"
                        autoFocus />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No products found</p>
                      ) : filtered.map(p => (
                        <button key={p.id} onClick={() => addProduct(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex-shrink-0 relative overflow-hidden">
                            <Image src={getProductImageUrl(p)} alt={p.name} fill className="object-contain p-1" sizes="40px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{formatKES(p.price_kes)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison table */}
          {selected.length >= 2 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className={`grid gap-0 border-b border-gray-100`}
                style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
                <div className="p-4 bg-gray-50" />
                {selected.map(p => (
                  <div key={p.id} className="p-4 text-center border-l border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{p.brand}</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">{p.name}</p>
                  </div>
                ))}
              </div>

              {/* Price row */}
              <div className="grid border-b border-gray-50 bg-blue-50/30"
                style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
                <div className="p-4 flex items-center">
                  <span className="text-sm font-black text-gray-700">Price</span>
                </div>
                {selected.map(p => (
                  <div key={p.id} className="p-4 text-center border-l border-gray-100">
                    <p className="text-lg font-black text-[#0000ff] font-mono">{formatKES(p.price_kes)}</p>
                    {p.compare_price_kes && p.compare_price_kes > p.price_kes && (
                      <p className="text-xs text-gray-400 line-through font-mono">{formatKES(p.compare_price_kes)}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Spec rows */}
              {SPEC_ROWS.map((row, idx) => (
                <div key={row.key}
                  className={`grid border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
                  <div className="p-4 flex items-center">
                    <span className="text-sm font-bold text-gray-600">{row.label}</span>
                  </div>
                  {selected.map(p => {
                    const val = getSpec(p, row.key)
                    const best = isBest(selected, row.key, p)
                    return (
                      <div key={p.id} className="p-4 text-center border-l border-gray-100 flex items-center justify-center">
                        {val === 'Yes' || val === 'yes' ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-black text-sm">
                            <Check size={14} /> Yes
                          </span>
                        ) : val === 'No' || val === 'no' ? (
                          <span className="text-gray-400 text-sm font-bold">No</span>
                        ) : (
                          <span className={`text-sm font-bold ${best ? 'text-green-600' : 'text-gray-700'}`}>
                            {best && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 mb-0.5" />}
                            {val}{val !== '—' && row.unit ? ` ${row.unit}` : ''}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Add to cart row */}
              <div className="grid p-4 bg-gray-50/50"
                style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
                <div className="flex items-center">
                  <span className="text-sm font-black text-gray-700">Buy Now</span>
                </div>
                {selected.map(p => (
                  <div key={p.id} className="px-3 border-l border-gray-100 flex flex-col gap-2">
                    {p.in_stock ? (
                      <>
                        <button onClick={() => handleAddToCart(p)}
                          className="w-full py-3 rounded-xl bg-[#0000ff] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                          <ShoppingCart size={14} /> Add to Cart
                        </button>
                        <Link href={`/${p.brand.toLowerCase()}/${p.slug}`}
                          className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-black uppercase tracking-wider flex items-center justify-center hover:border-gray-400 transition-colors">
                          View Details
                        </Link>
                      </>
                    ) : (
                      <span className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-xs font-black uppercase tracking-wider flex items-center justify-center">
                        Out of Stock
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={28} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Select products to compare</h2>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Add at least 2 products using the slots above to see a side-by-side comparison
              </p>
            </div>
          )}

          {/* Popular comparisons */}
          <div className="mt-10">
            <h2 className="text-lg font-black text-gray-900 mb-4">Popular Comparisons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'DELTA 2 vs DELTA 3', desc: 'Our two best-selling mid-range stations', slugs: ['delta-2', 'delta-3'] },
                { label: 'RIVER 2 vs AC2P', label2: 'EcoFlow vs BLUETTI entry-level', desc: 'Best budget power station in Kenya', slugs: ['river-2', 'bluetti-ac2p'] },
                { label: 'DELTA Pro vs DELTA Pro 3', desc: 'Top-tier home backup comparison', slugs: ['delta-pro', 'delta-pro-3'] },
              ].map(({ label, desc, slugs }) => (
                <button key={label}
                  onClick={() => {
                    const prods = slugs.map(slug => products.find(p => p.slug === slug)).filter(Boolean) as Product[]
                    if (prods.length >= 2) setSelected(prods)
                  }}
                  className="text-left px-5 py-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{label}</p>
                  <p className="text-xs text-gray-400 mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
