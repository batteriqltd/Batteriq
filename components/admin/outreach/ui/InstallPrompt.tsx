'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Check, Download, MoreVertical, Plus, Share } from 'lucide-react'
import { Sheet } from './Sheet'

type NotifState = 'loading' | 'unsupported' | 'default' | 'enabling' | 'granted' | 'denied'
type Platform = 'ios' | 'android' | 'desktop'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/**
 * Install + push-notification controls for the outreach console.
 * Reuses the same service worker, VAPID keys, and /api/admin/push/*
 * endpoints as the main site's admin PWA (lib/push.ts, push_subscriptions
 * table) — only the manifest and UI are specific to this console.
 */
export function InstallPrompt() {
  const [state, setState] = useState<NotifState>('loading')
  const [installEvt, setInstallEvt] = useState<Event | null>(null)
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [showGuide, setShowGuide] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios')
    else if (/Android/i.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    const checkInstalled = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      setInstalled(!!standalone)
    }
    checkInstalled()
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', checkInstalled)
    return () => mq?.removeEventListener?.('change', checkInstalled)
  }, [])

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
          fetch('/api/admin/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          }).catch(() => {})
          if (!cancelled) setState('granted')
        } else {
          const ok = await subscribeDevice().catch(() => false)
          if (!cancelled) setState(ok ? 'granted' : 'default')
        }
      } catch {
        if (!cancelled) setState('default')
      }
    })()

    return () => { cancelled = true }
  }, [subscribeDevice])

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
    if (!vapidKey) return
    setState('enabling')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'default'); return }
      const ok = await subscribeDevice()
      if (!ok) throw new Error('save failed')
      setState('granted')
    } catch {
      setState('default')
    }
  }, [vapidKey, subscribeDevice])

  const handleInstall = useCallback(async () => {
    if (installEvt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(installEvt as any).prompt()
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (installEvt as any).userChoice
      } catch { /* ignore */ }
      setInstallEvt(null)
      return
    }
    setShowGuide(true)
  }, [installEvt])

  return (
    <>
      {!installed && (
        <button
          type="button"
          onClick={handleInstall}
          className="hidden md:inline-flex items-center gap-1.5 h-11 px-3.5 rounded-[var(--bq-radius-lg)] bg-[var(--bq-blue-light)] text-[var(--bq-blue-dim)] text-[12px] font-bold hover:bg-[var(--bq-border)] transition-colors"
          title="Install BatterIQ Console on this device"
        >
          <Download className="w-4 h-4" />
          <span>Install</span>
        </button>
      )}

      {state === 'default' && (
        <button
          type="button"
          onClick={enable}
          disabled={!vapidKey}
          className="hidden md:inline-flex items-center gap-1.5 h-11 px-3.5 rounded-[var(--bq-radius-lg)] bg-[var(--bq-blue)] hover:bg-[var(--bq-blue-dim)] text-white text-[12px] font-bold transition-colors disabled:opacity-50"
          title="Get instant alerts for WhatsApp, hot leads and failures"
        >
          <Bell className="w-4 h-4" /> Notify me
        </button>
      )}
      {state === 'granted' && (
        <span className="hidden md:inline-flex items-center gap-1.5 h-11 px-3 rounded-[var(--bq-radius-lg)] bg-[var(--bq-success-light)] text-[var(--bq-success)] text-[12px] font-bold">
          <BellRing className="w-4 h-4" /> On
        </span>
      )}
      {state === 'denied' && (
        <span
          className="hidden md:inline-flex items-center gap-1.5 h-11 px-3 rounded-[var(--bq-radius-lg)] bg-[var(--bq-warning-light)] text-[var(--bq-warning)] text-[12px] font-bold"
          title="Notifications blocked — enable in browser site settings"
        >
          <BellOff className="w-4 h-4" /> Blocked
        </span>
      )}

      <Sheet open={showGuide} onClose={() => setShowGuide(false)} title="Install BatterIQ Console">
        <InstallGuide platform={platform} />
      </Sheet>
    </>
  )
}

function InstallGuide({ platform }: { platform: Platform }) {
  const steps =
    platform === 'ios'
      ? [
          { icon: <Share className="w-4 h-4" />, text: 'Tap the Share button in Safari' },
          { icon: <Plus className="w-4 h-4" />, text: 'Scroll down and tap "Add to Home Screen"' },
          { icon: <Check className="w-4 h-4" />, text: 'Tap Add — then open BatterIQ from your home screen' },
        ]
      : platform === 'android'
      ? [
          { icon: <MoreVertical className="w-4 h-4" />, text: 'Tap the ⋮ menu (top-right in Chrome)' },
          { icon: <Download className="w-4 h-4" />, text: 'Tap "Install app" or "Add to Home screen"' },
          { icon: <Check className="w-4 h-4" />, text: 'Confirm Install — it lands in your app drawer' },
        ]
      : [
          { icon: <Download className="w-4 h-4" />, text: 'Click the install icon in the address bar' },
          { icon: <MoreVertical className="w-4 h-4" />, text: '…or ⋮ menu → "Install BatterIQ Console"' },
          { icon: <Check className="w-4 h-4" />, text: 'The app opens in its own window' },
        ]

  return (
    <div className="p-5 space-y-5">
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-[var(--bq-radius-md)] flex items-center justify-center flex-shrink-0 bg-[var(--bq-blue-light)] text-[var(--bq-blue)]">
              {s.icon}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-[var(--bq-text-tertiary)]">{i + 1}</span>
              <p className="bq-text-body font-semibold text-[var(--bq-text-primary)] leading-snug">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      {platform === 'ios' && (
        <p className="bq-text-caption text-[var(--bq-text-tertiary)] leading-relaxed">
          Note: push notifications on iPhone only start working once BatterIQ has been added to
          your home screen (iOS 16.4+) — opening it in the Safari tab isn&apos;t enough.
        </p>
      )}
    </div>
  )
}
