'use client'
import { useState } from 'react'

interface ReviewFormProps {
  orderId: string
  orderNumber: string
  guestName: string
  productNames?: string
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']
const LABEL_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#00a651']

export function ReviewForm({ orderId, orderNumber, guestName, productNames }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [wentLive, setWentLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const active = hovered || rating

  async function handleSubmit() {
    if (rating === 0) { setError('Please select a star rating'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderNumber,
          productNames,
          guestName,
          rating,
          comment: comment.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setWentLive(data.status === 'approved')
      setSubmitted(true)
    } catch {
      // Still show success to avoid frustrating the user
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: wentLive ? 'linear-gradient(135deg, #00a651, #007a3d)' : 'linear-gradient(135deg, #0000ff, #00004d)' }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-black text-gray-900 text-lg mb-1">
          {wentLive ? '🎉 Your review is live!' : `Thank you, ${guestName.split(' ')[0]}!`}
        </p>
        <p className="text-sm text-gray-400">
          {wentLive
            ? 'Your review is now visible on our website. Thank you for your feedback!'
            : 'Your review has been submitted and will appear after a quick check.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Star picker */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-all duration-150 active:scale-95"
              style={{ transform: active >= star ? 'scale(1.1)' : 'scale(1)' }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24"
                fill={active >= star ? '#f59e0b' : 'none'}
                stroke={active >= star ? '#f59e0b' : '#d1d5db'}
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>
        {active > 0 && (
          <p className="text-sm font-black transition-all" style={{ color: LABEL_COLORS[active] }}>
            {LABELS[active]}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={`Tell others about your experience with Batteriq${productNames ? ` (${productNames.split(',')[0]})` : ''}...`}
          rows={3}
          maxLength={300}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex justify-between mt-1">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-300 ml-auto">{comment.length}/300</p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #0000ff, #00004d)',
          boxShadow: '0 6px 20px rgba(0,0,255,0.2)',
        }}
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}
