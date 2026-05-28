import Image from 'next/image'
import { formatKES } from '@/lib/utils'
import type { CartItem } from '@/lib/supabase/types'

type OrderSummaryProps = {
  items: CartItem[]
  subtotal: number
}

export function OrderSummary({ items, subtotal }: OrderSummaryProps) {
  const delivery = subtotal >= 50000 ? 0 : 500
  const total = subtotal + delivery

  return (
    <div className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01),0_12px_32px_-4px_rgba(15,23,42,0.03)] sticky top-6">
      <div className="px-6 py-5 border-b border-slate-50 bg-slate-900 flex items-center justify-between">
        <h2 className="font-bold text-white text-base tracking-tight">Order Summary</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/10 text-white/80 border border-white/10">
          {items.length} Item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto scrollbar-hide">
        {items.map((item) => (
          <div key={item.productId} className="flex items-start gap-4 group">
            <div className="w-14 h-14 bg-slate-50 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all duration-300 p-1">
              <Image
                src={item.image || '/placeholder-product.jpg'}
                alt={item.name}
                width={56}
                height={56}
                className="object-contain w-full h-full mix-blend-multiply"
              />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-slate-900 leading-snug truncate group-hover:text-blue-600 transition-colors">{item.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity}</p>
            </div>
            <div className="pt-0.5 text-right">
              <p className="text-sm font-bold font-mono tracking-tight text-slate-900">
                {formatKES(item.price_kes * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 pt-0 space-y-4">
        <div className="h-px bg-slate-50" />
        
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400 uppercase tracking-widest">Subtotal</span>
            <span className="text-slate-900 font-mono font-bold tracking-tight">{formatKES(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 uppercase tracking-widest">Delivery</span>
            {delivery === 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider border border-blue-100/50">
                Free Delivery
              </span>
            ) : (
              <span className="text-slate-900 font-mono font-bold tracking-tight">{formatKES(delivery)}</span>
            )}
          </div>
          {delivery > 0 && (
            <p className="text-[10px] text-slate-400 font-medium text-center bg-slate-50 rounded-lg py-2 border border-slate-100/50">
              Free delivery on orders over KES 50,000
            </p>
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">Order Total</span>
          <span className="text-2xl font-bold text-blue-600 font-mono tracking-tighter">{formatKES(total)}</span>
        </div>

        {/* Trust Strip */}
        <div className="grid grid-cols-2 gap-3 pt-6">
          {[
            { text: 'Authorised Dealer' },
            { text: 'Full Warranty' },
            { text: 'Nairobi Delivery' },
            { text: 'Nationwide Shipping' },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 border border-slate-100/50">
              <div className="w-1 h-1 rounded-full bg-blue-600 shrink-0" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
