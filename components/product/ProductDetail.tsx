'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, ChevronRight, ZoomIn } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl, formatSpecLabel } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import { SpecBadge } from './SpecBadge'
import { Modal } from '@/components/ui/Modal'
import type { Product } from '@/lib/supabase/types'

type ProductDetailProps = {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useUIStore((s) => s.openCart)
  const [activeImage, setActiveImage] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [qty, setQty] = useState(1)

  const images = product.images?.length > 0 ? product.images : ['/placeholder-product.jpg']
  const specs = product.specs as Record<string, string>
  const discount = product.compare_price_kes
    ? Math.round(((product.compare_price_kes - product.price_kes) / product.compare_price_kes) * 100)
    : 0

  function handleAddToCart() {
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      slug: product.slug,
      price_kes: product.price_kes,
      quantity: qty,
      image: images[0],
    })
    showToast(`${product.name} added to cart`, 'success')
    openCart()
  }

  return (
    <div className="max-w-8xl mx-auto px-4 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="breadcrumb">
          <li><Link href="/">Home</Link></li>
          <li><ChevronRight size={14} className="text-gray-400" /></li>
          <li><Link href="/ecoflow-kenya">EcoFlow Kenya</Link></li>
          <li><ChevronRight size={14} className="text-gray-400" /></li>
          <li className="text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-white rounded-[8px] overflow-hidden cursor-zoom-in" onClick={() => setZoomOpen(true)}>
            <Image
              src={images[activeImage]}
              alt={`${product.brand} ${product.name} — Buy in Kenya | Batteriq`}
              fill
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <button
              className="absolute top-4 right-4 p-2 bg-black/40 rounded-[6px] text-white hover:bg-black/60 transition-colors"
              aria-label="Zoom image"
              onClick={(e) => { e.stopPropagation(); setZoomOpen(true) }}
            >
              <ZoomIn size={18} />
            </button>
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-bq-blue text-white text-sm font-bold px-3 py-1 rounded-[4px]">
                -{discount}%
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-20 h-20 rounded-[6px] bg-white border-2 overflow-hidden transition-all ${i === activeImage ? 'border-bq-blue' : 'border-transparent'}`}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={img} alt="" width={80} height={80} className="object-contain w-full h-full p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-bq-blue uppercase tracking-widest mb-2">{product.brand}</p>
            <h1 className="font-display font-bold text-gray-900 text-3xl lg:text-4xl leading-tight">{product.name}</h1>
          </div>

          {/* Price */}
          <div>
            <p className="font-mono font-bold text-4xl text-bq-blue">{formatKES(product.price_kes)}</p>
            {product.compare_price_kes && product.compare_price_kes > product.price_kes && (
              <p className="font-mono text-lg text-gray-400 line-through mt-1">
                {formatKES(product.compare_price_kes)}
              </p>
            )}
          </div>

          {/* Key specs grid */}
          {Object.keys(specs).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(specs).slice(0, 6).map(([key, value]) => (
                <SpecBadge
                  key={key}
                  label={formatSpecLabel(key)}
                  value={String(value)}
                  highlight={['capacity', 'ac_output', 'power'].includes(key)}
                />
              ))}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-base leading-relaxed">{product.description}</p>
          )}

          {/* Quantity + Add to cart */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded-[6px] overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="px-4 py-3 text-gray-900 font-bold min-w-[50px] text-center">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {product.in_stock ? (
                <p className="text-sm font-bold text-green-600 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {product.stock_qty ? `${product.stock_qty} in stock` : 'In stock'}
                </p>
              ) : (
                <p className="text-sm font-bold text-indigo-600 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Coming Soon — Reserve Now
                </p>
              )}
            </div>

            {product.in_stock ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-3 py-4 bg-bq-blue text-white font-bold text-lg rounded-[8px] hover:bg-bq-blue-dim hover:shadow-blue-glow-lg transition-all duration-250 min-h-[56px]"
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingCart size={20} />
                ADD TO CART
              </motion.button>
            ) : (
              <div className="space-y-4">
                {/* Coming Soon badge */}
                <div className="w-full min-h-[56px] rounded-[12px] flex items-center justify-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #f8f9ff, #eef2ff)', border: '1.5px solid #dde5ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00004d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className="font-black text-[#00004d] text-sm uppercase tracking-widest">Coming Soon</span>
                </div>

                {/* Pre-order / notify card */}
                <div className="rounded-[16px] p-5 border border-[#e0e8ff]"
                  style={{ background: 'linear-gradient(135deg, #f5f8ff 0%, #edf2ff 100%)' }}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #00004d, #0000cc)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#00004d] leading-tight">This item is currently out of stock</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                        Reserve yours now — we will contact you via WhatsApp as soon as it is back in stock. No payment required to reserve.
                      </p>
                    </div>
                  </div>

                  {/* Reserve / Notify via WhatsApp */}
                  <a
                    href={`https://wa.me/254716822014?text=${encodeURIComponent(`Hi Batteriq! I would like to reserve / be notified when "${product.name}" (KES ${Number(product.price_kes).toLocaleString('en-KE')}) is back in stock. Please let me know when it is available.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[10px] text-white font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #25D366, #1da851)', boxShadow: '0 6px 18px rgba(37,211,102,0.28)' }}
                  >
                    <img src="/logos/whatsapp.png" alt="WhatsApp" width={16} height={16} className="object-contain" />
                    Reserve via WhatsApp
                  </a>

                  <p className="text-[10px] text-center text-gray-400 font-medium mt-2.5">
                    You will be contacted when stock arrives · No payment now
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2 border-t border-gray-200">
            <span>✓ Authorised Dealer</span>
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/mpesa.png" alt="M-Pesa" className="h-4 w-auto object-contain inline" /> M-Pesa Accepted
            </span>
            <span>✓ Nairobi Delivery</span>
            <span>✓ Warranty Included</span>
          </div>
        </div>
      </div>

      {/* Full specs table */}
      {Object.keys(specs).length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">Full Specifications</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 border border-gray-200 rounded-[8px] overflow-hidden">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="flex bg-white px-5 py-3.5 gap-4">
                <dt className="text-gray-500 text-sm font-medium min-w-[140px] shrink-0">
                  {formatSpecLabel(key)}
                </dt>
                <dd className="text-gray-900 text-sm font-mono">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Image zoom modal */}
      <Modal open={zoomOpen} onClose={() => setZoomOpen(false)} maxWidth="max-w-3xl">
        <div className="relative aspect-square bg-white rounded-[6px] overflow-hidden">
          <Image
            src={images[activeImage]}
            alt={product.name}
            fill
            className="object-contain p-4"
          />
        </div>
      </Modal>
    </div>
  )
}
