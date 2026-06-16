'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { X, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Review {
  id: string
  guest_name: string
  rating: number
  comment: string
  product_names: string
  created_at: string
  admin_reply?: string
  status?: string
}

// ── Map product name keywords → local product image ──────────────────────────
function getProductImage(productNames: string): string {
  if (!productNames) return '/logos/batteriq-logo.png'
  const n = productNames.toLowerCase()

  if (n.includes('delta pro 3'))         return '/products/ecoflow/delta-pro-3.jpg'
  if (n.includes('delta pro'))           return '/products/ecoflow/delta-pro.jpg'
  if (n.includes('delta 3 plus'))        return '/products/ecoflow/delta-3-plus.jpg'
  if (n.includes('delta 3'))             return '/products/ecoflow/delta-3-plus.jpg'
  if (n.includes('delta 2 max'))         return '/products/ecoflow/delta-2-max.jpg'
  if (n.includes('delta 2'))             return '/products/ecoflow/delta-2-max.jpg'
  if (n.includes('efe2000') || n.includes('e2000')) return '/products/ecoflow/efe2000.jpg'
  if (n.includes('river 2 pro'))         return '/products/ecoflow/river-2-pro.jpg'
  if (n.includes('river 2 max'))         return '/products/ecoflow/river-2-max.jpg'
  if (n.includes('river 2'))             return '/products/ecoflow/river-2-max.jpg'
  if (n.includes('river 3'))             return '/products/ecoflow/river-2-max.jpg'
  if (n.includes('400w') || n.includes('solar panel')) return '/products/ecoflow/solar-panel-400w.jpg'
  if (n.includes('solar'))              return '/heroes/hero-solar.jpg'
  if (n.includes('powerkit'))           return '/products/ecoflow/powerkit-5kwh.jpg'
  if (n.includes('glacier'))            return '/products/ecoflow/glacier-portable-fridge-freezer.jpg'
  if (n.includes('ac200pl'))            return '/products/bluetti/bluetti-ac200pl.jpg'
  if (n.includes('ac300'))              return '/products/bluetti/bluetti-ac300.jpg'
  if (n.includes('ac500'))              return '/products/bluetti/bluetti-ac500.jpg'
  if (n.includes('ac180'))              return '/products/bluetti/bluetti-ac180p.jpg'
  if (n.includes('bluetti'))            return '/products/bluetti/bluetti-ac200pl.jpg'
  return '/heroes/hero-power-stations.jpg'
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_REVIEWS: Review[] = [
  { id: 's1', guest_name: 'James Mwangi', rating: 5, comment: 'Amazing — survived three major blackouts. M-Pesa checkout was instant, delivery next day. 10/10.', product_names: 'EcoFlow DELTA Pro', created_at: '2024-11-15T10:00:00Z' },
  { id: 's2', guest_name: 'Sarah Kamau', rating: 5, comment: 'RIVER 2 is perfect for my apartment. Batteriq delivered same day to Kilimani — super impressed!', product_names: 'EcoFlow RIVER 2', created_at: '2024-10-22T14:30:00Z' },
  { id: 's3', guest_name: 'David Ochieng', rating: 5, comment: 'Kenya needs more companies like Batteriq. Genuine products, real warranty, team picks up the phone.', product_names: 'EcoFlow 400W Solar Panel', created_at: '2024-09-08T09:15:00Z' },
  { id: 's4', guest_name: 'Grace Wanjiru', rating: 5, comment: 'Paid via M-Pesa STK push, got confirmation email, DELTA 2 arrived the next morning. Seamless.', product_names: 'EcoFlow DELTA 2', created_at: '2024-12-03T16:45:00Z' },
  { id: 's5', guest_name: 'Peter Njoroge', rating: 5, comment: 'No more generator noise or fuel costs. The whole office team loves it. Incredibly helpful support.', product_names: 'EcoFlow DELTA 2 Max', created_at: '2025-01-18T11:20:00Z' },
  { id: 's6', guest_name: 'Mary Achieng', rating: 5, comment: 'Bluetti AC300 transformed our restaurant power. Batteriq shipped in 3 days. The real deal.', product_names: 'Bluetti AC300', created_at: '2024-08-29T08:00:00Z' },
  { id: 's7', guest_name: 'Brian Otieno', rating: 5, comment: 'Best investment for my home. No more KPLC outages. Worth every shilling.', product_names: 'EcoFlow DELTA 3 Plus', created_at: '2025-02-10T10:00:00Z' },
  { id: 's8', guest_name: 'Joyce Mutua', rating: 5, comment: 'Ordered Monday, delivered Tuesday to Mombasa Road. Packaging excellent. Highly recommend.', product_names: 'EcoFlow RIVER 3', created_at: '2025-03-05T14:00:00Z' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= n ? '#f59e0b' : 'none'}
          stroke={i <= n ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5} />
      ))}
    </div>
  )
}

