import Link from 'next/link'
import Image from 'next/image'
import { WhatsAppIcon, EmailIcon, InstagramIcon, FacebookIcon, TikTokIcon, LinkedInIcon } from '@/components/ui/ContactIcons'

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
  { href: '/track-order', label: 'Track My Order', external: false },
  { href: '/support/faq', label: 'FAQ', external: false },
  { href: '/support/warranty', label: 'Warranty', external: false },
  { href: '/about', label: 'About Batteriq', external: false },
  { href: '/about#partner', label: 'Become a Partner', external: false },
  { href: '/privacy', label: 'Privacy Policy', external: false },
]

// M-Pesa is intentionally not listed here — the "We Accept" strip below covers it.
const TRUST_BADGES = [
  { label: 'Official EcoFlow Dealer', color: '#0066CC', bg: '#EBF5FF' },
  { label: 'Official BLUETTI Dealer', color: '#E65100', bg: '#FFF3E0' },
  { label: 'eTIMS Invoice Issued', color: '#7c3aed', bg: '#F5F3FF' },
]

const SOCIALS = [
  { href: 'https://instagram.com/batteriqkenya', icon: <InstagramIcon size={20} />, label: 'Instagram' },
  { href: 'https://facebook.com/batteriqkenya', icon: <FacebookIcon size={20} />, label: 'Facebook' },
  { href: 'https://tiktok.com/@batteriqkenya', icon: <TikTokIcon size={20} />, label: 'TikTok' },
  { href: 'https://linkedin.com/company/batteriq', icon: <LinkedInIcon size={20} />, label: 'LinkedIn' },
  { href: 'https://wa.me/254716822014', icon: <WhatsAppIcon size={20} />, label: 'WhatsApp' },
]

function PhoneGlyph() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 mb-4 sm:mb-5">
      {children}
    </h4>
  )
}

export function Footer() {
  return (
    <footer
      className="w-full bg-white border-t border-gray-100"
      style={{ boxShadow: '0 -1px 0 0 #f0f0f5' }}
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* ── MAIN ────────────────────────────────────────────────────────────
          Mobile puts Shop and Support side by side so the footer reads as a
          proper directory instead of one long column of text. */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 sm:gap-x-8 lg:gap-8">

          {/* Brand + direct contact */}
          <div className="col-span-2 lg:col-span-1">
            <span className="font-black text-gray-900 text-xl tracking-tight block mb-3">
              BATTERIQ<sup className="text-blue-600 text-[10px] font-bold">™</sup>
            </span>

            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-[320px]">
              Kenya&apos;s official EcoFlow &amp; BLUETTI dealer.
              Portable power, solar panels, and home battery systems.
            </p>

            <div className="flex flex-col gap-1">
              <a
                href="tel:+254716822014"
                className="group inline-flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors py-2 -mx-1 px-1 rounded-lg"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-200 transition-colors">
                  <PhoneGlyph />
                </span>
                +254 716 822 014
              </a>

              <a
                href="https://wa.me/254716822014"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-green-600 transition-colors py-2 -mx-1 px-1 rounded-lg"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-green-200 transition-colors">
                  <WhatsAppIcon size={14} />
                </span>
                WhatsApp Us
              </a>

              <a
                href="mailto:info@batteriq.com"
                className="group inline-flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors py-2 -mx-1 px-1 rounded-lg"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-200 transition-colors">
                  <EmailIcon size={14} />
                </span>
                <span className="truncate">info@batteriq.com</span>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="space-y-1">
              {SHOP_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-1.5"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <ColumnHeading>Support</ColumnHeading>
            <ul className="space-y-1">
              {SUPPORT_LINKS.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-1.5"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors py-1.5"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Hours + trust — full width on mobile so it never gets squeezed */}
          <div className="col-span-2 lg:col-span-1">
            <ColumnHeading>Business Hours</ColumnHeading>

            <div className="rounded-2xl border border-gray-100 bg-[#fafafb] px-4 py-3 mb-5 max-w-sm lg:max-w-none">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-500">Mon &ndash; Sat</span>
                <span className="text-sm font-bold text-gray-900">8:30am &ndash; 6:00pm</span>
              </div>
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-500">Sunday</span>
                <span className="text-sm font-bold text-gray-400">Closed</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TRUST_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: badge.bg }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: badge.color }}
                  />
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── WE ACCEPT ───────────────────────────────────────────────────────
          The artwork already carries its own "We Accept" wording, so no
          heading is repeated here. */}
      <div className="border-t border-gray-100 bg-[#fafafb]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-7 sm:py-8">
          <Image
            src="/payment-methods.png"
            alt="We accept M-Pesa, Visa and Mastercard — secure payments"
            width={1174}
            height={230}
            sizes="(max-width: 640px) 92vw, 560px"
            className="w-full max-w-[560px] h-auto mx-auto rounded-2xl"
            style={{ boxShadow: '0 1px 4px rgba(16,24,40,0.06)' }}
          />
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-6">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:justify-between lg:gap-6">

            {/* Socials first on mobile — they are the tappable bit */}
            <div className="flex items-center gap-1 order-1 lg:order-2">
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center lg:text-left order-2 lg:order-1 leading-relaxed max-w-md lg:max-w-none">
              &copy; {new Date().getFullYear()} Batteriq Kenya. All rights reserved.
              <span className="block lg:inline lg:ml-1">
                Kenya&apos;s Official EcoFlow &amp; BLUETTI Dealer.
              </span>
            </p>

            <div className="flex items-center gap-5 order-3 pt-1 lg:pt-0">
              <Link href="/privacy" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                Contact
              </Link>
            </div>

          </div>
        </div>
      </div>

    </footer>
  )
}
