'use client'

/**
 * NewsletterPopup — Apple-grade signup modal
 * - Appears 9s after page load on storefront pages only
 * - Perfectly centered on every screen size (mobile + desktop)
 * - Dismissed forever via localStorage
 * - Submits to /api/newsletter → saves to newsletter_subscribers table
 * - Admin sees all subscribers in Admin → Newsletter → Subscribers
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'bq_nl_v2'
const SHOW_AFTER_MS = 9000

// Pages where popup should NEVER appear
const BLOCKED = ['/admin', '/checkout', '/order-confirmation', '/cart', '/privacy', '/terms']

export function NewsletterPopup() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'form' | 'loading' | 'success' | 'error'>('form')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    // Block on certain routes
    if (BLOCKED.some(b => pathname?.startsWith(b))) return
    // Block if already dismissed
    try { if (localStorage.getItem(STORAGE_KEY)) return } catch { /* ignore */ }

    const t = setTimeout(() => setShow(true), SHOW_AFTER_MS)
    return () => clearTimeout(t)
  }, [pathname])

  const dismiss = useCallback((permanent = true) => {
    setShow(false)
    if (permanent) {
      try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    }
  }, [])

  // Lock body scroll while open + ESC to close
  useEffect(() => {
    if (!show) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', fn)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', fn)
    }
  }, [show, dismiss])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setPhase('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (res.ok) {
        setPhase('success')
        try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
        setTimeout(() => setShow(false), 3000)
      } else {
        const d = await res.json().catch(() => ({}))
        // If already subscribed — treat as success
        if (d.message?.includes('Already')) {
          setPhase('success')
          setTimeout(() => setShow(false), 3000)
        } else {
          setErrMsg(d.error ?? 'Something went wrong.')
          setPhase('error')
        }
      }
    } catch {
      setErrMsg('Network error. Please try again.')
      setPhase('error')
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* ── Backdrop ─────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[400]"
            style={{ background: 'rgba(0, 0, 18, 0.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={() => dismiss()}
          />

          {/* ── Centering layer (perfectly centred on all screens) ── */}
          <motion.div
            key="card-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-[440px] pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Subscribe to Batteriq newsletter"
            >
              {/* Gradient glow border wrapper */}
              <div
                className="relative p-[1.5px] overflow-hidden"
                style={{
                  borderRadius: 30,
                  background: 'linear-gradient(160deg, rgba(80,130,255,0.55), rgba(0,0,120,0.15) 40%, rgba(0,0,60,0.05))',
                  boxShadow: '0 50px 130px rgba(0,0,40,0.45), 0 12px 40px rgba(0,0,60,0.22)',
                }}
              >
                <div
                  className="relative bg-white overflow-hidden"
                  style={{ borderRadius: 28.5 }}
                >
                  {/* ── Dismiss button ─────────────────── */}
                  <button
                    onClick={() => dismiss()}
                    className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.18)' }}
                    aria-label="Close"
                  >
                    <X size={15} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                  </button>

                  {phase === 'success' ? (
                    /* ══════════ SUCCESS ══════════ */
                    <div className="px-8 py-12 text-center">
                      {/* Animated checkmark */}
                      <motion.div
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.05 }}
                        className="w-20 h-20 rounded-[24px] mx-auto mb-6 flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #00004d 0%, #0000cc 100%)',
                          boxShadow: '0 16px 48px rgba(0,0,200,0.32)',
                        }}
                      >
                        <motion.svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                          <motion.path
                            d="M4 12.5L9.5 18L20 6"
                            stroke="white"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                          />
                        </motion.svg>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000ff] mb-3">You are in</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
                          Welcome to Batteriq
                        </h3>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[280px] mx-auto">
                          You are on the list. Expect exclusive deals and new arrivals before anyone else.
                        </p>
                      </motion.div>

                      {/* Closing progress bar */}
                      <div className="mt-8 h-[3px] rounded-full bg-gray-100 overflow-hidden mx-10">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #0000ff, #4d9fff)' }}
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2.8, ease: 'linear' }}
                        />
                      </div>
                    </div>

                  ) : (
                    /* ══════════ FORM ══════════ */
                    <>
                      {/* Top visual strip — product showcase */}
                      <div
                        className="relative h-[186px] overflow-hidden flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #00002a 0%, #00004d 50%, #000070 100%)' }}
                      >
                        {/* Subtle grid */}
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
                          backgroundSize: '30px 30px',
                        }} />

                        {/* Animated glow orbs */}
                        <motion.div
                          className="absolute w-52 h-52 rounded-full -top-16 -right-16"
                          style={{ background: 'radial-gradient(circle, rgba(0,110,255,0.32), transparent 70%)' }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                          className="absolute w-36 h-36 rounded-full -bottom-10 left-6"
                          style={{ background: 'radial-gradient(circle, rgba(0,210,255,0.2), transparent 70%)' }}
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
                          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                        />

                        {/* Content */}
                        <div className="relative text-center px-6">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3.5"
                            style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                              Kenya&apos;s Official EcoFlow Dealer
                            </span>
                          </div>
                          <p className="text-white font-black text-[22px] leading-tight tracking-tight" style={{ letterSpacing: '-0.025em' }}>
                            Power deals.<br />
                            <span style={{ color: 'rgba(180,210,255,0.9)' }}>Before they sell out.</span>
                          </p>
                        </div>
                      </div>

                      {/* Form body */}
                      <div className="px-7 pt-6 pb-7">
                        <h3
                          className="font-black text-gray-900 mb-1.5"
                          style={{ fontSize: '1.28rem', letterSpacing: '-0.025em', lineHeight: 1.25 }}
                        >
                          Get exclusive offers first
                        </h3>
                        <p className="text-[13px] text-gray-400 font-medium leading-relaxed mb-5">
                          New EcoFlow arrivals, flash sales, and M-Pesa deals — straight to your inbox.
                        </p>

                        <form onSubmit={submit}>
                          {/* Email input */}
                          <div className="relative mb-3">
                            <input
                              type="email"
                              value={email}
                              onChange={e => { setEmail(e.target.value); if (phase === 'error') { setPhase('form'); setErrMsg('') } }}
                              placeholder="your@email.com"
                              required
                              autoComplete="email"
                              className="w-full px-5 py-4 rounded-[14px] text-gray-900 font-medium placeholder-gray-300 outline-none transition-all"
                              onFocus={e => {
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12), 0 1px 2px rgba(0,0,0,0.06)'
                                e.currentTarget.style.borderColor = '#0000ff'
                                e.currentTarget.style.background = '#ffffff'
                              }}
                              onBlur={e => {
                                e.currentTarget.style.boxShadow = ''
                                e.currentTarget.style.borderColor = phase === 'error' ? '#ef4444' : '#e5e7eb'
                                e.currentTarget.style.background = '#fafafa'
                              }}
                              style={{
                                fontSize: '16px',
                                border: phase === 'error' ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
                                background: '#fafafa',
                              } as React.CSSProperties}
                            />
                          </div>

                          {/* Error */}
                          {phase === 'error' && errMsg && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[11px] font-bold text-red-500 mb-3 px-1"
                            >
                              {errMsg}
                            </motion.p>
                          )}

                          {/* Submit */}
                          <button
                            type="submit"
                            disabled={phase === 'loading'}
                            className="w-full py-[15px] text-white font-black text-sm rounded-[14px] transition-all hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2.5"
                            style={{
                              background: phase === 'loading'
                                ? '#0000cc'
                                : 'linear-gradient(135deg, #0000ff 0%, #0000cc 100%)',
                              boxShadow: phase === 'loading' ? 'none' : '0 8px 28px rgba(0,0,255,0.34)',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {phase === 'loading' ? (
                              <>
                                <svg className="animate-spin" width="15" height="15" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                Subscribing...
                              </>
                            ) : (
                              'Get Exclusive Deals'
                            )}
                          </button>
                        </form>

                        {/* Trust line */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                          {[
                            { icon: '✓', text: 'No spam' },
                            { icon: '✓', text: 'Unsubscribe anytime' },
                            { icon: '✓', text: 'Free' },
                          ].map(({ icon, text }) => (
                            <span key={text} className="flex items-center gap-1 text-[10px] font-bold text-gray-300">
                              <span className="text-[#0000ff]">{icon}</span> {text}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
