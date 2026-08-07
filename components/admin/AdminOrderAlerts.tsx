'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Phone, X, Volume2, VolumeX, MessageSquare, ArrowRight, Mail } from 'lucide-react'

interface AdminAlert {
  kind: 'order' | 'message'
  id: string
  createdAt: string
  title: string
  subtitle: string
  url: string
  orderNumber?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  totalKes?: number
  paymentMethod?: string
  paymentStatus?: string
  itemCount?: number
  items?: { name: string; quantity: number }[]
}

const CURSOR_KEY = 'bq_admin_alert_cursor'
const SEEN_KEY = 'bq_admin_alert_seen'
const MUTE_KEY = 'bq_admin_alert_muted'
const POLL_MS = 7000
const MAX_VISIBLE = 6
const MAX_SEEN = 300

// ── Alert chime ───────────────────────────────────────────────
// Synthesised with WebAudio so there is no audio file to ship or 404 on.
let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    try { audioCtx = new Ctor() } catch { return null }
  }
  return audioCtx
}

function playChime(kind: 'order' | 'message') {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  // Rising triad for orders (celebratory), softer two-note for messages
  const notes = kind === 'order' ? [880, 1174.66, 1567.98] : [698.46, 932.33]
  const start = ctx.currentTime + 0.02

  notes.forEach((freq, i) => {
    const at = start + i * 0.15
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.32, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.5)
  })
}

function buzz(kind: 'order' | 'message') {
  try {
    navigator.vibrate?.(kind === 'order' ? [220, 90, 220, 90, 420] : [160, 80, 160])
  } catch { /* unsupported */ }
}

function fmtKes(n: number) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (!isFinite(diff) || diff < 45_000) return 'just now'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
}

const PAYMENT_LABEL: Record<string, string> = {
  mpesa_now: 'M-Pesa (paid now)',
  cod_cash: 'Cash on delivery',
  cod_mpesa: 'M-Pesa on delivery',
}

