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
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12 bg-[#f3f6fc] text-bq-gray-900 overflow-hidden selection:bg-bq-blue/15">
      {/* Soft brand ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 0%, rgba(37,99,235,0.07), transparent 60%), radial-gradient(800px 520px at 90% 100%, rgba(0,0,77,0.06), transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,77,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,77,0.035) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Wordmark */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bq-navy flex items-center justify-center font-display font-bold text-white text-base">
              B
            </div>
            <span className="font-display text-2xl sm:text-[26px] font-bold text-bq-navy tracking-tight">
              BATTERIQ<sup className="text-[10px] align-super text-bq-blue ml-0.5">™</sup>
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bq-gray-400 mt-3">
            Outreach Admin
          </p>
        </div>

        {/* Clean Card */}
        <div className="relative rounded-[26px] bg-white border border-[#e7edf8] p-7 sm:p-9 shadow-[0_30px_70px_-32px_rgba(0,0,77,0.28)] overflow-hidden">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-bq-navy" />

          <div className="mb-7">
            <h1 className="font-display text-xl sm:text-[22px] font-bold text-bq-navy tracking-tight">
              Welcome back
            </h1>
            <p className="text-[13px] text-bq-gray-400 mt-1.5">
              Sign in with your authorised account to continue.
            </p>
          </div>

          {reason === 'session_expired' && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-[#fff8eb] border border-[#f3e4c2] text-xs font-medium text-[#8a6116]">
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-[#fdf2f2] border border-[#f4d9d9] text-xs font-medium text-[#a63b3b]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="exec-email"
                className="block text-xs font-semibold text-bq-gray-600 mb-2"
              >
                Email address
              </label>
              <input
                id="exec-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@batteriq.com"
                className="w-full h-12 px-4 rounded-xl bg-[#f8faff] border border-[#e3e9f5] text-bq-navy placeholder:text-[#9aa6bf] text-sm font-medium outline-none transition-all focus:bg-white focus:border-bq-blue focus:ring-4 focus:ring-bq-blue/10"
              />
            </div>

            <div>
              <label
                htmlFor="exec-password"
                className="block text-xs font-semibold text-bq-gray-600 mb-2"
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
                  placeholder="Enter your password"
                  className="w-full h-12 px-4 pr-11 rounded-xl bg-[#f8faff] border border-[#e3e9f5] text-bq-navy placeholder:text-[#9aa6bf] text-sm font-medium outline-none transition-all focus:bg-white focus:border-bq-blue focus:ring-4 focus:ring-bq-blue/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9aa6bf] hover:text-bq-navy transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-bq-blue hover:bg-bq-blue-dim text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#eef2fa] flex items-center justify-center gap-2 text-[11px] font-medium text-bq-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-bq-blue" />
            <span>Restricted access · Batteriq Solutions Ltd</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#9aa6bf] mt-6">
          © {new Date().getFullYear()} Batteriq. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function OutreachAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fc]" />}>
      <ExecutiveSignInForm />
    </Suspense>
  )
}
