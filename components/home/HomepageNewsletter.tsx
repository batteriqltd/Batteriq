'use client'

import { useState } from 'react'

export function HomepageNewsletter() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-black text-base">You are subscribed!</p>
        <p className="text-gray-400 text-sm mt-1">Check your inbox for a welcome email from Batteriq.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          aria-label="Your name"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          aria-label="Email address"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-6 py-3.5 bg-[#0000ff] text-white font-black text-sm rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Subscribing...
          </>
        ) : 'Subscribe to Newsletter'}
      </button>
      {status === 'error' && (
        <p className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>
      )}
      <p className="text-gray-500 text-xs text-center">No spam. Unsubscribe anytime.</p>
    </form>
  )
}