function shortName(n: string) {
  const p = n.trim().split(' ')
  return p[0] + (p[1] ? ` ${p[1][0]}.` : '')
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ── Review detail modal ───────────────────────────────────────────────────────
function ReviewModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const productImg = getProductImage(review.product_names)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,20,0.70)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-[28px] overflow-hidden w-full max-w-sm"
          style={{ boxShadow: '0 40px 100px rgba(0,0,30,0.35)' }}
        >
          {/* Product image hero */}
          <div className="relative h-44 bg-[#f0f2ff] flex items-center justify-center">
            <Image
              src={productImg}
              alt={review.product_names || 'Product'}
              fill
              className="object-contain p-6"
            />
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-all shadow-sm"
            >
              <X size={16} />
            </button>
            {/* Product name pill */}
            {review.product_names && (
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-[10px] font-black text-[#0000ff] uppercase tracking-wider truncate max-w-[200px]">
                  {review.product_names.split(',')[0]}
                </p>
              </div>
            )}
          </div>

          {/* Review content */}
          <div className="p-6">
            {/* Stars + time */}
            <div className="flex items-center justify-between mb-4">
              <Stars n={review.rating} size={16} />
              <span className="text-[11px] font-bold text-gray-400">{timeAgo(review.created_at)}</span>
            </div>

            {/* Comment */}
            <p className="text-gray-700 text-sm font-medium leading-relaxed mb-5">
              &ldquo;{review.comment}&rdquo;
            </p>

            {/* Admin reply */}
            {review.admin_reply && (
              <div className="bg-[#f0f5ff] rounded-2xl p-4 mb-4 border-l-2 border-[#0000ff]">
                <p className="text-[10px] font-black text-[#0000ff] uppercase tracking-widest mb-1">
                  Batteriq Response
                </p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{review.admin_reply}</p>
              </div>
            )}

            {/* Reviewer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {/* Product image as avatar */}
                <div className="w-10 h-10 rounded-2xl bg-[#f0f2ff] overflow-hidden border border-gray-100 flex-shrink-0">
                  <Image
                    src={productImg}
                    alt={review.product_names || 'Product'}
                    width={40}
                    height={40}
                    className="object-contain w-full h-full p-1"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{shortName(review.guest_name)}</p>
                  <p className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified Purchase
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Review card (in the scrolling marquee) ────────────────────────────────────
function ReviewCard({ review, onClick }: { review: Review; onClick: () => void }) {
  const productImg = getProductImage(review.product_names)

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-[20px] border border-gray-100 p-5 bg-white text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
      style={{ width: '290px', boxShadow: '0 2px 16px rgba(0,0,64,0.06)' }}
    >
      {/* Top row: product image avatar + stars + product name */}
      <div className="flex items-start gap-3 mb-3">
        {/* Product image as profile */}
        <div className="w-12 h-12 rounded-[14px] bg-[#f0f2ff] border border-gray-100 overflow-hidden flex-shrink-0">
          <Image
            src={productImg}
            alt={review.product_names || 'Product'}
            width={48}
            height={48}
            className="object-contain w-full h-full p-1.5"
          />
        </div>
        <div className="flex-1 min-w-0">
          <Stars n={review.rating} size={11} />
          {review.product_names && (
            <p className="text-[10px] font-black text-[#0000ff] mt-1 truncate">
              {review.product_names.split(',')[0]}
            </p>
          )}
        </div>
      </div>

      {/* Comment */}
      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-3">
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Footer: reviewer + tap hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-gray-900">{shortName(review.guest_name)}</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" className="flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-[#0000ff] transition-colors">
          View full
        </span>
      </div>
    </button>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS)
  const [selected, setSelected] = useState<Review | null>(null)
  const [newReview, setNewReview] = useState<Review | null>(null)

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => {
        const live = d.reviews ?? []
        if (live.length > 0) {
          const ids = new Set(live.map((r: Review) => r.id))
          setReviews([...live, ...SEED_REVIEWS.filter(s => !ids.has(s.id))])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase.channel('reviews-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews', filter: 'status=eq.approved' }, payload => {
        const r = payload.new as Review
        setNewReview(r)
        setTimeout(() => setNewReview(null), 4500)
        setReviews(prev => [r, ...prev.filter(x => x.id !== r.id)])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, payload => {
        const r = payload.new as Review
        if (r.status === 'approved') {
          setNewReview(r)
          setTimeout(() => setNewReview(null), 4500)
          setReviews(prev => {
            const exists = prev.find(x => x.id === r.id)
            return exists ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]
          })
        } else if (r.status === 'rejected') {
          setReviews(prev => prev.filter(x => x.id !== r.id || x.id.startsWith('s')))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const doubled = [...reviews, ...reviews]
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section className="py-12 bg-white overflow-hidden">

      {/* New review live toast */}
      <AnimatePresence>
        {newReview && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #00a651, #007a3d)', minWidth: '280px' }}
          >
            <Stars n={newReview.rating} size={12} />
            <p className="text-white text-sm font-black">
              {shortName(newReview.guest_name)} just left a {newReview.rating}-star review!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review modal */}
      {selected && <ReviewModal review={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="text-center mb-8 px-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] mb-1 text-[#0000ff]">
          Customer Reviews
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
          Trusted by Kenyans
        </h2>
        <div className="flex items-center justify-center flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full">
            <Stars n={5} size={12} />
            <span className="text-sm font-black text-gray-900">{avg}</span>
            <span className="text-xs text-gray-400">({reviews.length} reviews)</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#0000ff" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-black text-blue-700">100+ units delivered in Kenya</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full">
            <span className="text-xs font-black text-green-700">Official EcoFlow &amp; BLUETTI Dealer</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 font-medium mt-3">
          Tap any review to read in full
        </p>
      </div>

      {/* Scrolling marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="overflow-hidden">
          <div className="flex gap-4" style={{ animation: 'scrollLeft 50s linear infinite', width: 'max-content' }}>
            {doubled.map((r, i) => (
              <ReviewCard key={`${r.id}-${i}`} review={r} onClick={() => setSelected(r)} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