export function AdminOrderAlerts() {
  const router = useRouter()
  const [queue, setQueue] = useState<AdminAlert[]>([])
  const [muted, setMuted] = useState(false)

  const cursorRef = useRef<string | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const inFlightRef = useRef(false)
  const stoppedRef = useRef(false)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = muted }, [muted])

  const persistSeen = useCallback(() => {
    const arr = Array.from(seenRef.current).slice(-MAX_SEEN)
    seenRef.current = new Set(arr)
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(arr)) } catch { /* quota */ }
  }, [])

  const poll = useCallback(async () => {
    if (inFlightRef.current || stoppedRef.current) return
    inFlightRef.current = true
    try {
      const since = cursorRef.current
      const res = await fetch(
        `/api/admin/alerts${since ? `?since=${encodeURIComponent(since)}` : ''}`,
        { cache: 'no-store' }
      )
      // Session expired — stop hammering the endpoint until the page reloads
      if (res.status === 401) { stoppedRef.current = true; return }
      if (!res.ok) return

      const data = await res.json() as { serverTime?: string; alerts?: AdminAlert[] }

      if (data.serverTime) {
        cursorRef.current = data.serverTime
        try { localStorage.setItem(CURSOR_KEY, data.serverTime) } catch { /* quota */ }
      }

      const fresh = (data.alerts ?? []).filter(a => !seenRef.current.has(`${a.kind}:${a.id}`))
      if (fresh.length === 0) return

      fresh.forEach(a => seenRef.current.add(`${a.kind}:${a.id}`))
      persistSeen()

      setQueue(prev => [...prev, ...fresh].slice(-MAX_VISIBLE))

      const kind = fresh.some(a => a.kind === 'order') ? 'order' : 'message'
      if (!mutedRef.current) playChime(kind)
      buzz(kind)
    } catch {
      /* network blip — the cursor is unchanged, so the next poll retries */
    } finally {
      inFlightRef.current = false
    }
  }, [persistSeen])

  // Boot: restore cursor + seen ids, then poll on a heartbeat
  useEffect(() => {
    try {
      cursorRef.current = localStorage.getItem(CURSOR_KEY)
      const raw = localStorage.getItem(SEEN_KEY)
      if (raw) seenRef.current = new Set(JSON.parse(raw) as string[])
      // Write the ref directly too — the first poll fires before the state
      // sync effect runs, and a muted admin should not hear that one.
      const storedMute = localStorage.getItem(MUTE_KEY) === '1'
      mutedRef.current = storedMute
      setMuted(storedMute)
    } catch { /* private mode */ }

    poll()

    // Foreground polls every 7s; backgrounded tabs drop to every 21s (the tab
    // title still flashes, and Web Push covers the fully-closed case).
    let tick = 0
    const id = setInterval(() => {
      tick++
      if (document.hidden && tick % 3 !== 0) return
      poll()
    }, POLL_MS)

    const onWake = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [poll])

  // Browsers block audio until the user has interacted with the page —
  // resume the context on the first gesture so the very next order is audible.
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioCtx()
      if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Keep chiming while an alert sits unattended, so it is not missed if the
  // admin stepped away. Stops on dismiss, on mute, or after ~60 seconds.
  useEffect(() => {
    if (queue.length === 0 || muted) return
    let rings = 0
    const id = setInterval(() => {
      rings++
      if (rings > 5) { clearInterval(id); return }
      playChime(queue.some(a => a.kind === 'order') ? 'order' : 'message')
    }, 12000)
    return () => clearInterval(id)
  }, [queue, muted])

  // Flash the tab title so a backgrounded admin tab still screams for attention
  useEffect(() => {
    if (queue.length === 0) return
    const original = document.title
    const orders = queue.filter(a => a.kind === 'order').length
    const label = orders > 0
      ? `(${orders}) 🔔 NEW ORDER${orders > 1 ? 'S' : ''}`
      : `(${queue.length}) 💬 NEW MESSAGE`
    let on = false
    const id = setInterval(() => {
      on = !on
      document.title = on ? label : original
    }, 1100)
    return () => {
      clearInterval(id)
      document.title = original
    }
  }, [queue])

  const dismiss = useCallback((key: string) => {
    setQueue(prev => prev.filter(a => `${a.kind}:${a.id}` !== key))
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0') } catch { /* quota */ }
      if (!next) playChime('message')
      return next
    })
  }, [])

  const open = useCallback((alert: AdminAlert) => {
    dismiss(`${alert.kind}:${alert.id}`)
    router.push(alert.url)
  }, [dismiss, router])

  // Newest alert takes the stage; anything older stacks underneath it
  const current = queue.length > 0 ? queue[queue.length - 1] : null
  const rest = queue.slice(0, -1).reverse()
  const isOrder = current?.kind === 'order'

  return (
    <AnimatePresence>
      {current && (
      <motion.div
        key="alert-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,20,0.62)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) dismiss(`${current.kind}:${current.id}`) }}
      >
        <motion.div
          key={`${current.kind}:${current.id}`}
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="w-full max-w-[420px] rounded-[28px] overflow-hidden bg-white flex flex-col max-h-[92vh]"
          style={{ boxShadow: '0 40px 100px rgba(0,0,40,0.5)' }}
        >
          {/* Banner */}
          <div
            className="relative px-6 pt-6 pb-5 flex-shrink-0"
            style={{
              background: isOrder
                ? 'linear-gradient(135deg, #00A651 0%, #007a3d 100%)'
                : 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)' }}
                >
                  {isOrder ? <ShoppingBag size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
                </motion.div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                      {isOrder ? 'New Order' : 'New Message'}
                    </p>
                  </div>
                  <p className="text-white font-black text-[19px] leading-tight tracking-tight truncate">
                    {current.customerName ?? 'Customer'}
                  </p>
                  <p className="text-white/70 text-[11px] font-bold mt-0.5">
                    {timeAgo(current.createdAt)}
                    {current.orderNumber && <span className="font-mono"> · {current.orderNumber}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={toggleMute}
                  title={muted ? 'Unmute alert sound' : 'Mute alert sound'}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.16)' }}
                >
                  {muted ? <VolumeX size={16} className="text-white/70" /> : <Volume2 size={16} className="text-white" />}
                </button>
                <button
                  onClick={() => dismiss(`${current.kind}:${current.id}`)}
                  title="Dismiss"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.16)' }}
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {isOrder ? (
              <>
                <div className="rounded-2xl px-5 py-4 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-1">Order Total</p>
                  <p className="text-[30px] font-black font-mono text-green-700 leading-none tracking-tight">
                    {fmtKes(current.totalKes ?? 0)}
                  </p>
                  {current.paymentMethod && (
                    <p className="text-[11px] font-bold text-green-600/80 mt-2">
                      {PAYMENT_LABEL[current.paymentMethod] ?? current.paymentMethod}
                    </p>
                  )}
                </div>

                {current.items && current.items.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      {current.itemCount ?? current.items.length} item{(current.itemCount ?? 1) > 1 ? 's' : ''}
                    </p>
                    {current.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="font-bold text-gray-700 truncate">{it.name}</span>
                        <span className="font-black font-mono text-gray-400 flex-shrink-0">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl px-5 py-4" style={{ background: '#f8f9fb', border: '1px solid #e8ebf2' }}>
                <p className="text-[13px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {current.subtitle}
                </p>
              </div>
            )}

            {(current.customerPhone || current.customerEmail) && (
              <div className="flex flex-col gap-1.5 pt-1">
                {current.customerPhone && (
                  <a href={`tel:${current.customerPhone}`} className="flex items-center gap-2.5 text-[13px] font-bold text-gray-600 hover:text-blue-600 transition-colors">
                    <Phone size={14} className="text-gray-300" /> {current.customerPhone}
                  </a>
                )}
                {current.customerEmail && (
                  <a href={`mailto:${current.customerEmail}`} className="flex items-center gap-2.5 text-[13px] font-bold text-gray-600 hover:text-blue-600 transition-colors truncate">
                    <Mail size={14} className="text-gray-300 flex-shrink-0" /> <span className="truncate">{current.customerEmail}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 pt-1 space-y-2.5 flex-shrink-0">
            <button
              onClick={() => open(current)}
              className="w-full h-14 rounded-2xl text-white font-black text-[14px] uppercase tracking-wider flex items-center justify-center gap-2.5 transition-transform hover:-translate-y-0.5"
              style={{
                background: isOrder ? 'linear-gradient(135deg, #00A651, #007a3d)' : 'linear-gradient(135deg, #0000ff, #00004d)',
                boxShadow: isOrder ? '0 10px 30px rgba(0,166,81,0.35)' : '0 10px 30px rgba(0,0,255,0.32)',
              }}
            >
              {isOrder ? 'Open Order' : 'Open Messages'} <ArrowRight size={17} />
            </button>

            <div className="flex items-center gap-2.5">
              {current.customerPhone && (
                <a
                  href={`tel:${current.customerPhone}`}
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black text-gray-600 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <Phone size={15} /> Call
                </a>
              )}
              <button
                onClick={() => dismiss(`${current.kind}:${current.id}`)}
                className="flex-1 h-12 rounded-2xl text-[13px] font-black text-gray-400 bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>

            {/* Anything else that landed while this popup was open */}
            {rest.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {rest.length} more waiting
                  </p>
                  <button onClick={() => setQueue([])} className="text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-red-500 transition-colors">
                    Dismiss all
                  </button>
                </div>
                {rest.map(a => (
                  <button
                    key={`${a.kind}:${a.id}`}
                    onClick={() => open(a)}
                    className="w-full flex items-center gap-3 px-3.5 h-12 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors text-left"
                  >
                    {a.kind === 'order'
                      ? <ShoppingBag size={14} className="text-green-500 flex-shrink-0" />
                      : <MessageSquare size={14} className="text-blue-500 flex-shrink-0" />}
                    <span className="text-[12px] font-bold text-gray-600 truncate flex-1">{a.subtitle}</span>
                    <ArrowRight size={13} className="text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
