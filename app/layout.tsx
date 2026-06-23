import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { VisitorTracker } from '@/components/analytics/VisitorTracker'
import { GSAPProvider } from '@/components/animations/GSAPProvider'
import { AOSProvider } from '@/components/animations/AOSProvider'
import './globals.css'

// Font variables — loaded via CSS globals to avoid build-time Google Fonts failures
const spaceGrotesk = { variable: '--font-display' }
const dmSans = { variable: '--font-body' }
const jetbrainsMono = { variable: '--font-mono' }

export const metadata: Metadata = {
  metadataBase: new URL('https://batteriq.com'),
  verification: {
    google: 'MGguyZgmNkfN_Ike_yZbWDRBIkhL-6GsU1yvHltKXQQ',
  },
  title: {
    default: 'Batteriq Kenya — Official EcoFlow & BLUETTI Dealer | Power Stations & Solar',
    template: '%s | Batteriq',
  },
  description:
    'Buy EcoFlow and BLUETTI power stations in Kenya. Official authorised dealer. M-Pesa payments. Nairobi delivery. 24-month warranty. EcoFlow Kenya, solar generators, portable power.',
  keywords: [
    'EcoFlow Kenya',
    'buy EcoFlow Kenya',
    'EcoFlow dealer Kenya',
    'EcoFlow Nairobi',
    'BLUETTI Kenya',
    'power station Kenya',
    'solar generator Kenya',
    'portable power station Kenya',
    'DELTA Pro Kenya',
    'RIVER 2 Kenya',
    'solar panel Kenya',
    'backup power Kenya',
    'M-Pesa power station',
    'buy BLUETTI Kenya',
    'EcoFlow DELTA 2 Kenya',
    'home battery Kenya',
    'load shedding solution Kenya',
    'KPLC backup power',
    'off grid power Kenya',
    'Batteriq',
  ],
  authors: [{ name: 'Batteriq Kenya', url: 'https://batteriq.com' }],
  creator: 'Batteriq Kenya',
  publisher: 'Batteriq Kenya',
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://batteriq.com',
    siteName: 'Batteriq Kenya',
    title: 'Batteriq Kenya — Official EcoFlow & BLUETTI Dealer',
    description:
      "Kenya's official EcoFlow and BLUETTI dealer. Buy power stations, solar panels, and batteries. M-Pesa accepted. Nairobi delivery.",
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Batteriq Kenya — EcoFlow & BLUETTI Official Dealer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Batteriq Kenya — EcoFlow & BLUETTI Official Dealer',
    description: 'Buy EcoFlow and BLUETTI in Kenya. M-Pesa accepted. Same-day Nairobi delivery.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://batteriq.com',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0000ff',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'Batteriq Solutions Ltd',
  alternateName: ['Batteriq Kenya', 'Batteriq'],
  url: 'https://batteriq.com',
  logo: 'https://batteriq.com/logo.png',
  description: "Kenya's official authorised EcoFlow and BLUETTI dealer. Power stations, solar panels, and home battery systems.",
  telephone: '+254-716-822-014',
  email: 'info@batteriq.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Nairobi',
    addressRegion: 'Nairobi County',
    addressCountry: 'KE',
  },
  geo: { '@type': 'GeoCoordinates', latitude: -1.286389, longitude: 36.817223 },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:30', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '16:00' },
  ],
  priceRange: 'KES 27,259+',
  paymentAccepted: 'M-Pesa',
  currenciesAccepted: 'KES',
  areaServed: { '@type': 'Country', name: 'Kenya' },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+254-716-822-014',
    contactType: 'customer service',
    areaServed: 'KE',
    availableLanguage: ['English', 'Swahili'],
  },
  sameAs: [
    'https://instagram.com/batteriqkenya',
    'https://facebook.com/batteriqkenya',
    'https://tiktok.com/@batteriqkenya',
    'https://linkedin.com/company/batteriq',
  ],
}

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Batteriq Solutions Ltd',
  image: 'https://batteriq.com/heroes/hero-power-stations.jpg',
  priceRange: 'KES 27,259 — KES 1,049,999',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Nairobi',
    addressRegion: 'Nairobi County',
    addressCountry: 'KE',
  },
  geo: { '@type': 'GeoCoordinates', latitude: -1.286389, longitude: 36.817223 },
  url: 'https://batteriq.com',
  telephone: '+254-716-822-014',
  email: 'info@batteriq.com',
  paymentAccepted: 'M-Pesa, Cash on Delivery',
  currenciesAccepted: 'KES',
  areaServed: { '@type': 'Country', name: 'Kenya' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:30', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '16:00' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <main id="main-content" className="pt-16 lg:pt-[72px]">{children}</main>
        <GSAPProvider />
        <AOSProvider />
        <VisitorTracker />
        <ChatWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
