'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, Check, Download, Share } from 'lucide-react'

type Platform = 'ios' | 'android' | 'desktop'

/**
 * A QR code is only useful when the viewer is on a DIFFERENT device than the
 * one they're looking at (desktop -> scan with phone). Someone who opens
 * this link already on their phone should get a direct "install now" action
 * instead, not a code pointing back at the device it's displayed on.
 */
export function GetAppHero({ qrDataUrl, installUrl }: { qrDataUrl: string; installUrl: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [installEvt, setInstallEvt] = useState<Event | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios')
    else if (/Android/i.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    setInstalled(!!standalone)
  }, [])

  useEffect(() => {
    function onBeforeInstall(e: Event) { e.preventDefault(); setInstallEvt(e) }
    function onInstalled() { setInstalled(true); setInstallEvt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstallClick() {
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
    // No native prompt available (iOS, or a browser that hasn't fired the
    // event yet) — jump to the manual steps instead of doing nothing.
    document.getElementById('ios-steps')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Still detecting platform — render nothing that would flash and swap.
  if (platform === null) return <div className="mb-10" />

  if (installed) {
    return (
      <div className="rounded-[28px] bg-white border border-[#e3e9f5] shadow-[0_20px_50px_-20px_rgba(0,0,77,0.15)] p-8 text-center mb-10">
        <span className="inline-flex h-12 w-12 rounded-full bg-[#ecfdf3] text-[#15803d] items-center justify-center mb-3">
          <Check className="w-6 h-6" />
        </span>
        <p className="text-base font-bold text-[#00004d]">Already installed on this device</p>
        <p className="text-[13px] text-slate-500 mt-1">You&apos;re all set — open it from your home screen.</p>
      </div>
    )
  }

  if (platform === 'desktop') {
    return (
      <div className="rounded-[28px] bg-white border border-[#e3e9f5] shadow-[0_20px_50px_-20px_rgba(0,0,77,0.15)] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-8 mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR code to open the BatterIQ Console sign-in page on your phone" width={200} height={200} className="rounded-2xl border border-[#e3e9f5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">On this computer</p>
          {installEvt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Install on this device
            </button>
          ) : (
            <p className="text-[13px] text-slate-500">Use the install icon in your browser&apos;s address bar.</p>
          )}
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mt-5 mb-1">On your phone</p>
          <p className="text-[13px] text-slate-500">Scan the QR code, or open:</p>
          <a href={installUrl} className="text-base sm:text-lg font-bold text-[#2563eb] break-words hover:underline">
            {installUrl.replace('https://', '')}
          </a>
          <p className="mt-4 text-[12px] text-slate-400">
            You&apos;ll need your BatterIQ login to get in — ask your manager if you don&apos;t have one yet.
          </p>
        </div>
      </div>
    )
  }

  // iOS or Android, viewed directly on the phone — no QR code, a direct action instead.
  return (
    <div className="rounded-[28px] bg-white border border-[#e3e9f5] shadow-[0_20px_50px_-20px_rgba(0,0,77,0.15)] p-6 sm:p-8 text-center mb-10">
      <p className="text-[13px] font-semibold text-slate-500 mb-4">You&apos;re already on your phone — install it directly below.</p>
      {platform === 'android' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-base transition-colors"
        >
          <Download className="w-5 h-5" /> Install BatterIQ Console
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-base transition-colors"
        >
          <Share className="w-5 h-5" /> Show me how <ArrowDown className="w-4 h-4" />
        </button>
      )}
      <p className="mt-4 text-[12px] text-slate-400">
        Not ready yet? <a href={installUrl} className="text-[#2563eb] font-semibold hover:underline">Open the sign-in page</a> instead.
      </p>
    </div>
  )
}
