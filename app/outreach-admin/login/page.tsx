'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'

function ExecutiveSignInForm() {
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
      setError('Please enter your email address and password.')
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
        setError(data.error || 'Invalid credentials.')
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
      setError('Unable to verify credentials. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12 bg-[#060919] text-slate-100 overflow-hidden selection:bg-blue-500/30">
      {/* Subtle Architectural Grid + Ambient Sapphire Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full blur-[130px] bg-blue-600/20"
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand Wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/25">
              B
            </div>
            <span className="text-2xl sm:text-[26px] font-black text-white tracking-tight">
              BATTERIQ<sup className="text-[10px] align-super text-blue-400 ml-0.5">™</sup>
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-3">
            Executive Portal
          </p>
        </div>

        {/* Obsidian Frosted Card */}
        <div className="relative rounded-3xl bg-[#10162b]/85 backdrop-blur-2xl border border-white/[0.08] p-7 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
          />

          <div className="mb-7 text-center">
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Authorised Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Enter your corporate credentials to continue.
            </p>
          </div>

          {reason === 'session_expired' && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/25 text-xs font-semibold text-amber-200">
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-semibold text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="exec-email"
                className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2 ml-0.5"
              >
                Email Address
              </label>
              <input
                id="exec-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full h-12 px-4 rounded-xl bg-[#090e1d] border border-white/10 text-white placeholder:text-slate-600 text-sm font-medium outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="exec-password"
                className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2 ml-0.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="exec-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 px-4 pr-11 rounded-xl bg-[#090e1d] border border-white/10 text-white placeholder:text-slate-600 text-sm font-medium outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs uppercase tracking-[0.16em] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400/80" />
            <span>Restricted Access · Batteriq Solutions Ltd</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OutreachAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060919]" />}>
      <ExecutiveSignInForm />
    </Suspense>
  )
}
