'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl, getPrimarySpecs, formatSpecLabel } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import type { Product } from '@/lib/supabase/types'
import { DiscountTimer } from '@/components/product/DiscountTimer'

type ProductCardProps = {
  product: Product
  showKenyaContext?: boolean
}

// Deterministic "viewers" based on product id so it doesn't flicker on re-render
function getViewers(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 2 + (hash % 6) // 2–7 viewers
}

export function ProductCard({ product, showKenyaContext = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useUIStore((s) => s.openCart)
  const [imgError, setImgError] = useState(false)
  const [added, setAdded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const imageUrl = getProductImageUrl(product)
  const specs = getPrimarySpecs(product.specs as Record<string, string>, 3)
  const discount = product.compare_price_kes
    ? Math.round(((product.compare_price_kes - product.price_kes) / product.compare_price_kes) * 100)
    : 0

  const displayName = showKenyaContext ? `${product.name} — Kenya` : product.name
  const hasImage = !imgError && imageUrl !== '/placeholder-product.jpg'
  const viewers = getViewers(product.id)

  // Stock urgency — show low stock for higher-priced items
  const isLowStock = product.price_kes > 50000 && product.in_stock

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
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      <Link
        href={`/${product.brand.toLowerCase()}/${product.slug}`}
        className="flex flex-col flex-1"
        aria-label={`View ${product.name} details`}
      >
        {/* Image */}
        <div className="p-3 sm:p-4 pb-0">
          <div
            className="relative w-full overflow-hidden bg-slate-50/80 rounded-xl transition-colors group-hover:bg-slate-100/50"
            style={{ paddingBottom: '100%' }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-6">
              {hasImage ? (
                <Image
                  src={imageUrl}
                  alt={`${product.brand} ${product.name} — Buy in Kenya | Batteriq`}
                  fill
                  className="object-contain object-center group-hover:scale-[1.05] transition-transform duration-700 ease-out mix-blend-multiply"
                  style={{ padding: '12px' }}
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
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-slate-900 text-white uppercase tracking-[0.1em]">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Discount badge */}
            {(discount > 0 || product.discount_badge) && (
              <div className="absolute top-3 left-3 z-10">
                <span
                  className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
                >
                  {product.discount_badge || (discount > 0 ? `-${discount}%` : '')}
                </span>
              </div>
            )}

            {/* Low stock badge */}
            {isLowStock && !discount && !product.discount_badge && (
              <div className="absolute top-3 left-3 z-10">
                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  Limited Stock
                </span>
              </div>
            )}

            {/* Viewers indicator */}
            {mounted && product.in_stock && (
              <div className="absolute bottom-3 right-3 z-10">
                <span className="text-[10px] font-bold text-slate-500 bg-white/90 backdrop-blur-sm border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  {viewers} viewing
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 sm:p-6 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">{product.brand}</p>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight line-clamp-2 mb-4 group-hover:text-blue-600 transition-colors">
            {displayName}
          </h2>

          {/* Specs */}
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
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
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono tracking-tighter">
                {formatKES(product.price_kes)}
              </span>
              {product.compare_price_kes && product.compare_price_kes > product.price_kes && (
                <span className="text-sm text-slate-400 line-through font-mono tracking-tighter opacity-70">
                  {formatKES(product.compare_price_kes)}
                </span>
              )}
            </div>

            {/* M-Pesa installment hint for expensive products */}
            {product.price_kes >= 50000 && (
              <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                <span>📱</span> Pay via M-Pesa · Instant STK Push
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
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {product.in_stock ? (
          <button
            onClick={handleAddToCart}
            className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all active:translate-y-0 active:scale-[0.98] ${
              added
                ? 'bg-green-500 shadow-green-200'
                : 'bg-bq-blue hover:bg-blue-700 shadow-sm hover:shadow-blue-600/20 hover:-translate-y-0.5'
            }`}
            aria-label={`Shop ${product.name}`}
          >
            {added ? '✓ Added to Cart' : 'Shop Now'}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200/40"
            aria-label={`${product.name} is out of stock`}
          >
            Out of Stock
          </button>
        )}
      </div>
    </article>
  )
}
