import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'BatterIQ Console',
    template: '%s | BatterIQ Console',
  },
  description: 'BatterIQ outreach console — leads, quotes, WhatsApp and email pipeline.',
  manifest: '/outreach-admin-manifest.webmanifest',
  robots: 'noindex, nofollow, noarchive',
  appleWebApp: {
    capable: true,
    title: 'BatterIQ',
    statusBarStyle: 'black-translucent',
    startupImage: [
      { url: '/outreach-icons/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px)' },
      { url: '/outreach-icons/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px)' },
      { url: '/outreach-icons/splash-1536x2048.png', media: '(device-width: 768px) and (device-height: 1024px)' },
    ],
  },
  icons: {
    icon: '/outreach-icons/icon-512.png',
    apple: '/outreach-icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#00004d',
}

export default function OutreachAdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
