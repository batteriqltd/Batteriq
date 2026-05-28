'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Star, MessageCircle, Reply, Trash2, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})

  useEffect(() => { loadReviews() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadReviews() {
    setLoading(true)
    const res = await fetch(`/api/admin/reviews?status=${filter}`)
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setLoading(false)
  }

  async function updateReview(id: string, updates: Record<string, unknown>) {
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    loadReviews()
  }

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={16}
          fill={s <= rating ? "#fbbf24" : "none"}
          className={s <= rating ? "text-[#fbbf24]" : "text-gray-200"}
        />
      ))}
    </div>
  )

  return (
    <div className="p-8 pb-12 bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Customer Sentiment</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Moderating social proof and feedback
          </p>
        </div>
        <div className="flex p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                filter === s
                  ? 'bg-[#0000ff] text-white shadow-lg shadow-blue-200'
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Scanning Review Database…</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
            <MessageCircle size={24} className="text-gray-300" />
          </div>
          <p className="text-[16px] font-black text-gray-900 tracking-tight">No {filter} reviews</p>
          <p className="text-sm font-medium text-gray-400 mt-1">New submissions will appear here for moderation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode='popLayout'>
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-[28px] p-8 transition-all hover:shadow-xl hover:shadow-blue-900/5 group"
                style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
              >
                <div className="flex items-start gap-8">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <StarRating rating={r.rating} />
                      <span className="text-[16px] font-black text-gray-900 tracking-tight">{r.guest_name}</span>
                      {r.order_number && (
                        <span className="text-[11px] font-black font-mono text-blue-600 bg-blue-50/50 px-3 py-1 rounded-lg uppercase tracking-wider">
                          ORDER {r.order_number}
                        </span>
                      )}
                      {r.product_names && (
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg">
                          {r.product_names.split(',')[0]}
                        </span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-[15px] text-gray-600 leading-relaxed mb-6 font-medium italic">&ldquo;{r.comment}&rdquo;</p>
                    )}

                    {/* Reply box */}
                    <div className="bg-gray-50 rounded-[20px] p-5 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Reply size={14} className="text-gray-400" />
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Official Store Reply</label>
                      </div>
                      <textarea
                        value={replyDraft[r.id] ?? r.admin_reply ?? ''}
                        onChange={e => setReplyDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Craft a public response to this customer..."
                        rows={2}
                        className="w-full px-4 py-3 text-[14px] font-medium rounded-xl border border-white bg-white/50 shadow-inner resize-none outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                      />
                      <AnimatePresence>
                        {replyDraft[r.id] !== undefined && replyDraft[r.id] !== (r.admin_reply ?? '') && (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onClick={() => updateReview(r.id, { admin_reply: replyDraft[r.id] })}
                            className="mt-3 h-9 px-6 bg-[#0000ff] text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
                          >
                            Commit Reply
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-4">
                      SUBMITTED ON {new Date(r.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0 pt-1">
                    {filter === 'pending' && (
                      <>
                        <button onClick={() => updateReview(r.id, { status: 'approved' })}
                          className="h-10 px-6 bg-green-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100">
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button onClick={() => updateReview(r.id, { status: 'rejected' })}
                          className="h-10 px-6 bg-gray-50 text-gray-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 border border-gray-100">
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}
                    {filter === 'approved' && (
                      <button onClick={() => updateReview(r.id, { status: 'rejected' })}
                        className="h-10 px-6 bg-gray-50 text-gray-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2">
                        <Trash2 size={14} />
                        Deactivate
                      </button>
                    )}
                    {filter === 'rejected' && (
                      <button onClick={() => updateReview(r.id, { status: 'approved' })}
                        className="h-10 px-6 bg-blue-50 text-blue-700 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2">
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}