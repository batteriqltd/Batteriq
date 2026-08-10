'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, BellRing, BellOff, Download, Loader2, Check, X, Share, MoreVertical, Plus } from 'lucide-react'

type NotifState = 'loading' | 'unsupported' | 'default' | 'enabling' | 'granted' | 'denied'
type Platform = 'ios' | 'android' | 'desktop'

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
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [showGuide, setShowGuide] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  // Platform + installed detection
  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios')
    else if (/Android/i.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    const checkInstalled = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true
      setInstalled(!!standalone)
    }
    checkInstalled()
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', checkInstalled)
    return () => mq?.removeEventListener?.('change', checkInstalled)
  }, [])

  // Subscribe this device and persist the subscription server-side.
  const subscribeDevice = useCallback(async (): Promise<boolean> => {
    if (!vapidKey) return false
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
    return res.ok
  }, [vapidKey])

  // Ask the browser to wake our service worker when connectivity returns, and
  // (where supported) to poll periodically. Both are best-effort: Chromium
  // honours them, Safari ignores them and relies on push + in-app catch-up.
  const registerCatchUp = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reg = await navigator.serviceWorker.ready as any
      await reg.sync?.register('bq-catchup').catch(() => {})

      const status = await navigator.permissions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.query({ name: 'periodic-background-sync' as any })
        .catch(() => null)
      if (status?.state === 'granted') {
        await reg.periodicSync?.register('bq-poll', { minInterval: 15 * 60 * 1000 }).catch(() => {})
      }
    } catch { /* unsupported — push TTL still covers the offline window */ }
  }, [])

  // Notification state — and silently repair a subscription the browser
  // dropped, which is the usual reason alerts "just stop" after a while.
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    if (Notification.permission === 'default') { setState('default'); return }

    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          // Re-save on every load so a wiped server row heals itself.
          fetch('/api/admin/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          }).catch(() => {})
          if (!cancelled) setState('granted')
        } else {
          // Permission is still granted, so re-subscribing needs no prompt.
          const ok = await subscribeDevice().catch(() => false)
          if (!cancelled) setState(ok ? 'granted' : 'default')
        }
        registerCatchUp()
      } catch {
        if (!cancelled) setState('default')
      }
    })()

    return () => { cancelled = true }
  }, [subscribeDevice, registerCatchUp])

  // Nudge the service worker to catch up whenever we come back online or the
  // window regains focus, so a missed push still surfaces.
  useEffect(() => {
    const ping = () => {
      navigator.serviceWorker?.ready
        .then(reg => reg.active?.postMessage({ type: 'BQ_CATCHUP' }))
        .catch(() => {})
      registerCatchUp()
    }
    window.addEventListener('online', ping)
    return () => window.removeEventListener('online', ping)
  }, [registerCatchUp])

  // Capture the native install prompt when the browser offers it
  useEffect(() => {
    function onBeforeInstall(e: Event) { e.preventDefault(); setInstallEvt(e) }
    function onInstalled() { setInstalled(true); setInstallEvt(null); setShowGuide(false) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
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
      const ok = await subscribeDevice()
      if (!ok) throw new Error('save failed')
      setState('granted')
      registerCatchUp()
    } catch (err) {
      console.error('[push] enable failed:', err)
      setState('default')
      alert('Could not enable notifications. Please try again.')
    }
  }, [vapidKey, subscribeDevice, registerCatchUp])

  const sendTest = useCallback(async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/push/test', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (data && data.success === false) {
        // A silent failure here is exactly what makes push feel broken —
        // say why instead of flashing a tick.
        alert(data.error ?? 'Could not send the test notification.')
      }
    } catch { /* ignore */ }
    setTimeout(() => setTesting(false), 1200)
  }, [])

  const handleInstall = useCallback(async () => {
    if (installEvt) {
      installEvt.prompt()
      try { await installEvt.userChoice } catch { /* ignore */ }
      setInstallEvt(null)
      return
    }
    // No native prompt available → show manual steps
    setShowGuide(true)
  }, [installEvt])

  return (
    <div className="flex items-center gap-2">
      {/* Install — ALWAYS visible until the app is actually installed */}
      {!installed && (
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-[12px] font-black transition-all"
          style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', backdropFilter: 'blur(4px)' }}
          title="Install Batteriq Admin on this device"
        >
          <Download size={14} />
          <span>Install app</span>
        </button>
      )}

      {/* Notifications */}
      {state === 'loading' ? null : state === 'unsupported' ? (
        <span className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <BellOff size={14} /> No push
        </span>
      ) : state === 'denied' ? (
        <span className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-[12px] font-bold text-amber-200"
          style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.3)' }} title="Notifications blocked — enable in browser site settings">
          <BellOff size={14} /> <span className="hidden sm:inline">Blocked</span>
        </span>
      ) : state === 'granted' ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-[12px] font-black text-white"
            style={{ background: 'rgba(0,166,81,0.25)', border: '1px solid rgba(0,166,81,0.4)' }}>
            <BellRing size={14} /> <span className="hidden sm:inline">Notifications on</span>
          </span>
          <button onClick={sendTest} disabled={testing}
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-[12px] font-black text-white transition-all disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)' }} title="Send a test push">
            {testing ? <><Check size={14} /> Sent</> : 'Test'}
          </button>
        </div>
      ) : (
        <button onClick={enable} disabled={state === 'enabling'}
          className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-xl text-[12px] font-black text-white transition-all disabled:opacity-70"
          style={{ background: '#0000ff', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 14px rgba(0,0,255,0.35)' }}
          title="Get instant alerts for orders, payments and messages">
          {state === 'enabling' ? <><Loader2 size={14} className="animate-spin" /> <span className="hidden sm:inline">Enabling…</span></> : <><Bell size={14} /> <span>Notify me</span></>}
        </button>
      )}

      {/* Install instructions sheet */}
      {showGuide && <InstallGuide platform={platform} onClose={() => setShowGuide(false)} />}
    </div>
  )
}

