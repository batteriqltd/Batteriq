'use client'

import { useState } from 'react'

export function HomepageNewsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-green-400 font-semibold text-center py-4">
        You&apos;re subscribed! Check your inbox for a welcome email.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 px-4 py-3 bg-bq-gray-900 border border-bq-gray-600 text-white rounded-[8px] placeholder:text-bq-gray-400 focus:outline-none focus:border-bq-blue transition-colors"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 bg-bq-blue text-white font-bold rounded-[8px] hover:bg-bq-blue-dim hover:shadow-blue-glow transition-all disabled:opacity-50"
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-red-400 text-sm w-full text-center">Something went wrong. Try again.</p>
      )}
    </form>
  )
}
