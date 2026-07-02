'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, BellRing, BellOff, Download, Loader2, Check } from 'lucide-react'

type NotifState = 'loading' | 'unsupported' | 'default' | 'enabling' | 'granted' | 'denied'

// VAPID public key → Uint8Array for PushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function AdminPwaControls() {
  const [state, setState] = useState<NotifState>('loading')
  const [testing, setTesting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installEvt, setInstallEvt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  // Detect current notification/subscription state
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) { setState('unsupported'); return }

    if (Notification.permission === 'denied') { setState('denied'); return }
    if (Notification.permission === 'default') { setState('default'); return }

    // Permission granted — confirm an active subscription exists
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setState(sub ? 'granted' : 'default'))
      .catch(() => setState('default'))
  }, [])

  // Capture the Android install prompt
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallEvt(e)
    }
    function onInstalled() { setInstalled(true); setInstallEvt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    // Already running as an installed PWA?
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const enable = useCallback(async () => {
    if (!vapidKey) { alert('Push key not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY). Add it in Vercel and redeploy.'); return }
    setState('enabling')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'default'); return }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
      }

      const res = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!res.ok) throw new Error('save failed')
      setState('granted')
    } catch (err) {
      console.error('[push] enable failed:', err)
      setState('default')
      alert('Could not enable notifications. Please try again.')
    }
  }, [vapidKey])

  const sendTest = useCallback(async () => {
    setTesting(true)
    try {
      await fetch('/api/admin/push/test', { method: 'POST' })
    } catch { /* ignore */ }
    setTimeout(() => setTesting(false), 1200)
  }, [])

  const install = useCallback(async () => {
    if (!installEvt) return
    installEvt.prompt()
    try { await installEvt.userChoice } catch { /* ignore */ }
    setInstallEvt(null)
  }, [installEvt])

  return (
    <div className="flex items-center gap-2">
      {/* Install app (Android Chrome) */}
      {!installed && installEvt && (
        <button
          onClick={install}
          className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-black transition-all"
          style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', backdropFilter: 'blur(4px)' }}
          title="Install Batteriq Admin on this device"
        >
          <Download size={14} /> Install app
        </button>
      )}

      {/* Notification control */}
      {state === 'loading' ? null : state === 'unsupported' ? (
        <span className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold text-white/60"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <BellOff size={14} /> No push support
        </span>
      ) : state === 'denied' ? (
        <span className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold text-amber-200"
          style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.3)' }}
          title="Notifications are blocked. Enable them in your browser site settings.">
          <BellOff size={14} /> Blocked
        </span>
      ) : state === 'granted' ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-black text-white"
            style={{ background: 'rgba(0,166,81,0.25)', border: '1px solid rgba(0,166,81,0.4)' }}>
            <BellRing size={14} /> Notifications on
          </span>
          <button
            onClick={sendTest}
            disabled={testing}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-black text-white transition-all disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)' }}
            title="Send a test push to this device"
          >
            {testing ? <><Check size={14} /> Sent</> : 'Send test'}
          </button>
        </div>
      ) : (
        <button
          onClick={enable}
          disabled={state === 'enabling'}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-black text-white transition-all disabled:opacity-70"
          style={{ background: '#0000ff', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 14px rgba(0,0,255,0.35)' }}
          title="Get instant alerts for orders, payments and messages"
        >
          {state === 'enabling' ? <><Loader2 size={14} className="animate-spin" /> Enabling…</> : <><Bell size={14} /> Enable notifications</>}
        </button>
      )}
    </div>
  )
}
