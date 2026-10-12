'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import type { Product } from '@/lib/supabase/types'
import { formatKES, getProductImageUrl } from '@/lib/utils'

const STORAGE_KEY = 'batteriq-new-arrivals-v1'
/** Days before the popup may appear again for the same visitor. */
const RESHOW_DAYS = 7
/** Delay after page load before the popup appears. */
const SHOW_DELAY_MS = 1800

function shouldShow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return true
    const seenAt = Number(raw)
    if (Number.isNaN(seenAt)) return true
    return Date.now() - seenAt > RESHOW_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* private mode — ignore */
  }
}

export function NewArrivalsPopup({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (products.length === 0) return
    if (!shouldShow()) return
    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(t)
  }, [products.length])

  const close = useCallback(() => {
    setOpen(false)
    markSeen()
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  if (products.length === 0) return null

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="New arrivals"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div
              className="relative px-6 sm:px-8 pt-7 pb-6 text-white overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #00001a 0%, #1a1a4d 60%, #2d2d8a 100%)' }}
            >
              <div
                className="absolute top-0 right-0 w-56 h-full opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at right center, #6366f1, transparent)' }}
              />
              <button
                onClick={close}
                aria-label="Close new arrivals popup"
                className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={20} />
              </button>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] bg-green-600 text-white px-3 py-1.5 rounded-full mb-3">
                <Sparkles size={12} /> Just landed
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight pr-8">
                New Bluetti Residential Backup
              </h2>
              <p className="text-sm text-white/70 mt-2 max-w-md">
                Homestar 3, HV6K, HV10K &amp; HB500 — now in stock in Kenya. Pay with M-Pesa, Nairobi delivery.
              </p>
            </div>

            {/* Products */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/bluetti/${p.slug}`}
                  onClick={close}
                  className="group bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl p-3 flex flex-col transition-colors"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white mb-2.5">
                    <Image
                      src={getProductImageUrl(p)}
                      alt={`${p.brand} ${p.name}`}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 40vw, 20vw"
                    />
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2rem]">
                    {p.name}
                  </p>
                  <p className="text-xs sm:text-sm font-black font-mono text-slate-900 mt-1">
                    {formatKES(p.price_kes)}
                  </p>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 pb-5 sm:pb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Link
                href="/bluetti"
                onClick={close}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', boxShadow: '0 4px 20px rgba(0,0,255,0.35)' }}
              >
                Shop new arrivals <ArrowRight size={14} />
              </Link>
              <button
                onClick={close}
                className="py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