function InstallGuide({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const steps =
    platform === 'ios'
      ? [
          { icon: <Share size={16} />, text: 'Tap the Share button in Safari' },
          { icon: <Plus size={16} />, text: "Scroll down and tap “Add to Home Screen”" },
          { icon: <Check size={16} />, text: 'Tap Add — Batteriq appears on your home screen' },
        ]
      : platform === 'android'
      ? [
          { icon: <MoreVertical size={16} />, text: 'Tap the ⋮ menu (top-right in Chrome)' },
          { icon: <Download size={16} />, text: "Tap “Install app” or “Add to Home screen”" },
          { icon: <Check size={16} />, text: 'Confirm Install — it lands in your app drawer' },
        ]
      : [
          { icon: <Download size={16} />, text: 'Click the install icon in the address bar' },
          { icon: <MoreVertical size={16} />, text: "…or ⋮ menu → “Install Batteriq Admin”" },
          { icon: <Check size={16} />, text: 'The app opens in its own window' },
        ]

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,20,0.55)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-[360px] bg-white rounded-[24px] overflow-hidden" style={{ boxShadow: '0 30px 90px rgba(0,0,40,0.35)' }} onClick={e => e.stopPropagation()}>
        <div className="relative px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(135deg, #00004d, #0000cc)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={15} className="text-white" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/95 mx-auto mb-3 flex items-center justify-center">
            <Download size={24} style={{ color: '#00004d' }} />
          </div>
          <h3 className="text-white font-black text-lg tracking-tight">Install Batteriq Admin</h3>
          <p className="text-white/70 text-xs font-medium mt-1">Add it to your phone like a real app</p>
        </div>
        <div className="p-6 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eef2ff', color: '#0000ff' }}>{s.icon}</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-gray-300">{i + 1}</span>
                <p className="text-[13px] font-bold text-gray-700 leading-snug">{s.text}</p>
              </div>
            </div>
          ))}
          <button onClick={onClose} className="w-full h-11 rounded-xl text-white font-black text-sm mt-2" style={{ background: '#0000ff' }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
