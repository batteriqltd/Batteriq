'use client'
import { useState } from 'react'
import { Search, Package, Truck, CheckCircle, Clock, MapPin, Loader2, AlertCircle, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
interface TrackedOrder {
  orderNumber: string
  fulfillmentStatus: string
  paymentStatus: string
  paymentMethod: string
  items: Array<{ brand?: string; name: string; quantity: number; price_kes: number | string }>
  totalKes: number
  createdAt: string
  updatedAt: string
  customerName: string
  deliveryAddress: Record<string, string> | null
  mpesaRef?: string
}

function formatKES(amount: number | string) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STEPS = [
  { key: 'unfulfilled', label: 'Order Placed', icon: ShoppingBag, desc: 'We received your order' },
  { key: 'processing', label: 'Processing', icon: Clock, desc: 'Preparing your items' },
  { key: 'shipped', label: 'On the Way', icon: Truck, desc: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, desc: 'Order complete' },
]

function getStepIndex(status: string): number {
  const map: Record<string, number> = { unfulfilled: 0, processing: 1, shipped: 2, delivered: 3 }
  return map[status] ?? 0
}

function paymentLabel(method: string) {
  const map: Record<string, string> = {
    mpesa_now: 'M-Pesa (Pay Now)',
    cod_cash: 'Cash on Delivery',
    cod_mpesa: 'M-Pesa at Doorstep',
  }
  return map[method] ?? method
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    if (!orderNumber.trim() || !email.trim()) {
      setError('Please enter both your order number and email address.')
      return
    }
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.found) {
        setError(data.error ?? 'Order not found. Please check your details and try again.')
      } else {
        setOrder(data.order)
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? getStepIndex(order.fulfillmentStatus) : 0

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-[72px]">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #00004d 0%, #0000cc 100%)' }} className="py-10 sm:py-16 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 border border-white/20 bg-white/10 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Order Tracking</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.03em' }}>
              Track Your Order
            </h1>
            <p className="text-blue-200 text-sm">
              Enter your order number and email to see real-time status. No account needed.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

          {/* Search form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8"
            style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.06)' }}>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Order Number
                </label>
                <input
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. BQ-20250520-1234"
                  className="w-full px-5 py-4 rounded-2xl text-gray-900 font-mono font-bold placeholder-gray-300 outline-none transition-all"
                  style={{ background: '#f8faff', border: '1.5px solid #e0e7ff', fontSize: '0.95rem' }}
                  onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.08)'; e.target.style.background = 'white' }}
                  onBlur={e => { e.target.style.borderColor = '#e0e7ff'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff' }}
                />
                <p className="text-xs text-gray-400 mt-1.5">Found in your order confirmation email</p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="The email you used at checkout"
                  className="w-full px-5 py-4 rounded-2xl text-gray-900 placeholder-gray-300 outline-none transition-all"
                  style={{ background: '#f8faff', border: '1.5px solid #e0e7ff', fontSize: '0.95rem' }}
                  onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.08)'; e.target.style.background = 'white' }}
                  onBlur={e => { e.target.style.borderColor = '#e0e7ff'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff' }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-black text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)', boxShadow: '0 8px 28px rgba(0,0,255,0.25)' }}
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Searching...</>
                  : <><Search className="w-5 h-5" /> Track Order</>
                }
              </button>
            </form>
          </div>

          {/* Results */}
          <AnimatePresence>
            {order && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Order header */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                  style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.06)' }}>
                  <div style={{ background: 'linear-gradient(135deg, #00004d 0%, #000080 100%)' }} className="px-7 py-5">
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Order</p>
                    <p className="text-white font-black text-2xl font-mono">{order.orderNumber}</p>
                    <p className="text-blue-300 text-xs mt-1">Placed {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="px-7 py-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 'Pending Payment'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{paymentLabel(order.paymentMethod)}</p>
                      {order.mpesaRef && <p className="text-xs font-mono text-gray-500 mt-0.5">Ref: {order.mpesaRef}</p>}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Order Total</p>
                      <p className="text-xl font-black font-mono" style={{ color: '#0000ff' }}>{formatKES(order.totalKes)}</p>
                    </div>
                  </div>
                </div>

                {/* Status tracker */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7"
                  style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.06)' }}>
                  <p className="text-sm font-black text-gray-900 mb-6">Delivery Status</p>
                  <div className="relative">
                    <div className="absolute top-4 sm:top-5 left-4 sm:left-5 right-4 sm:right-5 h-0.5 bg-gray-100" style={{ zIndex: 0 }} />
                    <div
                      className="absolute top-4 sm:top-5 left-4 sm:left-5 h-0.5 transition-all duration-700"
                      style={{
                        background: 'linear-gradient(90deg, #0000ff, #00004d)',
                        width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                        maxWidth: 'calc(100% - 32px)',
                        zIndex: 1,
                      }}
                    />
                    <div className="flex justify-between relative" style={{ zIndex: 2 }}>
                      {STEPS.map((step, i) => {
                        const isComplete = i <= currentStep
                        const isCurrent = i === currentStep
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1.5 sm:gap-2" style={{ width: '25%' }}>
                            <div
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                isComplete ? 'border-blue-600 text-white' : 'border-gray-200 bg-white text-gray-300'
                              }`}
                              style={isComplete ? { background: 'linear-gradient(135deg, #0000ff, #00004d)' } : {}}
                            >
                              <step.icon size={14} />
                            </div>
                            <div className="text-center px-0.5">
                              <p className={`text-[10px] sm:text-xs font-bold leading-tight ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="hidden sm:block text-[10px] text-blue-600 font-semibold mt-0.5">{step.desc}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7"
                  style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.06)' }}>
                  <p className="text-sm font-black text-gray-900 mb-4">Items Ordered</p>
                  <div className="space-y-4">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#eff6ff' }}>
                          <span className="text-xs font-black" style={{ color: '#0000ff' }}>
                            {item.brand === 'EcoFlow' ? 'EF' : 'BT'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.brand && (
                            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#0000ff' }}>{item.brand}</p>
                          )}
                          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-black font-mono text-gray-900 flex-shrink-0">
                          {formatKES(Number(item.price_kes) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-lg font-mono" style={{ color: '#0000ff' }}>{formatKES(order.totalKes)}</span>
                  </div>
                </div>

                {/* Delivery address */}
                {order.deliveryAddress && (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7"
                    style={{ boxShadow: '0 4px 32px rgba(0,0,64,0.06)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={16} style={{ color: '#0000ff' }} />
                      <p className="text-sm font-black text-gray-900">Delivery Address</p>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {order.deliveryAddress.street}<br />
                      {order.deliveryAddress.city}, {order.deliveryAddress.county}
                      {order.deliveryAddress.instructions && (
                        <><br /><em className="text-gray-400">&ldquo;{order.deliveryAddress.instructions}&rdquo;</em></>
                      )}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Link
                    href="/"
                    className="flex-1 py-4 text-center text-white font-bold rounded-2xl transition-all"
                    style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
                  >
                    Continue Shopping
                  </Link>
                  <button
                    onClick={() => { setOrder(null); setError('') }}
                    className="flex-1 py-4 text-center font-bold rounded-2xl transition-all"
                    style={{ background: '#f8faff', color: '#0000ff', border: '1.5px solid #bfdbfe' }}
                  >
                    Track Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-gray-400 mt-8">
            Can&apos;t find your order?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  )
}
