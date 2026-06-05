import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { formatKES, getProductImageUrl } from '@/lib/utils'
import type { Product } from '@/lib/supabase/types'

export async function OffersSection() {
  const supabase = createAdminClient()

  let offerProducts: Product[] = []
  try {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .or('discount_badge.not.is.null,discount_percent.gt.0')
      .order('discount_percent', { ascending: false })
      .limit(8)
    offerProducts = (data as Product[]) ?? []
  } catch {
    return null
  }

  if (!offerProducts.length) return null

  return (
    <section className="py-10 sm:py-14" style={{ background: 'linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a0000 100%)' }}>
      <div className="max-w-8xl mx-auto px-4 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#cc0000' }}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white font-black text-[11px] uppercase tracking-[0.2em]">Flash Sale</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
              Current Offers
            </h2>
          </div>
          <Link
            href="/power-stations"
            className="text-[11px] font-black uppercase tracking-widest transition-colors"
            style={{ color: 'rgba(255,150,150,0.8)' }}
          >
            View All →
          </Link>
        </div>

        {/* Scrollable cards row */}
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
          {offerProducts.map(product => {
            const discount = product.compare_price_kes && product.compare_price_kes > product.price_kes
              ? Math.round(((product.compare_price_kes - product.price_kes) / product.compare_price_kes) * 100)
              : 0
            const imageUrl = getProductImageUrl(product)

            return (
              <Link
                key={product.id}
                href={`/${product.brand.toLowerCase()}/${product.slug}`}
                className="flex-shrink-0 group"
                style={{ width: '180px', scrollSnapAlign: 'start' }}
              >
                <div
                  className="rounded-2xl overflow-hidden border transition-all group-hover:scale-[1.03]"
                  style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  {/* Badge */}
                  <div className="relative">
                    <div
                      className="w-full flex items-center justify-center bg-gray-50"
                      style={{ height: '140px' }}
                    >
                      {imageUrl && imageUrl !== '/placeholder-product.jpg' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-3"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 font-bold text-xs">{product.brand.slice(0, 2)}</span>
                        </div>
                      )}
                    </div>
                    {/* Offer label */}
                    {(discount > 0 || product.discount_badge) && (
                      <div
                        className="absolute top-0 left-0 px-2 py-1 text-white font-black text-[10px] uppercase tracking-wider"
                        style={{
                          background: product.discount_badge?.includes('NEW') ? '#00a651' : '#cc0000',
                          borderRadius: '0 0 8px 0',
                        }}
                      >
                        {product.discount_badge || `-${discount}%`}
                      </div>
                    )}
                    {discount > 0 && (
                      <div
                        className="absolute top-1 right-1 w-10 h-10 rounded-full flex flex-col items-center justify-center text-center"
                        style={{ background: '#ff6600' }}
                      >
                        <span className="text-white font-black text-[8px] leading-tight">SAVE</span>
                        <span className="text-white font-black text-[10px] leading-tight">{discount}%</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{product.brand}</p>
                    <p className="text-[12px] font-black text-gray-900 leading-snug line-clamp-2 mb-2">{product.name}</p>
                    <p className="text-[14px] font-black font-mono text-gray-900">{formatKES(product.price_kes)}</p>
                    {product.compare_price_kes && product.compare_price_kes > product.price_kes && (
                      <p className="text-[11px] font-mono text-gray-400 line-through">{formatKES(product.compare_price_kes)}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </section>
  )
}
