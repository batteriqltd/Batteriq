'use client'
import { useState, useEffect, useRef } from 'react'
import { useCartStore, formatKES } from '@/store/cartStore'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Lock, Smartphone,
  CheckCircle, ChevronRight, Package, CreditCard,
  AlertCircle, Phone
} from 'lucide-react'
import { WhatsAppIcon, EmailIcon, MpesaIcon, DeliveryIcon, ContactSalesIcon } from '@/components/ui/ContactIcons'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

type PaymentMethod = 'mpesa_now' | 'cod_mpesa' | 'sales_confirmation'

function normalizePhone(raw: string): string {
  const p = raw.replace(/[\s\-\(\)]/g, '').trim()
  if (p.startsWith('+254')) return '254' + p.slice(4)
  if (p.startsWith('07') || p.startsWith('01')) return '254' + p.slice(1)
  if (p.startsWith('254')) return p
  if (p.length === 9 && (p.startsWith('7') || p.startsWith('1'))) return '254' + p
  return p
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    address: '', city: 'Nairobi', county: 'Nairobi', notes: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa_now')
  const [step, setStep] = useState<'form' | 'processing' | 'transitioning' | 'waiting_mpesa' | 'success' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [orderId, setOrderId] = useState('')
  const [mpesaTimer, setMpesaTimer] = useState(60)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const checkoutRequestIdRef = useRef('')
  const [retryCount, setRetryCount] = useState(0)
  const PAYBILL_NUMBER = '303030'
  const PAYBILL_ACCOUNT = '3753#'
  const PAYBILL_NAME = 'BATTERIQ SOLUTIONS'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && items.length === 0 && step === 'form') {
      router.replace('/cart')
    }
  }, [mounted, items.length, step, router])

  useEffect(() => {
    if (step !== 'waiting_mpesa') return
    if (mpesaTimer <= 0) {
      // SEQUENTIAL final check — order status first, THEN Safaricom, never in parallel
      const finalCheck = async () => {
        const savedOrderIdForTimer = orderId
        try {
          // 1. Check our database first — callback may have already confirmed
          if (savedOrderIdForTimer) {
            const statusRes = await fetch(`/api/orders/${savedOrderIdForTimer}/status?t=${Date.now()}`, { cache: 'no-store' })
            const statusData = await statusRes.json()
            if (statusData.paymentStatus === 'paid') {
              setStep('success')
              clearCart()
              setTimeout(() => {
                router.push(`/order-confirmation/${savedOrderIdForTimer}?email=${encodeURIComponent(form.email)}`)
              }, 2200)
              return // STOP — paid, never show error
            }
          }

          // 2. Only if NOT paid in DB — ask Safaricom directly
          if (checkoutRequestId) {
            const queryRes = await fetch('/api/mpesa/stkquery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ checkoutRequestId }),
            })
            const data = await queryRes.json()
            if (data.resultCode === 0) {
              // Paid per Safaricom — callback was just slow
              setStep('success')
              clearCart()
              setTimeout(() => {
                router.push(`/order-confirmation/${savedOrderIdForTimer || orderId}?email=${encodeURIComponent(form.email)}`)
              }, 2200)
              return
            }

            // 3. Give the callback one last chance — wait 3s and re-check DB
            await new Promise(r => setTimeout(r, 3000))
            if (savedOrderIdForTimer) {
              const finalRes = await fetch(`/api/orders/${savedOrderIdForTimer}/status?t=${Date.now()}`, { cache: 'no-store' })
              const finalData = await finalRes.json()
              if (finalData.paymentStatus === 'paid') {
                setStep('success')
                clearCart()
                setTimeout(() => {
                  router.push(`/order-confirmation/${savedOrderIdForTimer}?email=${encodeURIComponent(form.email)}`)
                }, 2200)
                return
              }
            }

            // 4. Genuinely not paid — show specific error
            const codeMsg: Record<number, string> = {
              1032: 'You cancelled the M-Pesa payment. Tap Retry to try again.',
              1037: 'The M-Pesa prompt timed out before you entered your PIN. Please tap Retry.',
              2001: 'Wrong M-Pesa PIN entered. Please retry with the correct PIN.',
              1001: 'Wrong PIN entered. Please retry.',
              1019: 'M-Pesa request expired. Please retry.',
              17:   'M-Pesa system is busy. Please wait a moment then retry.',
              26:   'M-Pesa system is busy. Please retry in a few minutes.',
            }
            setStep('error')
            setErrorMsg(codeMsg[data.resultCode] ?? `Payment was not completed. Please retry or use Paybill below. (Code: ${data.resultCode ?? 'pending'})`)
          } else {
            setStep('error')
            setErrorMsg('Payment timed out. Please try again.')
          }
        } catch {
          setStep('error')
          setErrorMsg('Could not verify payment. If money was deducted, contact us on WhatsApp 0716 822 014 — we will confirm and process your order.')
        }
      }
      finalCheck()
      return
    }
    const t = setTimeout(() => setMpesaTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, mpesaTimer, checkoutRequestId])

  const subtotal = mounted ? items.reduce((s, i) => s + (Number(i.price_kes) || 0) * i.quantity, 0) : 0
  const totalQuantity = mounted ? items.reduce((sum, item) => sum + item.quantity, 0) : 0
  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const loading = step === 'processing'
  const isFormValid = Boolean(
    form.fullName.trim().length >= 2 &&
    form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 9 &&
    form.address.trim().length >= 2 &&
    paymentMethod
  )

  async function handleSubmit() {
    if (!mounted || items.length === 0) return
    setStep('processing')
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: form.fullName,
          guestEmail: form.email,
          guestPhone: normalizePhone(form.phone),
          items: items.map(i => ({
            id: i.productId,
            name: i.name,
            brand: i.brand,
            price_kes: i.price_kes,
            quantity: i.quantity,
            image: i.image || null,
          })),
          subtotalKes: subtotal,
          totalKes: subtotal,
          paymentMethod,
          deliveryAddress: {
            street: form.address,
            city: form.city,
            county: form.county,
            instructions: form.notes || '',
          },
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error ?? 'Order creation failed')
      setOrderId(orderData.orderId)

      if (paymentMethod === 'mpesa_now') {
        const mpesaRes = await fetch('/api/mpesa/stkpush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: normalizePhone(form.phone), orderId: orderData.orderId, amount: subtotal }),
        })
        if (!mpesaRes.ok) throw new Error('M-Pesa push failed')
        const mpesaData = await mpesaRes.json()
        if (mpesaData.checkoutRequestId) {
          setCheckoutRequestId(mpesaData.checkoutRequestId)
          checkoutRequestIdRef.current = mpesaData.checkoutRequestId
        }
        setMpesaTimer(60)
        setStep('transitioning')
        await new Promise(resolve => setTimeout(resolve, 1200))
        setStep('waiting_mpesa')
        const savedOrderId = orderData.orderId
        const savedEmail = form.email
        const pollStart = Date.now()
        const pollInterval = setInterval(async () => {
          try {
            // 1. Check if callback already updated the order
            const statusRes = await fetch(`/api/orders/${savedOrderId}/status?t=${Date.now()}`, { cache: 'no-store' })
            const statusData = await statusRes.json()

            if (statusData.paymentStatus === 'paid') {
              clearInterval(pollInterval)
              setStep('success')
              clearCart()
              setTimeout(() => {
                router.push(`/order-confirmation/${savedOrderId}?email=${encodeURIComponent(savedEmail)}`)
              }, 2200)
              return
            }

            // Only act on failed after 30s — give user time to enter PIN
            if (statusData.paymentStatus === 'failed' && Date.now() - pollStart > 30000) {
              clearInterval(pollInterval)
              const reason = statusData.failureReason || 'Payment was cancelled or PIN was incorrect.'
              setStep('error')
              setErrorMsg(reason + ' You can retry or pay via Paybill below.')
              return
            }

            // 2. If still pending, ask Safaricom directly (STK Query)
            const reqId = checkoutRequestIdRef.current
            if (reqId) {
              const queryRes = await fetch('/api/mpesa/stkquery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkoutRequestId: reqId }),
              })
              const queryData = await queryRes.json()
              // ResultCode 0 = paid — redirect even if callback was slow
              if (queryData.resultCode === 0) {
                clearInterval(pollInterval)
                setStep('success')
                clearCart()
                setTimeout(() => {
                  router.push(`/order-confirmation/${savedOrderId}?email=${encodeURIComponent(savedEmail)}`)
                }, 2200)
              }
            }
          } catch {}
        }, 2000)
        setTimeout(() => clearInterval(pollInterval), 70000)
      } else {
        clearCart()
        router.push(`/order-confirmation/${orderData.orderId}?email=${encodeURIComponent(form.email)}`)
      }
    } catch (err: unknown) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (!mounted || (items.length === 0 && step === 'form')) return null

  // ── TRANSITIONING SCREEN ──
  if (step === 'transitioning') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 checkout-bg">
        <div className="flex flex-col items-center gap-10 text-center max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00A651]/10 animate-ping" style={{ transform: 'scale(1.8)' }} />
            <div className="relative w-28 h-28 rounded-[32px] flex items-center justify-center bg-gradient-to-br from-[#00A651] to-[#007a3d] shadow-2xl shadow-[#00A651]/30 transform -rotate-6">
              <Smartphone className="text-white w-12 h-12 rotate-6" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#00004d] mb-3 tracking-tight">M-Pesa Express</h2>
            <p className="text-gray-500 font-bold leading-relaxed px-4">We are sending a secure payment request to your phone...</p>
          </div>
          <div className="flex gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    )
  }

  // ── MPESA WAITING SCREEN ──
  if (step === 'waiting_mpesa') {
    const mins = Math.floor(mpesaTimer / 60)
    const secs = String(mpesaTimer % 60).padStart(2, '0')
    const progress = ((60 - mpesaTimer) / 60) * 100

    return (
      <div className="min-h-screen flex items-center justify-center px-4 checkout-bg py-12">
        <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border border-[#f0f0f0] animate-in fade-in zoom-in duration-500">
          <div className="bg-[#00A651] p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="bg-white rounded-2xl px-8 py-4 inline-flex items-center gap-3 mb-8 shadow-2xl relative z-10">
              <MpesaIcon size={36} />
            </div>
            <h2 className="text-3xl font-black text-white mb-3 relative z-10 tracking-tight">Authorize Payment</h2>
            <p className="text-green-50 font-bold text-[15px] relative z-10 opacity-90">Enter your M-Pesa PIN on your phone</p>
          </div>

          <div className="p-10 space-y-10">
            <div className="flex items-center gap-5 bg-[#fafafa] p-6 rounded-[24px] border border-[#e5e7eb]">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-[#e5e7eb]">
                <Smartphone className="text-[#00A651] w-7 h-7" />
              </div>
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">STK Push Sent To</p>
                <p className="font-black text-[18px] text-gray-900">{form.phone}</p>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { num: '1', text: 'Unlock your smartphone', done: true },
                { num: '2', text: 'Enter your M-Pesa PIN', done: false },
                { num: '3', text: 'Confirm the transaction', done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-5 group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all duration-500 ${
                    s.done ? 'bg-[#00A651] border-[#00A651] text-white shadow-lg shadow-green-100' : 'bg-white border-[#e5e7eb] text-gray-300'
                  }`}>
                    {s.done ? <CheckCircle size={20} /> : s.num}
                  </div>
                  <p className={`font-black text-[15px] transition-colors duration-500 ${s.done ? 'text-gray-900' : 'text-gray-300'}`}>{s.text}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6">
              <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-[#00A651] to-[#00c864] rounded-full"
                />
              </div>
              <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.15em]">
                <span className="text-gray-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
                  Securing Transaction
                </span>
                <span className={mpesaTimer < 15 ? 'text-red-500 animate-pulse' : 'text-[#00A651]'}>{mins}:{secs}</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep('form')}
                className="w-full h-14 rounded-2xl font-black text-[14px] text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 transition-all duration-300 border border-transparent hover:border-red-100"
              >
                Cancel and use different method
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS SCREEN — payment confirmed ──
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 checkout-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-[32px] p-10 sm:p-14 max-w-md w-full text-center shadow-2xl"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
            className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00A651 0%, #00C853 100%)', boxShadow: '0 16px 48px rgba(0,166,81,0.35)' }}
          >
            <motion.svg
              width="44" height="44" viewBox="0 0 24 24" fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            >
              <motion.path
                d="M4 12.5L9.5 18L20 6"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
              Payment Successful! 🎉
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-2">
              Your M-Pesa payment has been confirmed.
            </p>
            <p className="text-gray-400 text-xs font-medium mb-8">
              A receipt has been sent to your email.
            </p>
          </motion.div>

          {/* Progress to redirect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00A651, #00C853)' }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'linear' }}
              />
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Taking you to your order...
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ── ERROR SCREEN ──
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 checkout-bg">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl border border-[#f0f0f0]"
        >
          <div className="w-24 h-24 rounded-[32px] bg-red-50 flex items-center justify-center mx-auto mb-10 border border-red-100 transform rotate-12">
            <AlertCircle className="text-red-500 w-12 h-12 -rotate-12" />
          </div>
          <h2 className="text-3xl font-black text-[#00004d] mb-4 tracking-tight">Payment Failed</h2>
          <p className="text-gray-500 font-bold mb-8 leading-relaxed px-4">{errorMsg}</p>

          {/* Retry button */}
          <div className="space-y-4 mb-10">
            <button 
              onClick={() => {
                setRetryCount(c => c + 1)
                setStep('form')
                setErrorMsg('')
                setMpesaTimer(60)
              }} 
              className="w-full h-[64px] rounded-[24px] bg-[#00004d] text-white font-black text-[17px] transition-all hover:translate-y-[-2px] active:scale-95 shadow-xl shadow-[#00004d]/20"
            >
              🔄 Retry M-Pesa Payment {retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}
            </button>
            <Link 
              href="/contact" 
              className="w-full h-[64px] rounded-[24px] bg-white border-2 border-[#e5e7eb] text-gray-700 font-black text-[17px] flex items-center justify-center transition-all hover:border-[#0000ff] hover:text-[#0000ff]"
            >
              Get Priority Support
            </Link>
          </div>

          {/* Paybill fallback */}
          <div className="bg-[#f0fdf4] border border-green-200 rounded-[24px] p-8 text-left">
            <p className="text-[11px] font-black text-green-700 uppercase tracking-widest mb-4">📱 Alternative: Pay via Paybill</p>
            <p className="text-sm text-gray-600 font-medium mb-6 leading-relaxed">
              If STK Push keeps failing, you can pay manually via M-Pesa Paybill:
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white rounded-xl px-5 py-3 border border-green-100">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Business No.</span>
                <span className="font-black text-[18px] text-[#00A651] font-mono">{PAYBILL_NUMBER}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl px-5 py-3 border border-green-100">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Account No.</span>
                <span className="font-black text-[18px] text-[#00A651] font-mono">{PAYBILL_ACCOUNT}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-xl px-5 py-3 border border-green-100">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Name</span>
                <span className="font-black text-[15px] text-gray-700">{PAYBILL_NAME}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-bold mt-4 leading-relaxed text-center">
              After paying, send your M-Pesa confirmation SMS screenshot to us on{' '}
              <a href="https://wa.me/254716822014" className="text-green-600 underline">WhatsApp 0716 822 014</a>
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── MAIN CHECKOUT ──
  return (
    <div className="checkout-bg min-h-screen pb-20 font-medium">
      <Header />
      
      {/* eTIMS Banner */}
      <div className="w-full py-4 px-4 text-center bg-white/50 backdrop-blur-sm border-b border-purple-100 mt-16 lg:mt-20">
        <p className="text-[11px] font-black text-purple-600 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <span>🧾</span> eTIMS KRA Invoice issued automatically after purchase
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Indicator */}
        <div className="py-12 lg:py-16 max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative px-2">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-1/2 z-0" />
            {/* Progress Line */}
            <div 
              className="absolute top-1/2 left-0 h-[2px] bg-[#0000ff] -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out" 
              style={{ width: '50%' }} 
            />
            
            {/* Step 1: Cart */}
            <div className="relative z-10 flex flex-col items-center gap-3 bg-[#f8f9ff] px-4">
              <div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center shadow-lg shadow-green-100 border-4 border-white">
                <CheckCircle size={20} strokeWidth={3} />
              </div>
              <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest">1. Cart</span>
            </div>

            {/* Step 2: Checkout */}
            <div className="relative z-10 flex flex-col items-center gap-3 bg-[#f8f9ff] px-4">
              <div className="w-12 h-12 rounded-full bg-[#0000ff] text-white flex items-center justify-center shadow-xl shadow-blue-200 border-4 border-white font-black text-lg">
                2
              </div>
              <span className="text-[12px] font-black text-[#00004d] uppercase tracking-widest">2. Checkout</span>
            </div>

            {/* Step 3: Confirmation */}
            <div className="relative z-10 flex flex-col items-center gap-3 bg-[#f8f9ff] px-4">
              <div className="w-10 h-10 rounded-full bg-white text-gray-300 flex items-center justify-center border-2 border-gray-100 font-black text-sm">
                3
              </div>
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest opacity-50">3. Confirmation</span>
            </div>
          </div>
        </div>

        {/* eTIMS Notice */}
        <div className="mb-8 flex items-center justify-center gap-3 bg-purple-50 border border-purple-100 rounded-2xl px-6 py-3">
          <span className="text-purple-600 font-black text-xs uppercase tracking-widest">🧾 Official eTIMS KRA Invoice issued after every purchase</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: FORMS (60%) */}
          <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
            
            {/* 1. Contact Info */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 lg:p-10 shadow-premium border border-[#f0f0f0]"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-10 h-10 rounded-full bg-[#0000ff] text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-100 flex-shrink-0">1</div>
                <h2 className="text-[20px] font-black text-gray-900 tracking-tight">Contact Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Full Name</label>
                  <div className="relative group">
                    <input
                      required value={form.fullName} onChange={e => set('fullName', e.target.value)}
                      placeholder="e.g. Samuel Okoth"
                      style={{ fontSize: '16px' }}
                      className={`w-full h-[60px] px-6 rounded-[20px] text-[16px] font-medium transition-all duration-300 outline-none border-[1.5px] ${
                        form.fullName.length >= 2 
                          ? 'bg-[#f0fdf4] border-[#00A651] text-gray-900' 
                          : 'bg-[#fafafa] border-[#e5e7eb] focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08]'
                      }`}
                    />
                    {form.fullName.length >= 2 && <CheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00A651]" size={22} />}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Email Address</label>
                  <div className="relative group">
                    <input
                      required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="samuel@email.com"
                      style={{ fontSize: '16px' }}
                      className={`w-full h-[60px] px-6 rounded-[20px] text-[16px] font-medium transition-all duration-300 outline-none border-[1.5px] ${
                        form.email.includes('@') 
                          ? 'bg-[#f0fdf4] border-[#00A651] text-gray-900' 
                          : 'bg-[#fafafa] border-[#e5e7eb] focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08]'
                      }`}
                    />
                    {form.email.includes('@') && <CheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00A651]" size={22} />}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">M-Pesa Phone</label>
                  <div className="relative group">
                    <input
                      required value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="0712 345 678"
                      style={{ fontSize: '16px' }}
                      className={`w-full h-[60px] px-6 rounded-[20px] text-[16px] font-medium transition-all duration-300 outline-none border-[1.5px] ${
                        form.phone.length >= 10 
                          ? 'bg-[#f0fdf4] border-[#00A651] text-gray-900' 
                          : 'bg-[#fafafa] border-[#e5e7eb] focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08]'
                      }`}
                    />
                    {form.phone.length >= 10 && <CheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00A651]" size={22} />}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 2. Delivery Info */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-[32px] p-8 lg:p-10 shadow-premium border border-[#f0f0f0]"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-10 h-10 rounded-full bg-[#0000ff] text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-100 flex-shrink-0">2</div>
                <h2 className="text-[20px] font-black text-gray-900 tracking-tight">Delivery Details</h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Street Address</label>
                  <div className="relative group">
                    <input
                      required value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="e.g. 123 Ngong Road, Karen Heights, Apt 4B"
                      style={{ fontSize: '16px' }}
                      className={`w-full h-[60px] px-6 rounded-[20px] text-[16px] font-medium transition-all duration-300 outline-none border-[1.5px] ${
                        form.address.length >= 5 
                          ? 'bg-[#f0fdf4] border-[#00A651] text-gray-900' 
                          : 'bg-[#fafafa] border-[#e5e7eb] focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08]'
                      }`}
                    />
                    {form.address.length >= 5 && <CheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00A651]" size={22} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">City</label>
                    <input
                      required value={form.city} onChange={e => set('city', e.target.value)}
                      style={{ fontSize: '16px' }}
                      className="w-full h-[60px] px-6 rounded-[20px] bg-[#fafafa] border-[1.5px] border-[#e5e7eb] text-[16px] font-medium focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">County</label>
                    <input
                      required value={form.county} onChange={e => set('county', e.target.value)}
                      style={{ fontSize: '16px' }}
                      className="w-full h-[60px] px-6 rounded-[20px] bg-[#fafafa] border-[1.5px] border-[#e5e7eb] text-[16px] font-medium focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Order Notes (Optional)</label>
                  <textarea
                    value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Gate codes or specific delivery instructions..."
                    style={{ fontSize: '16px' }}
                    className="w-full min-h-[120px] p-6 rounded-[20px] bg-[#fafafa] border-[1.5px] border-[#e5e7eb] text-[16px] font-medium focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all duration-300 resize-none"
                  />
                </div>
              </div>
            </motion.section>

            {/* "Not sure?" box */}
            <div className="bg-[#fffbeb] border-[1.5px] border-[#fde68a] rounded-[24px] p-8 flex flex-col md:flex-row items-start md:items-center gap-8 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <ContactSalesIcon size={28} />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-[17px] mb-1">Need help before paying?</p>
                <p className="text-sm text-amber-800/80 font-medium mb-6 leading-relaxed max-w-lg">Our team can confirm stock, warranty, and delivery timing before you complete your purchase.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="https://wa.me/254716822014" target="_blank" className="h-[42px] px-6 rounded-xl bg-[#00A651] text-white text-[13px] font-black flex items-center gap-2 transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-green-100">
                    <WhatsAppIcon size={18} /> WhatsApp
                  </a>
                  <a href="tel:+254716822014" className="h-[42px] px-6 rounded-xl bg-white border border-[#e5e7eb] text-[#0000ff] text-[13px] font-black flex items-center gap-2 transition-all hover:border-[#0000ff] active:scale-95">
                    <Phone size={16} /> Call
                  </a>
                  <a href="mailto:batteriq@gmail.com" className="h-[42px] px-6 rounded-xl bg-white border border-[#e5e7eb] text-gray-500 text-[13px] font-black flex items-center gap-2 transition-all hover:border-gray-400 active:scale-95">
                    <EmailIcon size={18} /> Email
                  </a>
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-[32px] p-8 lg:p-10 shadow-premium border border-[#f0f0f0]"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-10 h-10 rounded-full bg-[#0000ff] text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-100 flex-shrink-0">3</div>
                <h2 className="text-[20px] font-black text-gray-900 tracking-tight">Payment Method</h2>
              </div>

              <div className="space-y-5">
                {/* Option 1: M-Pesa STK Push */}
                <div onClick={() => setPaymentMethod('mpesa_now')} className={`relative p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'mpesa_now' ? 'border-[#00A651] bg-[#f0fdf4] shadow-[0_0_24px_rgba(0,166,81,0.1)]' : 'border-[#f0f0f0] bg-white hover:border-green-200'}`}>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#f0f0f0] flex-shrink-0 p-2">
                      <MpesaIcon size={40} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 text-[15px]">Pay via M-Pesa STK Push</p>
                      <p className="text-xs text-gray-500 mt-1">You will receive a prompt from <strong>BATTERIQ SOLUTIONS</strong>. Confirm the business name before entering your PIN.</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === 'mpesa_now' ? 'border-[#00A651] bg-[#00A651]' : 'border-gray-200'}`}>
                      {paymentMethod === 'mpesa_now' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  {paymentMethod === 'mpesa_now' && (
                    <p className="mt-4 text-[11px] text-green-700 bg-green-100 px-4 py-2 rounded-xl font-bold">
                      No payment is taken until you confirm the M-Pesa prompt on your phone.
                    </p>
                  )}
                </div>

                {/* Option 2: M-Pesa on Delivery */}
                <div onClick={() => setPaymentMethod('cod_mpesa')} className={`relative p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'cod_mpesa' ? 'border-[#0000ff] bg-[#f8f9ff] shadow-[0_0_24px_rgba(0,0,255,0.06)]' : 'border-[#f0f0f0] bg-white hover:border-blue-200'}`}>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#f0f0f0] flex-shrink-0 p-2">
                      <DeliveryIcon size={40} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 text-[15px]">M-Pesa on Delivery</p>
                      <p className="text-xs text-gray-500 mt-1">Our delivery agent will send you an STK Push when they arrive at your door. Pay securely to <strong>BATTERIQ SOLUTIONS</strong>.</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === 'cod_mpesa' ? 'border-[#0000ff] bg-[#0000ff]' : 'border-gray-200'}`}>
                      {paymentMethod === 'cod_mpesa' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>

                {/* Option 3: Reserve Order / Talk to Sales */}
                <div onClick={() => setPaymentMethod('sales_confirmation')} className={`relative p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'sales_confirmation' ? 'border-[#7c3aed] bg-[#faf5ff] shadow-[0_0_24px_rgba(124,58,237,0.06)]' : 'border-[#f0f0f0] bg-white hover:border-purple-200'}`}>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#f0f0f0] flex-shrink-0 p-2">
                      <ContactSalesIcon size={40} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 text-[15px]">Reserve Order — Speak to Sales First</p>
                      <p className="text-xs text-gray-500 mt-1">Submit your details and our team will call you to confirm stock, delivery timeline, and payment options. Ideal for orders above KES 100,000.</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === 'sales_confirmation' ? 'border-[#7c3aed] bg-[#7c3aed]' : 'border-gray-200'}`}>
                      {paymentMethod === 'sales_confirmation' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Proforma Invoice Request */}
            <div className="bg-white rounded-[32px] p-8 shadow-premium border border-[#f0f0f0]">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[#fffbeb] flex items-center justify-center flex-shrink-0 border border-amber-100">
                  <CreditCard size={22} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-[16px] mb-1">Need an invoice before paying?</p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">Many corporate buyers prefer a proforma invoice before payment. Request one and we will send it to your email or WhatsApp within 30 minutes.</p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/254716822014?text=${encodeURIComponent('Hi Batteriq! I would like to request a proforma invoice before making payment. My name is ' + (form.fullName || '[Your Name]') + ' and I am interested in purchasing from your store.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-[42px] px-6 rounded-xl bg-[#00A651] text-white text-[13px] font-black flex items-center gap-2 hover:brightness-110 transition-all"
                    >
                      <WhatsAppIcon size={16} /> Request via WhatsApp
                    </a>
                    <a
                      href={`mailto:info@batteriq.com?subject=Proforma Invoice Request&body=Hi Batteriq, I would like to request a proforma invoice. Name: ${form.fullName || '[Your Name]'}`}
                      className="h-[42px] px-6 rounded-xl bg-white border border-gray-200 text-gray-700 text-[13px] font-black flex items-center gap-2 hover:border-gray-400 transition-all"
                    >
                      <EmailIcon size={16} /> Request via Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SUMMARY (40%) */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-6 order-1 lg:order-2">
            
            {/* Mobile Summary Accordion (Visible only on mobile) */}
            <details className="lg:hidden group bg-white rounded-[28px] border border-[#f0f0f0] shadow-premium overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Package className="text-[#0000ff]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Show Order Summary</p>
                    <p className="text-xs text-gray-500 font-bold">{totalQuantity} items • {formatKES(subtotal)}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 transition-transform group-open:rotate-90" size={20} />
              </summary>
              <div className="p-6 pt-0 border-t border-gray-50">
                <div className="space-y-6 py-4">
                  {items.map(item => (
                    <div key={item.productId} className="flex gap-4">
                      <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                        <Image src={item.image || '/placeholder-product.jpg'} alt={item.name} width={48} height={48} className="object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">{item.quantity} × {formatKES(Number(item.price_kes))}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900 font-mono">{formatKES(Number(item.price_kes) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            {/* Desktop Order Summary */}
            <div className="hidden lg:block bg-white rounded-[32px] p-10 shadow-premium-lg border border-[#f0f0f0]">
              <h2 className="text-[22px] font-black text-gray-900 mb-10 flex items-center justify-between tracking-tight">
                Order Summary
                <span className="text-[11px] font-black text-[#0000ff] bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-[0.15em]">{totalQuantity} Items</span>
              </h2>

              <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-2 scrollbar-hide">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-5">
                    <div className="w-14 h-14 bg-[#fafafa] rounded-2xl flex items-center justify-center p-3 flex-shrink-0 border border-gray-50">
                      <Image src={item.image || '/placeholder-product.jpg'} alt={item.name} width={48} height={48} className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{item.name}</p>
                      <p className="text-[12px] text-gray-400 font-black uppercase tracking-wider">{item.quantity} × {formatKES(Number(item.price_kes))}</p>
                    </div>
                    <div className="text-right py-1">
                      <p className="text-[15px] font-black text-gray-900 font-mono tracking-tighter">{formatKES(Number(item.price_kes) * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-10 h-[1.5px] bg-gray-50" />

              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                  <span className="text-[16px] font-black text-gray-900 font-mono tracking-tighter">{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Delivery</span>
                  <span className="text-[11px] font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-xl uppercase tracking-widest">Confirmed at checkout</span>
                </div>
                <div className="pt-8 border-t border-gray-50 flex justify-between items-end">
                  <span className="text-[20px] font-black text-gray-900 tracking-tight uppercase">Total Amount</span>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-[#0000ff] uppercase tracking-[0.2em] mb-2">KES (Inc. VAT)</span>
                    <span className="text-[32px] font-black text-[#00004d] font-mono leading-none tracking-tighter">{formatKES(subtotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-purple-600 text-center flex items-center justify-center gap-2 uppercase tracking-widest">
                    🧾 Official eTIMS KRA Invoice Included
                  </p>
                  <p className="text-[10px] text-gray-400 text-center font-bold">
                    Official EcoFlow & BLUETTI Authorised Dealer · Warranty supported locally
                  </p>
                </div>
                <button
                  onClick={isFormValid ? handleSubmit : undefined}
                  disabled={!isFormValid || loading}
                  className={`w-full h-[64px] rounded-[24px] font-black text-white text-[17px] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed group relative overflow-hidden`}
                  style={{
                    background: isFormValid ? 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)' : '#f3f4f6',
                    boxShadow: isFormValid ? '0 12px 32px rgba(0, 0, 255, 0.25)' : 'none'
                  }}
                >
                  {loading ? (
                    <div className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={20} className="transition-transform group-hover:scale-110" />
                      {paymentMethod === 'mpesa_now'
                        ? 'Send M-Pesa Payment Prompt'
                        : paymentMethod === 'cod_mpesa'
                        ? 'Place Order — Pay on Delivery'
                        : 'Submit Order for Confirmation'}
                    </>
                  )}
                </button>

                {paymentMethod === 'mpesa_now' && (
                  <p className="text-center text-[11px] text-gray-400 font-bold mt-3 leading-relaxed">
                    No payment will be taken until you confirm the M-Pesa prompt on your phone.
                  </p>
                )}

                <div className="flex items-center justify-center gap-6 pt-4 opacity-40">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-gray-900" />
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Secure SSL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-gray-900" />
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Official Warranty</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Batteriq Kenya</p>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-gray-500 font-bold flex items-center gap-2"><Phone size={10} /> +254 716 822 014</p>
                    <p className="text-[11px] text-gray-500 font-bold flex items-center gap-2"><WhatsAppIcon size={12} /> WhatsApp: +254 716 822 014</p>
                    <p className="text-[11px] text-gray-500 font-bold flex items-center gap-2"><EmailIcon size={12} /> info@batteriq.com</p>
                    <p className="text-[11px] text-gray-500 font-medium">Mon–Sat, 8:30am–6:00pm</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Order Button for Mobile */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
              <button
                onClick={isFormValid ? handleSubmit : undefined}
                disabled={!isFormValid || loading}
                className="w-full h-[60px] rounded-[20px] font-black text-white text-[16px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-400"
                style={{
                  background: isFormValid ? 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)' : '#f3f4f6',
                }}
              >
                {loading
                  ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : paymentMethod === 'mpesa_now'
                  ? 'Send M-Pesa Prompt'
                  : paymentMethod === 'cod_mpesa'
                  ? 'Place Order — Pay on Delivery'
                  : 'Submit for Sales Confirmation'}
              </button>
            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  )
}
