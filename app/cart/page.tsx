'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatKES } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCartStore()
  const delivery = subtotal() >= 50000 ? 0 : 500
  const total = subtotal() + delivery

  return (
    <>
      <Header />
      <ToastContainer />
      <div className="pt-[72px] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
          <h1 className="font-display font-bold text-gray-900 text-3xl mb-8">Your Cart</h1>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
              <ShoppingBag size={64} className="text-gray-300" />
              <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
              <p className="text-gray-500">Browse our EcoFlow and Bluetti products to get started.</p>
              <Link
                href="/ecoflow-kenya"
                className="inline-flex items-center gap-2 px-6 py-3 bg-bq-blue text-white font-bold rounded-[8px] hover:bg-bq-blue-dim transition-colors"
              >
                Shop EcoFlow <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    className="flex gap-4 bg-white border border-gray-200 rounded-[8px] p-4 shadow-sm"
                  >
                    <div className="w-24 h-24 bg-white rounded-[6px] shrink-0 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={96}
                          height={96}
                          className="object-contain w-full h-full p-2"
                        />
                      ) : (
                        <div className="w-full h-full bg-bq-blue-light flex items-center justify-center">
                          <span className="text-bq-blue font-black text-sm">
                            {item.brand === 'EcoFlow' ? 'EF' : 'BT'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 leading-snug">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{item.brand}</p>
                      <p className="font-mono font-bold text-bq-blue mt-2">
                        {formatKES(Number(item.price_kes) * item.quantity)}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-[4px] text-gray-700 hover:border-bq-blue transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-gray-900 font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-[4px] text-gray-700 hover:border-bq-blue transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="ml-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <Link
                  href="/ecoflow-kenya"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={16} /> Continue Shopping
                </Link>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 rounded-[8px] p-6 space-y-4 sticky top-[88px] shadow-sm">
                  <h2 className="font-display font-bold text-gray-900 text-lg">Order Summary</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900 font-mono">{formatKES(subtotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery</span>
                      <span className="text-gray-900 font-mono">{delivery === 0 ? 'FREE' : formatKES(delivery)}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-mono font-bold text-xl text-bq-blue">{formatKES(total)}</span>
                    </div>
                  </div>
                  <Link
                    href="/checkout"
                    className="w-full flex items-center justify-center gap-2 py-4 bg-bq-blue text-white font-bold text-base rounded-[8px] hover:bg-bq-blue-dim hover:shadow-blue-glow transition-all"
                  >
                    Proceed to Checkout <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
