'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl, getPrimarySpecs, formatSpecLabel, getDiscountPercent } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import type { Product } from '@/lib/supabase/types'
import { productImageAlt } from '@/lib/seo'
import { DiscountTimer } from '@/components/product/DiscountTimer'

type ProductCardProps = {
  product: Product
  showKenyaContext?: boolean
}

export function ProductCard({ product, showKenyaContext = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useUIStore((s) => s.openCart)
  const [imgError, setImgError] = useState(false)
  const [added, setAdded] = useState(false)

  const imageUrl = getProductImageUrl(product)
  const specs = getPrimarySpecs(product.specs as Record<string, string>, 3)
  const discount = getDiscountPercent(product.price_kes, product.compare_price_kes)
  const quoteOnly = !(Number(product.price_kes) > 0)

  const displayName = showKenyaContext ? `${product.name} — Kenya` : product.name
  const hasImage = !imgError && imageUrl !== '/placeholder-product.jpg'
  const productHref = product.brand === 'EcoFlow'
    ? `/ecoflow/${product.slug}`
    : product.brand === 'Bluetti'
      ? `/bluetti/${product.slug}`
      : `/accessories/${product.slug}`

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      slug: product.slug,
      price_kes: product.price_kes,
      quantity: 1,
      image: imageUrl,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    showToast(`${product.name} added to cart`, 'success')
    openCart()
  }

  return (
    <article
      className="product-card-animate group bg-white rounded-2xl border border-slate-100/80 overflow-hidden hover:border-blue-600/20 hover:shadow-ambient transition-all duration-300 flex flex-col h-full"
    >
      <Link
        href={productHref}
        className="flex flex-col flex-1"
        aria-label={`View ${product.name} details`}
      >
        {/* Image */}
        <div className="p-3 sm:p-4 pb-0">
          <div
            className="relative w-full overflow-hidden bg-slate-50/80 rounded-xl transition-colors group-hover:bg-slate-100/50"
            style={{ height: 'clamp(90px, 16vh, 230px)' }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2">
              {hasImage ? (
                <Image
                  src={imageUrl}
                  alt={productImageAlt(product)}
                  fill
                  className="object-contain object-center group-hover:scale-[1.05] transition-transform duration-700 ease-out mix-blend-multiply"
                  style={{ padding: '8px' }}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-bq-blue flex items-center justify-center shadow-blue-glow">
                    <span className="text-white font-bold text-xs tracking-tight">
                      {product.brand === 'EcoFlow' ? 'EF' : 'BT'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{product.name}</span>
                </div>
              )}
            </div>

            {/* Out of stock overlay */}
            {!product.in_stock && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
                style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(2.5px)' }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,50,0.08)', color: '#374151', border: '1px solid rgba(0,0,50,0.1)' }}>
                  Coming Soon
                </span>
              </div>
            )}

            {/* Offer badge — Jumia style */}
            {(discount > 0 || product.discount_badge) && (
              <div className="absolute top-0 left-0 z-10">
                <div
                  className="px-3 py-1.5 text-white font-black text-[11px] uppercase tracking-wider"
                  style={{
                    background: product.discount_badge?.includes('NEW') ? '#00a651' : '#cc0000',
                    borderRadius: '0 0 12px 0',
                  }}
                >
                  {product.discount_badge || `-${discount}%`}
                </div>
              </div>
            )}

            {/* Save bubble */}
            {discount > 0 && (
              <div className="absolute top-0 right-0 z-10">
                <div
                  className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-center"
                  style={{ background: '#ff6600' }}
                >
                  <span className="text-white font-black text-[9px] leading-tight">SAVE</span>
                  <span className="text-white font-black text-[11px] leading-tight">{discount}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 sm:p-4 pt-3">
          <p className="card-brand text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1">{product.brand}</p>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {displayName}
          </h2>

          {/* Specs */}
          {specs.length > 0 && (
            <div className="card-specs flex flex-wrap gap-1.5 mb-3">
              {specs.map(([key, value]) => (
                <div
                  key={key}
                  className="inline-flex items-center text-[10px] font-bold tracking-wide bg-slate-100/80 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200/40"
                  title={formatSpecLabel(key)}
                >
                  {value}
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto">
            {quoteOnly ? (
              <div>
                <span className="text-base sm:text-lg font-bold text-bq-blue tracking-tight">
                  Price on Request
                </span>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Sized &amp; quoted for your site
                </p>
              </div>
            ) : discount > 0 && product.compare_price_kes ? (
              <div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">
                  Was <span className="font-mono line-through decoration-red-600 decoration-2">{formatKES(product.compare_price_kes)}</span>
                </p>
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Now</span>
                  <span className="text-lg sm:text-xl font-bold text-red-600 font-mono tracking-tighter">
                    {formatKES(product.price_kes)}
                  </span>
                </p>
                <p className="inline-block mt-1 text-[10px] font-black uppercase tracking-wide text-white bg-red-600 rounded px-1.5 py-0.5">
                  Save {formatKES(product.compare_price_kes - product.price_kes)}
                </p>
              </div>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono tracking-tighter">
                {formatKES(product.price_kes)}
              </span>
            )}

            {/* M-Pesa installment hint for expensive products */}
            {product.in_stock && !quoteOnly && (
              <p className="card-mpesa text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/mpesa.png" alt="" className="h-3.5 w-auto object-contain inline" /> Pay via M-Pesa · Instant STK Push
              </p>
            )}

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(product as any).discount_end && (
              <div className="mt-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <DiscountTimer discountEnd={(product as any).discount_end as string} />
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* CTA */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        {quoteOnly ? (
          <Link
            href={productHref}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-bq-blue hover:bg-blue-700 shadow-sm hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center"
          >
            Request a Quote
          </Link>
        ) : product.in_stock ? (
          <button
            onClick={handleAddToCart}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all active:translate-y-0 active:scale-[0.98] ${
              added
                ? 'bg-green-500 shadow-green-200'
                : 'bg-bq-blue hover:bg-blue-700 shadow-sm hover:shadow-blue-600/20 hover:-translate-y-0.5'
            }`}
            aria-label={`Shop ${product.name}`}
          >
            {added ? '✓ Added to Cart' : 'Shop Now'}
          </button>
        ) : (
          <a
            href={`https://wa.me/254716822014?text=${encodeURIComponent(`Hi Batteriq! I am interested in "${product.name}" which is currently out of stock. Please notify me when it is available.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #f8f9ff, #eef2ff)', color: '#00004d', border: '1.5px solid #dde5ff' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notify When Available
          </a>
        )}
      </div>
    </article>
  )
}
