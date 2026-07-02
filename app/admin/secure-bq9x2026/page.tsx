'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ArrowRight,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  ShieldCheck
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const redirectTo = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'done'>('idle')

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
        setLoading(false)
        return
      }

      // Mark THIS app session as freshly authenticated. The cold-launch guard
      // reads this; it is wiped when the installed app is fully closed, so the
      // next launch forces the password again.
      try { sessionStorage.setItem('bq_admin_live', '1') } catch { /* ignore */ }

      // Start the cinematic loading sequence — 6 seconds total
      setLoadingPhase('phase1')
      await new Promise(r => setTimeout(r, 1500)) // Phase 1: 1.5s
      setLoadingPhase('phase2')
      await new Promise(r => setTimeout(r, 1500)) // Phase 2: 1.5s
      setLoadingPhase('phase3')
      await new Promise(r => setTimeout(r, 1500)) // Phase 3: 1.5s
      setLoadingPhase('phase4')
      await new Promise(r => setTimeout(r, 1000)) // Phase 4: 1s
      setLoadingPhase('done')
      await new Promise(r => setTimeout(r, 500))  // Brief pause before redirect
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
      setLoadingPhase('idle')
    }
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', Icon: Sun }
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', Icon: CloudSun }
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', Icon: Sunset }
    return { text: 'Good Night', Icon: Moon }
  }

  const greeting = getGreeting()

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#000022]">

      {loadingPhase !== 'idle' && <AdminLoadingScreen phase={loadingPhase} />}

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
            {reason && {
              inactivity: 'You were logged out due to 30 minutes of inactivity.',
              session_expired: 'Your session has expired. Please log in again.',
              logout: 'You have been logged out successfully.',
            }[reason] && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
                style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.25)' }}
              >
                <span className="text-base">{reason === 'logout' ? '✓' : '⏱️'}</span>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,210,100,0.9)' }}>
                  {{
                    inactivity: 'You were logged out due to 30 minutes of inactivity.',
                    session_expired: 'Your session has expired. Please log in again.',
                    logout: 'You have been logged out successfully.',
                  }[reason]}
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
                <greeting.Icon size={15} style={{ color: '#0000ff' }} strokeWidth={2.5} />
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

