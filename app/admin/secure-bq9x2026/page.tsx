'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password')
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

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid credentials')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' }
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' }
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' }
    return { text: 'Good Night', emoji: '🌙' }
  }

  const greeting = getGreeting()

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#000022]">

      <div
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, #00004d 0%, #000022 100%)' }}
      />

      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] admin-glow-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[120px] admin-glow-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-[460px] px-6 py-12">

        <div className="flex flex-col items-center mb-10 admin-login-animate">
          <div className="text-center">
            <span className="text-3xl font-black text-white tracking-tighter">
              BATTERIQ<sup className="text-xs align-super text-blue-400">™</sup>
            </span>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl shadow-black/50 admin-login-animate" style={{ animationDelay: '0.1s' }}>

          <div className="mb-10">
            {reason === 'inactivity' && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
                style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}
              >
                <span className="text-base">⏱️</span>
                <p className="text-sm font-bold text-orange-700">
                  You were logged out due to inactivity
                </p>
              </div>
            )}
            <div className="flex justify-center mb-4">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #f0f4ff, #e8f0ff)',
                  border: '1px solid #dde8ff',
                }}
              >
                <span className="text-base">{greeting.emoji}</span>
                <span className="text-sm font-black" style={{ color: '#0000ff' }}>
                  {greeting.text}
                </span>
                <span className="text-sm text-gray-400 font-medium">
                  — {new Date().toLocaleDateString('en-KE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight text-center">Admin Access</h1>
            <p className="text-blue-200/40 text-[13px] text-center mt-2 font-medium tracking-wide">Enter your secure credentials</p>
          </div>

          {error && (
            <div className="mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 admin-error-slide">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-blue-200/30 uppercase tracking-[0.2em] ml-2 transition-colors group-focus-within:text-blue-400">
                Email Identity
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@batteriq.com"
                  className="w-full h-[60px] px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-medium transition-all outline-none focus:bg-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-blue-200/30 uppercase tracking-[0.2em] ml-2 transition-colors group-focus-within:text-blue-400">
                Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e) }}
                  required
                  placeholder="••••••••"
                  className="w-full h-[60px] px-6 pr-14 rounded-2xl bg-white/5 border border-white/10 text-white font-medium transition-all outline-none focus:bg-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[60px] rounded-2xl bg-blue-600 text-white font-bold text-sm uppercase tracking-[0.15em] transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Unlock Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/5 pt-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Lock className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-black text-blue-200/40 uppercase tracking-[0.2em]">Secure Session</span>
            </div>
            <p className="text-[10px] text-white/10 font-bold uppercase tracking-widest">© 2026 BATTERIQ LTD</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

export default function SecureAdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
