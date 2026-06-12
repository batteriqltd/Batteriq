'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ShoppingBag, ArrowRight, Shield } from 'lucide-react'
import { MpesaIcon, DeliveryIcon } from '@/components/ui/ContactIcons'
import { useCartStore, formatKES } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'

export function CartDrawer() {
  const { cartOpen, closeCart } = useUIStore()
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCartStore()

  const total = subtotal()
  const itemCount = totalItems()

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeCart}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] flex flex-col bg-white shadow-2xl shadow-black/20"
            aria-label="Shopping cart"
          >
            {/* ── Header ── */}
            <div className="bg-[#00004d] px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg leading-none">Your Cart</h2>
                  <p className="text-blue-300 text-xs mt-0.5">
                    {items.length === 0 ? 'Empty' : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Close cart"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Empty state ── */}
            {items.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-5">
                  <ShoppingBag className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Your cart is empty</h3>
                <p className="text-sm text-gray-400 mb-8 max-w-[220px]">
                  Add an EcoFlow power station or solar panel to get started.
                </p>
                <button
                  onClick={closeCart}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm"
                >
                  Browse Products
                </button>
              </div>
            )}

            {/* ── Items list ── */}
            {items.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-100 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Product image */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#fafbff] flex items-center justify-center flex-shrink-0 border border-gray-100 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={96}
                          height={96}
                          className="object-contain p-2 w-full h-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-1.5">
                          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                            <span className="text-white font-black text-sm">
                              {item.brand === 'EcoFlow' ? 'EF' : 'BT'}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-semibold">{item.brand}</span>
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                          {item.brand}
                        </p>
                        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          {formatKES(item.price_kes)} each
                        </p>
                      </div>

                      {/* Item total */}
                      <p className="text-base font-black text-[#0000ff] font-mono mt-2">
                        {formatKES(Number(item.price_kes) * item.quantity)}
                      </p>

                      {/* Quantity controls + delete */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-0.5 bg-gray-50 rounded-xl p-1 border border-gray-100">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-[#0000ff] hover:shadow-sm transition-all font-bold"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-black text-gray-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-[#0000ff] hover:shadow-sm transition-all font-bold"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Bottom summary ── */}
            {items.length > 0 && (
              <div className="flex-shrink-0 bg-white border-t border-gray-100" style={{ boxShadow: '0 -8px 24px rgba(0,0,40,0.05)' }}>

                {/* Totals */}
                <div className="px-5 py-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-medium">Subtotal</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {formatKES(total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
                      <DeliveryIcon size={15} /> Delivery
                    </span>
                    <span className="text-[10px] font-black text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
                      Calculated at checkout
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                    <span className="text-base font-black text-gray-900">Total</span>
                    <span className="text-xl font-black text-[#0000ff] font-mono">
                      {formatKES(total)}
                    </span>
                  </div>
                </div>

                {/* Checkout button */}
                <div className="px-5 pb-5">
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="flex items-center justify-center gap-2 w-full py-4 text-white font-black text-[15px] rounded-2xl text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #0000ff, #0000cc)', boxShadow: '0 8px 28px rgba(0,0,255,0.3)' }}
                  >
                    Proceed to Checkout <ArrowRight size={17} />
                  </Link>

                  {/* M-Pesa trust strip */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <MpesaIcon size={18} />
                    <span className="text-[10px] font-bold text-gray-400">Secure M-Pesa STK Push</span>
                    <span className="text-gray-200">·</span>
                    <Shield size={11} className="text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400">Official Dealer</span>
                  </div>

                  <button
                    onClick={closeCart}
                    className="w-full mt-2 py-2.5 text-[13px] font-bold text-gray-400 hover:text-[#0000ff] transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