function AdminLoadingScreen({ phase }: { phase: 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'done' }) {
  const phases = {
    phase1: { label: 'Verifying credentials...', sublabel: 'Authenticating identity', progress: 20 },
    phase2: { label: 'Checking authorization...', sublabel: 'Validating admin privileges', progress: 50 },
    phase3: { label: 'One more step...', sublabel: 'Loading secure workspace', progress: 78 },
    phase4: { label: 'Welcome back, Admin', sublabel: 'Initializing operations console', progress: 95 },
    done: { label: 'Access Granted', sublabel: 'Redirecting to dashboard...', progress: 100 },
  }

  const current = phases[phase]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: '#000011' }}>

      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,100,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,100,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridMove 8s linear infinite',
        }} />

      {/* Radial glow */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,180,0.25) 0%, transparent 70%)' }} />

      {/* Scanning line */}
      <div className="absolute left-0 right-0 h-px opacity-60"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,150,255,0.8) 40%, rgba(0,255,200,1) 50%, rgba(0,150,255,0.8) 60%, transparent 100%)',
          animation: 'scanLine 3s ease-in-out infinite',
          boxShadow: '0 0 20px rgba(0,200,255,0.8)',
        }} />

      {/* Corner brackets */}
      {[
        { top: 20, left: 20, borderTop: true, borderLeft: true },
        { top: 20, right: 20, borderTop: true, borderRight: true },
        { bottom: 20, left: 20, borderBottom: true, borderLeft: true },
        { bottom: 20, right: 20, borderBottom: true, borderRight: true },
      ].map((c, i) => (
        <div key={i} className="absolute w-12 h-12 opacity-50"
          style={{
            top: c.top, left: (c as { left?: number }).left, right: (c as { right?: number }).right, bottom: (c as { bottom?: number }).bottom,
            borderTop: c.borderTop ? '2px solid rgba(0,200,255,0.8)' : 'none',
            borderBottom: (c as { borderBottom?: boolean }).borderBottom ? '2px solid rgba(0,200,255,0.8)' : 'none',
            borderLeft: c.borderLeft ? '2px solid rgba(0,200,255,0.8)' : 'none',
            borderRight: (c as { borderRight?: boolean }).borderRight ? '2px solid rgba(0,200,255,0.8)' : 'none',
          }} />
      ))}

      {/* Center content */}
      <div className="relative z-10 text-center px-8" style={{ maxWidth: 480 }}>

        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border-2 opacity-30"
            style={{ borderColor: 'rgba(0,200,255,0.6)', animation: 'spin 4s linear infinite' }} />
          <div className="absolute inset-3 rounded-full border opacity-50"
            style={{ borderColor: 'rgba(0,150,255,0.8)', animation: 'spin 2.5s linear infinite reverse' }} />
          <div className="absolute inset-6 rounded-full border-2"
            style={{ borderColor: 'rgba(0,255,200,0.9)', animation: 'spin 1.5s linear infinite' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full"
              style={{
                background: phase === 'done' ? '#00ff88' : 'rgba(0,200,255,1)',
                boxShadow: phase === 'done' ? '0 0 20px #00ff88, 0 0 40px #00ff88' : '0 0 20px rgba(0,200,255,1)',
                animation: 'pulseDot 1s ease-in-out infinite',
              }} />
          </div>
        </div>

        {/* BATTERIQ branding */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2"
            style={{ color: 'rgba(0,200,255,0.5)' }}>
            BATTERIQ™ SECURE PORTAL
          </p>
          <div className="h-px w-32 mx-auto mb-6"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)' }} />
        </div>

        {/* Phase message */}
        <div style={{ minHeight: 80 }}>
          <h2 className="font-black text-2xl mb-2 transition-all duration-500"
            style={{
              color: phase === 'done' ? '#00ff88' : '#ffffff',
              textShadow: phase === 'done' ? '0 0 30px #00ff88' : '0 0 20px rgba(0,200,255,0.5)',
              letterSpacing: '-0.02em',
            }}>
            {current.label}
          </h2>
          <p className="text-sm font-medium"
            style={{ color: 'rgba(150,200,255,0.6)' }}>
            {current.sublabel}
          </p>
        </div>

        {/* Security steps checklist */}
        <div className="mt-7 mx-auto text-left space-y-2" style={{ maxWidth: 280 }}>
          {[
            { label: 'Identity verified', done: ['phase2','phase3','phase4','done'].includes(phase) },
            { label: 'Admin privileges confirmed', done: ['phase3','phase4','done'].includes(phase) },
            { label: 'Secure session established', done: ['phase4','done'].includes(phase) },
            { label: 'Operations console ready', done: phase === 'done' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 transition-all duration-500"
              style={{ opacity: s.done ? 1 : 0.3 }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: s.done ? 'rgba(0,255,136,0.15)' : 'rgba(0,150,255,0.08)',
                  border: s.done ? '1px solid rgba(0,255,136,0.6)' : '1px solid rgba(0,150,255,0.25)',
                }}>
                {s.done ? (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12.5L9.5 18L20 6" stroke="#00ff88" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(0,150,255,0.5)' }} />
                )}
              </div>
              <span className="text-[11px] font-bold tracking-wide font-mono uppercase"
                style={{ color: s.done ? 'rgba(0,255,180,0.85)' : 'rgba(120,170,255,0.5)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-8 mx-auto" style={{ maxWidth: 320 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: 'rgba(0,200,255,0.4)' }}>
              SYSTEM ACCESS
            </span>
            <span className="text-[10px] font-black font-mono"
              style={{ color: 'rgba(0,200,255,0.7)' }}>
              {current.progress}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(0,100,255,0.15)', border: '1px solid rgba(0,150,255,0.2)' }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{
                width: `${current.progress}%`,
                background: phase === 'done'
                  ? 'linear-gradient(90deg, #00cc66, #00ff88)'
                  : 'linear-gradient(90deg, #0000ff, #00aaff, #00ffcc)',
                boxShadow: phase === 'done'
                  ? '0 0 14px #00ff88'
                  : '0 0 12px rgba(0,200,255,0.8)',
              }}>
              <div className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                  animation: 'shimmerSweep 1.4s ease-in-out infinite',
                }} />
            </div>
          </div>
        </div>

        {/* Scrolling hex codes for sci-fi effect */}
        <div className="mt-8 font-mono text-[9px] opacity-20 overflow-hidden"
          style={{ color: 'rgba(0,200,255,1)', height: 16 }}>
          {Array.from({ length: 8 }, (_, i) =>
            ((i * 0x1F3A7B + 0xA4C2E8) % 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()
          ).join('  ')}
        </div>

      </div>

      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
        @keyframes scanLine {
          0% { top: -2%; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { top: 102%; opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
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
