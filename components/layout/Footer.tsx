import Link from 'next/link'
import { NewsletterForm } from './NewsletterForm'

const SHOP_LINKS = [
  { href: '/power-stations', label: 'Power Stations' },
  { href: '/solar', label: 'Solar Panels' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/ecoflow-kenya', label: 'EcoFlow Kenya' },
  { href: '/bluetti', label: 'Bluetti Kenya' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About Batteriq' },
  { href: '/about#partner', label: 'Become a Partner' },
  { href: '/about#blog', label: 'Blog' },
  { href: '/about#careers', label: 'Careers' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

export function Footer() {
  return (
    <footer className="bg-bq-black border-t border-bq-gray-800" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12">
          {/* Shop */}
          <div data-aos="fade-up" data-aos-duration="600" data-aos-delay="0" data-aos-once="true">
            <h3 className="text-xs font-bold text-bq-gray-400 uppercase tracking-widest mb-4">Shop</h3>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/70 hover:text-bq-blue transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div data-aos="fade-up" data-aos-duration="600" data-aos-delay="80" data-aos-once="true">
            <h3 className="text-xs font-bold text-bq-gray-400 uppercase tracking-widest mb-4">Support</h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-white/70 hover:text-bq-blue transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/254716822014"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-bq-blue transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div data-aos="fade-up" data-aos-duration="600" data-aos-delay="160" data-aos-once="true">
            <h3 className="text-xs font-bold text-bq-gray-400 uppercase tracking-widest mb-4">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/70 hover:text-bq-blue transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter + Payments */}
          <div data-aos="fade-up" data-aos-duration="600" data-aos-delay="240" data-aos-once="true">
            <h3 className="text-xs font-bold text-bq-gray-400 uppercase tracking-widest mb-4">Stay Updated</h3>
            <p className="text-sm text-white/60 mb-4">Get exclusive EcoFlow deals and energy tips.</p>
            <NewsletterForm />

          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-bq-gray-800 pt-8">
          {/* Logo & tagline */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col leading-none">
              <span className="font-black text-[20px] tracking-tight text-white leading-none">
                BATTERIQ<sup className="text-bq-blue text-[10px] font-bold">™</sup>
              </span>
              <span className="text-[9px] text-bq-gray-400 tracking-[0.15em] font-medium uppercase leading-none mt-0.5">
                Guarantee your Uptime
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-bq-gray-400">
              <span className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-700/40 px-2.5 py-1 rounded-full font-semibold text-blue-300">
                ✓ Official EcoFlow Distributor
              </span>
              <span className="text-bq-gray-600">·</span>
              <span>Warranty Guaranteed</span>
              <span className="text-bq-gray-600">·</span>
              <span className="flex items-center gap-1.5">
                <img src="/logos/kenya-flag.jpg" alt="Kenya" className="h-4 w-auto object-contain" />
                Nairobi, Kenya
              </span>
            </div>
          </div>

          <p className="mt-6 text-xs text-bq-gray-400">
            © {new Date().getFullYear()} Batteriq Solutions Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
