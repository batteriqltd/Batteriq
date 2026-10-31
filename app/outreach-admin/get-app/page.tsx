import type { Metadata } from 'next'
import QRCode from 'qrcode'
import { Download, MoreVertical, Plus, Share } from 'lucide-react'
import { GetAppHero } from './GetAppHero'

export const metadata: Metadata = {
  title: 'Get the App',
  robots: 'noindex, nofollow, noarchive',
}

export default async function GetAppPage() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  const installUrl = `${siteUrl}/outreach-admin/login`
  const qrDataUrl = await QRCode.toDataURL(installUrl, {
    margin: 1,
    width: 280,
    color: { dark: '#00004d', light: '#ffffff' },
  })

  return (
    <div className="min-h-screen bg-[#f3f6fc] text-[#00004d] px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-[920px]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="h-10 w-10 rounded-xl bg-[#00004d] flex items-center justify-center font-black text-white text-base">
              B
            </div>
            <span className="font-bold text-2xl tracking-tight text-[#00004d]">
              BatterIQ Console
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight">Install the console on your device</h1>
          <p className="mt-2 text-[15px] text-slate-500 max-w-[520px] mx-auto">
            Scan the code or open the link on your phone or laptop, sign in, then follow the steps
            for your device below to add it like a real app.
          </p>
        </div>

        <GetAppHero qrDataUrl={qrDataUrl} installUrl={installUrl} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DeviceCard
            id="ios-steps"
            title="iPhone / iPad"
            subtitle="Safari only — Chrome on iOS can't install apps"
            steps={[
              { icon: <Share className="w-4 h-4" />, text: 'Tap the Share button in Safari' },
              { icon: <Plus className="w-4 h-4" />, text: 'Scroll down, tap "Add to Home Screen"' },
              { icon: <Download className="w-4 h-4" />, text: 'Tap Add, then open it from your home screen' },
            ]}
            note="Push notifications only start working once it's on your home screen (iOS 16.4+) — opening the Safari tab isn't enough."
          />
          <DeviceCard
            title="Android"
            subtitle="Chrome (or any Chromium browser)"
            steps={[
              { icon: <MoreVertical className="w-4 h-4" />, text: 'Tap the ⋮ menu, top-right' },
              { icon: <Download className="w-4 h-4" />, text: 'Tap "Install app" or "Add to Home screen"' },
              { icon: <Download className="w-4 h-4" />, text: 'Confirm — it lands in your app drawer' },
            ]}
          />
          <DeviceCard
            title="Windows / Mac"
            subtitle="Chrome or Edge"
            steps={[
              { icon: <Download className="w-4 h-4" />, text: 'Click the install icon in the address bar' },
              { icon: <MoreVertical className="w-4 h-4" />, text: '…or ⋮ menu → "Install BatterIQ Console"' },
              { icon: <Download className="w-4 h-4" />, text: 'It opens in its own window from now on' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function DeviceCard({
  id,
  title,
  subtitle,
  steps,
  note,
}: {
  id?: string
  title: string
  subtitle: string
  steps: Array<{ icon: React.ReactNode; text: string }>
  note?: string
}) {
  return (
    <div id={id} className="rounded-[24px] bg-white border border-[#e3e9f5] p-5 scroll-mt-6">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-[12px] text-slate-400 mb-4">{subtitle}</p>
      <div className="space-y-3.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
              {s.icon}
            </span>
            <p className="text-[13px] font-medium text-[#00004d] leading-snug">{s.text}</p>
          </div>
        ))}
      </div>
      {note && <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">{note}</p>}
    </div>
  )
}
