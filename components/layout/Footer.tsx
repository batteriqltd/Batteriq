import Link from 'next/link'
import { WhatsAppIcon, EmailIcon } from '@/components/ui/ContactIcons'

const SHOP_LINKS = [
  { href: '/power-stations', label: 'Power Stations' },
  { href: '/solar', label: 'Solar Panels' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/ecoflow-kenya', label: 'EcoFlow Kenya' },
  { href: '/bluetti', label: 'Bluetti Kenya' },
]

const SUPPORT_LINKS = [
  { href: '/contact', label: 'Contact Us', external: false },
  { href: 'https://wa.me/254716822014', label: 'WhatsApp Us', external: true },
  { href: '/about', label: 'About Batteriq', external: false },
  { href: '/about#partner', label: 'Become a Partner', external: false },
  { href: '/about#blog', label: 'Blog', external: false },
  { href: '/about#careers', label: 'Careers', external: false },
  { href: '/privacy', label: 'Privacy Policy', external: false },
  { href: '/terms', label: 'Terms of Service', external: false },
]

const TRUST_BADGES = [
  { label: 'Official EcoFlow Dealer', color: '#0066CC', bg: '#EBF5FF', logo: undefined },
  { label: 'Official BLUETTI Dealer', color: '#E65100', bg: '#FFF3E0', logo: undefined },
  { label: 'M-Pesa Accepted', color: '#00A651', bg: '#F0FDF4', logo: '/logos/mpesa.png' },
  { label: 'eTIMS Invoice Issued', color: '#7c3aed', bg: '#F5F3FF', logo: undefined },
]

export function Footer() {
  return (
    <footer
      className="w-full bg-white border-t border-gray-100"
      style={{ boxShadow: '0 -1px 0 0 #f0f0f5' }}
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* TOP SECTION */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="font-black text-gray-900 text-xl tracking-tight">
                BATTERIQ<sup className="text-blue-600 text-[10px] font-bold">™</sup>
              </span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-[260px]">
              Kenya&apos;s official EcoFlow &amp; BLUETTI dealer.
              Portable power, solar panels, and home battery systems.
            </p>

            <div className="flex flex-col gap-2.5">
              <a
                href="tel:+254716822014"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                +254 716 822 014
              </a>

              <a
                href="https://wa.me/254716822014"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-green-600 transition-colors min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <WhatsAppIcon size={14} />
                </div>
                WhatsApp Us
              </a>

              <a
                href="mailto:info@batteriq.com"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <EmailIcon size={14} />
                </div>
                info@batteriq.com
              </a>
            </div>
          </div>

          {/* Column 2: Shop */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">
              Shop
            </h4>
            <ul className="space-y-3">
              {SHOP_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-medium text-gray-600 hover:text-blue-600 hover:translate-x-0.5 inline-block transition-all"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">
              Support
            </h4>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(({ href, label, external }) =>
                external ? (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-600 hover:text-blue-600 hover:translate-x-0.5 inline-block transition-all"
                    >
                      {label}
                    </a>
                  </li>
                ) : (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm font-medium text-gray-600 hover:text-blue-600 hover:translate-x-0.5 inline-block transition-all"
                    >
                      {label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Column 4: Business Hours + Trust Badges — hidden on mobile */}
          <div className="hidden sm:block">
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-5">
              Business Hours
            </h4>
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Mon &ndash; Sat</span>
                <span className="text-sm font-bold text-gray-900">8:30am &ndash; 6:00pm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sunday</span>
                <span className="text-sm font-bold text-gray-400">Closed</span>
              </div>
            </div>

            <div className="space-y-2">
              {TRUST_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: badge.bg }}
                >
                  {badge.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={badge.logo} alt={badge.label} className="h-4 w-auto object-contain flex-shrink-0" />
                  ) : (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: badge.color }}
                    />
                  )}
                  <span className="text-xs font-bold" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
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
            &copy; {new Date().getFullYear()} Batteriq Kenya. All rights reserved.
            Kenya&apos;s Official EcoFlow &amp; BLUETTI Dealer.
          </p>
          <div className="flex items-center gap-4">
            <a href="/support/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </a>
            <a href="/support/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </a>
            <a href="/contact" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>

    </footer>
  )
}
