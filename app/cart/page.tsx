'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Shield, Truck, Lock } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatKES } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ToastContainer } from '@/components/ui/Toast'
import { MpesaIcon, DeliveryIcon } from '@/components/ui/ContactIcons'

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCartStore()
  const total = subtotal()

  return (
    <>
      <Header />
      <ToastContainer />
      <div className="pt-[72px] min-h-screen bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 sm:py-14">

          {/* Page header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">Shopping Cart</p>
              <h1 className="font-black text-gray-900 tracking-tight" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
                Your Cart
                {items.length > 0 && (
                  <span className="ml-3 text-base font-bold text-gray-400">
                    {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-6 bg-white rounded-[32px] border border-gray-100"
              style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.04)' }}
            >
              <div className="w-24 h-24 rounded-[28px] bg-[#f0f2ff] flex items-center justify-center">
                <ShoppingBag size={40} className="text-[#0000ff]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-400 text-sm font-medium">Browse our EcoFlow and Bluetti products to get started.</p>
              </div>
              <Link
                href="/ecoflow-kenya"
                className="inline-flex items-center gap-2 px-8 py-4 text-white font-black text-sm rounded-2xl transition-all hover:-translate-y-0.5"
                style={{ background: '#0000ff', boxShadow: '0 8px 32px rgba(0,0,255,0.25)' }}
              >
                Shop EcoFlow <ArrowRight size={18} />
              </Link>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

              {/* Cart items */}
              <div className="lg:col-span-2 space-y-4">

                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                      className="flex gap-4 sm:gap-5 bg-white rounded-[24px] p-4 sm:p-5 border border-gray-100 group hover:border-blue-100 transition-colors"
                      style={{ boxShadow: '0 2px 16px rgba(0,0,64,0.04)' }}
                    >
                      <Link href={`/${item.brand.toLowerCase()}/${item.slug ?? ''}`} className="w-24 h-24 sm:w-28 sm:h-28 bg-[#fafbff] rounded-2xl shrink-0 overflow-hidden border border-gray-50">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={112}
                            height={112}
                            className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-bq-blue-light flex items-center justify-center">
                            <span className="text-bq-blue font-black text-sm">
                              {item.brand === 'EcoFlow' ? 'EF' : 'BT'}
                            </span>
                          </div>
                        )}
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-[#0000ff] uppercase tracking-[0.15em] mb-1">{item.brand}</p>
                          <h3 className="font-bold text-gray-900 leading-snug text-sm sm:text-base line-clamp-2">{item.name}</h3>
                          <p className="font-mono font-black text-[#0000ff] mt-2 text-base sm:text-lg">
                            {formatKES(Number(item.price_kes) * item.quantity)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-gray-400 font-medium">{formatKES(Number(item.price_kes))} each</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 bg-[#f8f9fa] rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white text-gray-600 hover:text-[#0000ff] shadow-sm transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-gray-900 font-black w-9 text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white text-gray-600 hover:text-[#0000ff] shadow-sm transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-bold"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <Link
                  href="/ecoflow-kenya"
                  className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#0000ff] transition-colors pt-2"
                >
                  <ArrowLeft size={16} /> Continue Shopping
                </Link>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-[28px] p-6 sm:p-7 space-y-5 lg:sticky lg:top-[88px] border border-gray-100"
                  style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.07)' }}
                >
                  <h2 className="font-black text-gray-900 text-lg tracking-tight">Order Summary</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Subtotal</span>
                      <span className="text-gray-900 font-mono font-bold">{formatKES(subtotal())}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-medium flex items-center gap-2">
                        <DeliveryIcon size={15} /> Delivery
                      </span>
                      <span className="text-[10px] font-black text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-900">Total</span>
                      <span className="font-mono font-black text-2xl text-[#0000ff]">{formatKES(total)}</span>
                    </div>
                    <p className="text-[10px] text-gray-300 font-bold mt-1 text-right uppercase tracking-wider">VAT included</p>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full flex items-center justify-center gap-2 py-4 text-white font-black text-sm rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #0000ff 0%, #0000cc 100%)', boxShadow: '0 8px 32px rgba(0,0,255,0.3)' }}
                  >
                    Proceed to Checkout <ArrowRight size={18} />
                  </Link>

                  {/* Payment trust strip */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <MpesaIcon size={20} />
                    <span className="text-[11px] font-bold text-gray-400">Pay securely with M-Pesa STK Push</span>
                  </div>

                  {/* Trust badges */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                    {[
                      { icon: <Shield size={14} className="text-[#0000ff]" />, label: 'Official Dealer' },
                      { icon: <Truck size={14} className="text-[#0000ff]" />, label: 'Fast Delivery' },
                      { icon: <Lock size={14} className="text-[#0000ff]" />, label: 'Secure Pay' },
                    ].map(b => (
                      <div key={b.label} className="flex flex-col items-center gap-1.5 py-2">
                        <div className="w-8 h-8 rounded-xl bg-[#f0f2ff] flex items-center justify-center">{b.icon}</div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
