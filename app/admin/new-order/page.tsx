'use client'

import { useEffect, useState, useRef } from 'react'
import { Search, Plus, Minus, Trash2, Smartphone, Banknote, CheckCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: string
  price_kes: number
  image_url?: string | null
  in_stock: boolean
  category: string
  slug: string
}

interface OrderItem {
  id: string
  name: string
  brand: string
  price_kes: number
  quantity: number
}

type FlowState = 'idle' | 'creating' | 'polling' | 'paid' | 'failed'

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`

export default function NewOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [flow, setFlow] = useState<FlowState>('idle')
  const [orderNumber, setOrderNumber] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = items.reduce((s, i) => s + i.price_kes * i.quantity, 0)
  const isProcessing = flow === 'creating' || flow === 'polling'

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? (Array.isArray(d) ? d : [])); setLoadingProducts(false) })
      .catch(() => setLoadingProducts(false))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function addItem(product: Product) {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: product.id, name: product.name, brand: product.brand, price_kes: product.price_kes, quantity: 1 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setItems([])
    setName('')
    setPhone('')
    setEmail('')
    setFlow('idle')
    setOrderNumber('')
    setStatusMsg('')
    setCreatedOrderId('')
  }

  async function handlePayment(paymentMethod: 'mpesa' | 'cash') {
    if (!name.trim()) { setStatusMsg('Customer name is required.'); return }
    if (!phone.trim()) { setStatusMsg('Phone number is required.'); return }
    if (items.length === 0) { setStatusMsg('Add at least one product.'); return }
    setStatusMsg('')
    setFlow('creating')

    // Create order
    const createRes = await fetch('/api/admin/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: name,
        guestPhone: phone,
        guestEmail: email || null,
        items: items.map(i => ({ productId: i.id, name: i.name, brand: i.brand, quantity: i.quantity, price_kes: i.price_kes })),
        total,
        paymentMethod,
      }),
    })
    const createData = await createRes.json()

    if (!createRes.ok || !createData.orderId) {
      setFlow('failed')
      setStatusMsg(createData.error ?? 'Failed to create order')
      return
    }

    setOrderNumber(createData.orderNumber)
    setCreatedOrderId(createData.orderId)

    if (paymentMethod === 'cash') {
      setFlow('paid')
      setStatusMsg(`Order ${createData.orderNumber} created and marked as paid (cash).`)
      return
    }

    // STK Push
    const stkRes = await fetch('/api/admin/mpesa/stkpush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: createData.orderId }),
    })
    const stkData = await stkRes.json()

    if (!stkData.success) {
      setFlow('failed')
      setStatusMsg(stkData.error ?? 'STK push failed — check Safaricom credentials')
      return
    }

    setFlow('polling')
    setStatusMsg(`STK Push sent to ${phone} — waiting for customer to approve…`)

    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/orders/${createData.orderId}/status`)
      const statusData = await statusRes.json()
      if (statusData.paymentStatus === 'paid') {
        clearInterval(pollRef.current!)
        setFlow('paid')
        setStatusMsg(`Payment confirmed — Order ${createData.orderNumber} created successfully!`)
      } else if (statusData.paymentStatus === 'failed') {
        clearInterval(pollRef.current!)
        setFlow('failed')
        setStatusMsg(`Payment failed: ${statusData.failureReason ?? 'Customer cancelled or wrong PIN'}`)
      }
    }, 4000)

    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current) }, 5 * 60 * 1000)
  }

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-16 bg-[#f8f9fa] min-h-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">New Walk-In Order</h1>
        <p className="text-gray-400 text-sm font-medium mt-2">Create an order for a customer at the counter</p>
      </div>

      {/* Success state */}
      {flow === 'paid' && (
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Order Created!</h2>
          <p className="text-gray-500 font-medium mb-2">{statusMsg}</p>
          <p className="text-[13px] font-black text-gray-400 uppercase tracking-widest mb-8">{orderNumber}</p>
          <button
            onClick={reset}
            className="h-12 px-8 rounded-2xl bg-[#0000ff] text-white text-sm font-black tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            CREATE ANOTHER ORDER
          </button>
        </div>
      )}

      {flow !== 'paid' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: Product Selector ───────────────────────────────── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-4">Select Products</h2>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products by name, brand or category…"
                  className="w-full pl-11 pr-4 h-11 rounded-[14px] border border-gray-100 text-[14px] font-medium outline-none bg-gray-50 focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              {/* Product grid */}
              {loadingProducts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {filtered.map(product => {
                    const inCart = items.find(i => i.id === product.id)
                    return (
                      <button
                        key={product.id}
                        onClick={() => addItem(product)}
                        disabled={!product.in_stock}
                        className="text-left p-4 rounded-[16px] border-2 transition-all group relative"
                        style={{
                          borderColor: inCart ? '#0000ff' : '#f0f0f0',
                          background: inCart ? '#eff6ff' : '#fafafa',
                          opacity: product.in_stock ? 1 : 0.5,
                        }}
                      >
                        {inCart && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0000ff] text-white text-[10px] font-black flex items-center justify-center">
                            {inCart.quantity}
                          </span>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{product.brand}</p>
                        <p className="text-[13px] font-black text-gray-900 leading-snug mb-2 pr-6">{product.name}</p>
                        <p className="text-[14px] font-black font-mono" style={{ color: '#0000ff' }}>
                          {fmt(product.price_kes)}
                        </p>
                        {!product.in_stock && (
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">Out of Stock</p>
                        )}
                      </button>
                    )
                  })}
                  {filtered.length === 0 && (
                    <div className="col-span-3 py-12 text-center text-gray-400 text-sm font-medium">No products match your search.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Customer + Summary + Payment ─────────────────── */}
          <div className="space-y-4">

            {/* Customer details */}
            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-4">Customer Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Full Name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Mwangi"
                    disabled={isProcessing}
                    className="w-full px-4 h-11 rounded-[12px] border border-gray-100 text-[14px] font-medium outline-none bg-gray-50 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Phone Number *</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    disabled={isProcessing}
                    className="w-full px-4 h-11 rounded-[12px] border border-gray-100 text-[14px] font-medium outline-none bg-gray-50 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Email (optional)</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    disabled={isProcessing}
                    className="w-full px-4 h-11 rounded-[12px] border border-gray-100 text-[14px] font-medium outline-none bg-gray-50 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-4">Order Summary</h2>
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm font-medium text-center py-6">No products added yet</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-[12px] bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-400 font-bold">{fmt(item.price_kes)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          disabled={isProcessing}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="w-6 text-center text-[13px] font-black text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          disabled={isProcessing}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-[13px] font-black font-mono text-gray-900 w-24 text-right">
                        {fmt(item.price_kes * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black uppercase tracking-widest text-gray-400">Total</span>
                    <span className="text-[20px] font-black font-mono text-gray-900">{fmt(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status message */}
            {statusMsg && (
              <div className={`flex items-start gap-3 p-4 rounded-[16px] text-[13px] font-bold ${
                flow === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                flow === 'polling' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {flow === 'failed' ? <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> :
                 flow === 'polling' ? <Loader2 size={16} className="animate-spin mt-0.5 flex-shrink-0" /> :
                 <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                {statusMsg}
              </div>
            )}

            {/* Payment buttons */}
            {(flow === 'idle' || flow === 'failed') && (
              <div className="space-y-3">
                <button
                  onClick={() => handlePayment('mpesa')}
                  disabled={isProcessing}
                  className="w-full h-14 rounded-[16px] flex items-center justify-center gap-3 text-[14px] font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  <Smartphone size={20} />
                  Send M-Pesa STK Push
                </button>
                <button
                  onClick={() => handlePayment('cash')}
                  disabled={isProcessing}
                  className="w-full h-14 rounded-[16px] flex items-center justify-center gap-3 text-[14px] font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)' }}
                >
                  <Banknote size={20} />
                  Mark as Paid (Cash)
                </button>
              </div>
            )}

            {/* Creating / polling state */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 h-14 rounded-[16px] bg-blue-50 border border-blue-200">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span className="text-[14px] font-black text-blue-700">
                  {flow === 'creating' ? 'Creating order…' : 'Waiting for payment…'}
                </span>
              </div>
            )}

            {/* Retry after failed */}
            {flow === 'failed' && (
              <button
                onClick={reset}
                className="w-full h-11 rounded-[14px] flex items-center justify-center gap-2 text-[13px] font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw size={14} />
                Start Over
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
