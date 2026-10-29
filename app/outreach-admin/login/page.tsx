'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, Eye, EyeOff, Loader2, Lock, ArrowRight } from 'lucide-react'

function OutreachLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/outreach-admin'
  const reason = searchParams.get('reason')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      try {
        sessionStorage.setItem('bq_admin_live', '1')
      } catch {
        // ignore storage restrictions
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'radial-gradient(circle at 50% 35%, #00004d 0%, #00001e 100%)',
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-white tracking-tighter">
            BATTERIQ<sup className="text-xs align-super text-blue-400">™</sup>
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300/70 mt-2">
            Outreach Agent Portal
          </p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-300" />
            </div>
          </div>

          <h1 className="text-xl font-black text-white text-center">Outreach Management Login</h1>
          <p className="text-xs text-blue-200/50 text-center mt-1.5 mb-7">
            Sign in to manage leads, daily Claude campaigns &amp; WhatsApp inbox
          </p>

          {reason === 'session_expired' && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/25 text-xs font-bold text-amber-200">
              Your session expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/50 mb-1.5 ml-1">
                Sales / Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sale@batteriq.com"
                className="w-full h-13 py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/50 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-13 py-3.5 px-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 py-3.5 mt-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Open Outreach Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-200/40">
            <Lock className="w-3 h-3 text-blue-400" />
            <span>Protected by Batteriq Admin Auth</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OutreachAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#00001e]" />}>
      <OutreachLoginForm />
    </Suspense>
  )
}
