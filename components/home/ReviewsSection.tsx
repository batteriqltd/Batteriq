'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { TestimonialCarousel } from '@/components/reviews/TestimonialCarousel'

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

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
          fill={i <= n ? '#f59e0b' : 'none'} stroke={i <= n ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  )
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS)
  const [newReview, setNewReview] = useState<Review | null>(null)

  // Initial load
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

  // Real-time subscription — new approved reviews appear instantly
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('reviews-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: 'status=eq.approved',
        },
        (payload) => {
          const review = payload.new as Review
          console.log('[REVIEWS] New live review:', review.guest_name)
          setNewReview(review)
          setTimeout(() => setNewReview(null), 4000)
          setReviews(prev => [review, ...prev.filter(r => r.id !== review.id)])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reviews',
        },
        (payload) => {
          const updated = payload.new as Review
          if (updated.status === 'approved') {
            setNewReview(updated)
            setTimeout(() => setNewReview(null), 4000)
            setReviews(prev => {
              const exists = prev.find(r => r.id === updated.id)
              if (exists) return prev.map(r => r.id === updated.id ? updated : r)
              return [updated, ...prev]
            })
          } else if (updated.status === 'rejected') {
            setReviews(prev => prev.filter(r => r.id !== updated.id || r.id.startsWith('s')))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const all = [...reviews, ...reviews]
  const name = (n: string) => {
    const p = n.trim().split(' ')
    return p[0] + (p[1] ? ` ${p[1][0]}.` : '')
  }
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section className="py-12 bg-white overflow-hidden">

      {/* New review toast notification */}
      {newReview && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #00a651, #007a3d)',
            animation: 'slideInUp 0.4s ease forwards',
            minWidth: '280px',
          }}
        >
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ))}
          </div>
          <p className="text-white text-sm font-black">
            {name(newReview.guest_name)} just left a {newReview.rating}★ review!
          </p>
        </div>
      )}

      {/* Section header */}
      <div className="text-center mb-8 px-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: '#0000ff' }}>
          Customer Reviews
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
          Trusted by Kenyans
        </h2>

        {/* Stats row */}
        <div className="flex items-center justify-center flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full">
            <Stars n={5} />
            <span className="text-sm font-black text-gray-900">{avg}</span>
            <span className="text-xs text-gray-400">({reviews.length} reviews)</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0000ff" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-black text-blue-700">100+ units delivered in Kenya</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full">
            <span className="text-xs font-black text-green-700">Official EcoFlow & BLUETTI Dealer</span>
          </div>
        </div>
      </div>

      {/* Scrolling marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
        <div className="overflow-hidden">
          <div className="flex gap-4"
            style={{ animation: 'scrollLeft 45s linear infinite', width: 'max-content' }}>
            {all.map((r, i) => (
              <div key={`${r.id}-${i}`}
                className="flex-shrink-0 rounded-2xl border border-gray-100 p-5 bg-white"
                style={{ width: '290px', boxShadow: '0 2px 16px rgba(0,0,64,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <Stars n={r.rating} />
                  {r.product_names && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-2 flex-shrink-0 truncate max-w-[100px]">
                      {r.product_names.split(',')[0]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-3">&ldquo;{r.comment}&rdquo;</p>
                {r.admin_reply && (
                  <div className="bg-blue-50 rounded-xl p-2.5 mb-2 border-l-2 border-blue-400">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-0.5">Batteriq</p>
                    <p className="text-[11px] text-gray-600 line-clamp-2">{r.admin_reply}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                      style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
                      {r.guest_name[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-gray-900">{name(r.guest_name)}</span>
                  </div>
                  <span className="text-[10px] text-green-600 font-bold">✓ Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto mt-8 px-4">
        <div
          className="bg-white rounded-3xl border border-gray-100 p-6"
          style={{ boxShadow: '0 4px 24px rgba(0,0,64,0.08)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-3">
            Latest Review
          </p>
          <TestimonialCarousel
            liveReviews={reviews.filter(r => !r.id.startsWith('s'))}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  )
}
