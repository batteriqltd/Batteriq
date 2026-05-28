'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Review {
  id: string
  guest_name: string
  rating: number
  comment: string
  product_names: string
  created_at: string
}

interface Props {
  liveReviews: Review[]
}

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

export function TestimonialCarousel({ liveReviews }: Props) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (liveReviews.length <= 1) return
    const t = setInterval(() => {
      setIdx(i => (i + 1) % liveReviews.length)
    }, 4000)
    return () => clearInterval(t)
  }, [liveReviews.length])

  if (liveReviews.length === 0) return null

  const r = liveReviews[idx]
  const parts = r.guest_name.trim().split(' ')
  const displayName = parts[0] + (parts[1] ? ` ${parts[1][0]}.` : '')

  return (
    <div>
      <div className="overflow-hidden relative" style={{ minHeight: '110px' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Stars n={r.rating} />
            <p className="text-sm text-gray-700 leading-relaxed mt-2 mb-3">
              &ldquo;{r.comment}&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
              >
                {r.guest_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900">{displayName}</p>
                {r.product_names && (
                  <p className="text-[10px] text-gray-400 truncate">{r.product_names.split(',')[0]}</p>
                )}
              </div>
              <span className="text-[10px] text-green-600 font-bold flex-shrink-0">✓ Verified</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {liveReviews.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {liveReviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
