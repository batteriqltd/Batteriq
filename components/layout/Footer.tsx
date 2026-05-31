import Link from 'next/link'
import { NewsletterForm } from './NewsletterForm'

const SHOP_LINKS = [
  { href: '/power-stations', label: 'Power Stations' },
  { href: '/solar', label: 'Solar Panels' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/ecoflow-kenya', label: 'EcoFlow Kenya' },
  { href: '/bluetti', label: 'Bluetti Kenya' },
]

const SUPPORT_LINKS = [
  { href: '/contact', label: 'Contact Us' },
  { href: 'https://wa.me/254716822014', label: 'WhatsApp Us', external: true },
  { href: '/about', label: 'About Batteriq' },
  { href: '/about#partner', label: 'Become a Partner' },
  { href: '/about#blog', label: 'Blog' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

const TRUST_BADGES = [
  { label: 'Official EcoFlow Dealer', color: '#0066CC', bg: '#EBF5FF' },
  { label: 'Official BLUETTI Dealer', color: '#E65100', bg: '#FFF3E0' },
  { label: 'M-Pesa Accepted',         color: '#00A651', bg: '#F0FDF4' },
  { label: 'eTIMS Invoice Issued',     color: '#7c3aed', bg: '#F5F3FF' },
]

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-100" style={{ boxShadow: '0 -1px 0 0 #f0f0f5' }}>

      {/* TOP SECTION */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* COLUMN 1 — Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="Batteriq" className="h-9 w-auto"
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <span className="font-black text-gray-900 text-xl tracking-tight">Batteriq</span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-[260px]">
              Kenya&apos;s official EcoFlow &amp; BLUETTI dealer.
              Portable power, solar panels, and home battery systems.
            </p>

            <div className="flex flex-col gap-2.5">
              <a href="tel:+254716822014"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors min-h-[44px]">
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                +254 716 822 014
              </a>

              <a href="https://wa.me/254716822014" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-green-600 transition-colors min-h-[44px]">
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" fill="#00A651" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.11 1.51 5.842L0 24l6.335-1.628A11.944 11.944 0 0012 24c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.726.978.993-3.63-.235-.374A9.793 9.793 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
                  </svg>
                </div>
                WhatsApp Us
              </a>

              <a href="mailto:info@batteriq.com"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors min-h-[44px]">
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                info@batteriq.com
              </a>
            </div>
          </div>

          {/* COLUMN 2 — Shop */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">Shop</h4>
            <ul className="space-y-3">
              {SHOP_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hover:translate-x-0.5 inline-block">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3 — Support */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">Support</h4>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hover:translate-x-0.5 inline-block">
                      {label}
                    </a>
                  ) : (
                    <Link href={href}
                      className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hover:translate-x-0.5 inline-block">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Newsletter — kept from original */}
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">Stay Updated</p>
              <p className="text-xs text-gray-400 mb-3">Get exclusive EcoFlow deals and energy tips.</p>
              <NewsletterForm />
            </div>
          </div>

          {/* COLUMN 4 — Business Hours + Badges (hidden on mobile) */}
          <div className="hidden sm:block">
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">Business Hours</h4>
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Mon – Sat</span>
                <span className="text-sm font-bold text-gray-900">8:30am – 6:00pm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sunday</span>
                <span className="text-sm font-bold text-gray-400">Closed</span>
              </div>
            </div>

            <div className="space-y-2">
              {TRUST_BADGES.map(badge => (
                <div key={badge.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: badge.bg }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: badge.color }} />
                  <span className="text-xs font-bold" style={{ color: badge.color }}>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 text-center sm:text-left">
            © {new Date().getFullYear()} Batteriq Kenya. All rights reserved. Kenya&apos;s Official EcoFlow &amp; BLUETTI Dealer.
          </p>
          <div className="flex items-center gap-4">
            <a href="/support/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Privacy</a>
            <a href="/support/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Terms</a>
            <a href="/contact" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </div>

    </footer>
  )
}
