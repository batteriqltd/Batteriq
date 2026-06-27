'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, CheckCircle, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'bq_newsletter_dismissed'
const DELAY_MS = 8000 // Show after 8 seconds on site

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    // Don't show if already dismissed or subscribed this session
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) return
    } catch { /* ignore */ }

    // Don't show on admin pages
    if (window.location.pathname.startsWith('/admin')) return
    if (window.location.pathname.startsWith('/checkout')) return
    if (window.location.pathname.startsWith('/order-confirmation')) return

    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setStatus('success')
        try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
        // Auto-close after 2.5 seconds on success
        setTimeout(() => setVisible(false), 2500)
      } else {
        const d = await res.json()
        setErrMsg(d.error ?? 'Something went wrong. Try again.')
        setStatus('error')
      }
    } catch {
      setErrMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed z-[301] left-4 right-4 bottom-6 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
          >
            <div
              className="bg-white rounded-[28px] overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,30,0.28), 0 4px 20px rgba(0,0,30,0.12)' }}
            >
              {/* Top accent bar */}
              <div style={{ height: 4, background: 'linear-gradient(90deg, #0000ff, #4d9fff, #0000ff)' }} />

              {/* Header image area */}
              <div className="relative px-7 pt-7 pb-4">
                {/* Close button */}
                <button
                  onClick={dismiss}
                  className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>

                {status === 'success'
                  ? (
                    /* ── Success state ── */
                    <div className="text-center py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                        className="w-16 h-16 rounded-[20px] mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #00A651, #00C853)', boxShadow: '0 12px 32px rgba(0,166,81,0.3)' }}
                      >
                        <CheckCircle size={32} className="text-white" strokeWidth={2.5} />
                      </motion.div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">You are in!</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        Welcome to the Batteriq community. Expect exclusive deals and new arrivals first.
                      </p>
                    </div>
                  )
                  : (
                    /* ── Subscribe form ── */
                    <form onSubmit={handleSubmit}>
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                        style={{ background: 'linear-gradient(135deg, #f0f2ff, #e8efff)', border: '1px solid #dde5ff' }}>
                        <Zap size={11} className="text-[#0000ff]" fill="#0000ff" />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0000ff]">
                          Exclusive Offers
                        </span>
                      </div>

                      <h3 className="text-[22px] font-black text-gray-900 tracking-tight leading-tight mb-2 pr-8">
                        Get deals before everyone else
                      </h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                        Sign up for new EcoFlow arrivals, flash sales, and power tips. Kenya&apos;s best prices — straight to your inbox.
                      </p>

                      {/* Offer pills */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {['New arrivals first', 'Flash sales', 'M-Pesa deals', 'No spam'].map(tag => (
                          <span key={tag} className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Email input */}
                      <div className="relative mb-3">
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          autoFocus
                          className="w-full h-13 px-5 py-4 rounded-2xl border-2 border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#0000ff] focus:ring-4 focus:ring-blue-50 bg-gray-50 focus:bg-white"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      {errMsg && (
                        <p className="text-xs font-bold text-red-500 mb-3 px-1">{errMsg}</p>
                      )}

                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full h-13 py-4 rounded-2xl text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, #0000ff 0%, #0000cc 100%)',
                          boxShadow: '0 8px 24px rgba(0,0,255,0.28)',
                        }}
                      >
                        {status === 'loading'
                          ? <><Loader2 size={16} className="animate-spin" /> Subscribing...</>
                          : 'Get Exclusive Deals'
                        }
                      </button>

                      <p className="text-[10px] text-center text-gray-300 font-medium mt-3">
                        No spam · Unsubscribe anytime · Free
                      </p>
                    </form>
                  )
                }
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

}
