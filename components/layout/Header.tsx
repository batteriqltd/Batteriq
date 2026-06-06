'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, Menu, ChevronDown } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'
import { useUIStore } from '@/store/uiStore'
import { SearchBar } from './SearchBar'
import { CartDrawer } from './CartDrawer'
import { MobileNav } from './MobileNav'
import { CartBadge } from './CartBadge'
import { NavAnimation } from '@/components/animations/NavAnimation'

type MegaMenuKey = 'power-stations' | 'solar-panels' | 'accessories' | 'support' | null

export function Header() {
  const [openMenu, setOpenMenu] = useState<MegaMenuKey>(null)
  const { openCart, openSearch, openMobileNav } = useUIStore()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      {/* Click-away overlay behind mega-menu */}
      {openMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenu(null)}
          aria-hidden="true"
        />
      )}

      <header
        className="bg-white/80 border-b border-slate-200/60 backdrop-blur-md"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
        }}
      >
        <div className="max-w-8xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0 mr-4" style={{ textDecoration: 'none' }}>
              <img
                src="/logo.png"
                alt="Batteriq"
                className="object-contain"
                style={{ width: '160px', height: 'auto', mixBlendMode: 'multiply' }}
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              <Link
                href="/"
                data-nav-link
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-bq-blue transition-all duration-300 rounded-xl hover:bg-slate-50"
              >
                Home
              </Link>

              {/* Power Stations mega menu */}
              <div className="relative">
                <button
                  data-nav-link
                  className={`px-4 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-xl ${
                    openMenu === 'power-stations'
                      ? 'text-bq-blue bg-slate-50'
                      : 'text-slate-600 hover:text-bq-blue hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setOpenMenu('power-stations')}
                  onClick={() => setOpenMenu(openMenu === 'power-stations' ? null : 'power-stations')}
                  aria-expanded={openMenu === 'power-stations'}
                  aria-haspopup="true"
                >
                  Power Stations
                  <ChevronDown size={14} className={`transition-transform duration-300 ${openMenu === 'power-stations' ? 'rotate-180 text-bq-blue' : 'text-slate-400'}`} />
                </button>

                {openMenu === 'power-stations' && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[760px] bg-white rounded-2xl shadow-ambient border border-slate-100 p-8 grid grid-cols-3 gap-x-10 gap-y-8 z-50 animate-dropdown-enter origin-top"
                    onMouseLeave={() => setOpenMenu(null)}
                    role="menu"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">DELTA Series</p>
                      {[
                        { name: 'DELTA Pro 3', sub: '4096Wh · 4000W', href: '/ecoflow/delta-pro-3' },
                        { name: 'DELTA Pro', sub: '3600Wh · 3600W', href: '/ecoflow/delta-pro' },
                        { name: 'DELTA 2 Max', sub: '2048Wh · 2400W', href: '/ecoflow/delta-2-max' },
                        { name: 'DELTA 2', sub: '1024Wh · 1800W', href: '/ecoflow/delta-2' },
                        { name: 'DELTA 3 Plus', sub: '1024Wh · 1800W', href: '/ecoflow/delta-3-plus' },
                        { name: 'DELTA 3', sub: '1024Wh · 1800W', href: '/ecoflow/delta-3' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">{item.name}</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">{item.sub}</span>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">RIVER Series</p>
                      {[
                        { name: 'RIVER 2 Pro', sub: '768Wh · 800W', href: '/ecoflow/river-2-pro' },
                        { name: 'RIVER 2 Max', sub: '512Wh · 500W', href: '/ecoflow/river-2-max' },
                        { name: 'RIVER 2', sub: '256Wh · 300W', href: '/ecoflow/river-2' },
                        { name: 'RIVER 3 Plus', sub: '286Wh · 600W', href: '/ecoflow/river-3-plus' },
                        { name: 'RIVER 3', sub: '245Wh · 300W', href: '/ecoflow/river-3' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">{item.name}</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">{item.sub}</span>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">SYSTEMS</p>
                      {[
                        { name: 'PowerKit 5kWh', sub: 'Whole-home system', href: '/ecoflow-kenya#powerkits' },
                        { name: 'PowerKit 10kWh', sub: 'Whole-home system', href: '/ecoflow-kenya#powerkits' },
                        { name: 'PowerKit 15kWh', sub: 'Whole-home system', href: '/ecoflow-kenya#powerkits' },
                      ].map((item) => (
                        <Link key={item.name} href={item.href} onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">{item.name}</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">{item.sub}</span>
                        </Link>
                      ))}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-2">BLUETTI</p>
                        <Link href="/bluetti" onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">All Bluetti Models</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">AC Series · EB Series</span>
                        </Link>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                        <Link href="/power-stations" onClick={() => setOpenMenu(null)}
                          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60"
                        >
                          All Power Stations →
                        </Link>
                        <Link href="/ecoflow-kenya" onClick={() => setOpenMenu(null)}
                          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-white bg-bq-blue hover:bg-blue-700 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                        >
                          EcoFlow Kenya Hub →
                        </Link>
                        <Link href="/compare" onClick={() => setOpenMenu(null)}
                          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-100"
                        >
                          ⚖️ Compare Products
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Solar Panels mega menu */}
              <div className="relative">
                <button
                  data-nav-link
                  className={`px-4 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-xl ${
                    openMenu === 'solar-panels'
                      ? 'text-bq-blue bg-slate-50'
                      : 'text-slate-600 hover:text-bq-blue hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setOpenMenu('solar-panels')}
                  onClick={() => setOpenMenu(openMenu === 'solar-panels' ? null : 'solar-panels')}
                  aria-expanded={openMenu === 'solar-panels'}
                  aria-haspopup="true"
                >
                  Solar Panels
                  <ChevronDown size={14} className={`transition-transform duration-300 ${openMenu === 'solar-panels' ? 'rotate-180 text-bq-blue' : 'text-slate-400'}`} />
                </button>

                {openMenu === 'solar-panels' && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[600px] bg-white rounded-2xl shadow-ambient border border-slate-100 p-8 grid grid-cols-2 gap-x-10 gap-y-8 z-50 animate-dropdown-enter origin-top"
                    onMouseLeave={() => setOpenMenu(null)}
                    role="menu"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">PORTABLE</p>
                      {[
                        { name: '400W Portable', sub: 'IP68 · 22.6% efficiency', href: '/ecoflow/solar-panel-400w' },
                        { name: '220W Bifacial', sub: 'IP68 · 22–23% efficiency', href: '/ecoflow/solar-panel-220w' },
                        { name: '160W Portable', sub: 'IP68 · 21–22% efficiency', href: '/ecoflow/solar-panel-160w' },
                        { name: '110W Portable', sub: 'IP68 · 22.8% efficiency', href: '/ecoflow/solar-panel-110w' },
                        { name: '45W Portable', sub: 'IP65 · 25% efficiency', href: '/ecoflow/solar-panel-45w' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">{item.name}</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">{item.sub}</span>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">RIGID & FLEXIBLE</p>
                      {[
                        { name: '125W Rigid x2', sub: '23% efficiency · IP68', href: '/ecoflow/rigid-solar-panel-125w-x2' },
                        { name: '100W Flexible', sub: '23% efficiency · IP68', href: '/ecoflow/flexible-solar-panel-100w' },
                        { name: 'Bluetti PV200', sub: '200W · 23.4% efficiency', href: '/bluetti/bluetti-pv200' },
                        { name: 'Bluetti PV350', sub: '350W · 23.4% efficiency', href: '/bluetti/bluetti-pv350' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                          className="flex flex-col py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
                          role="menuitem"
                        >
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">{item.name}</span>
                          <span className="text-xs text-slate-500 font-normal mt-0.5">{item.sub}</span>
                        </Link>
                      ))}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <Link href="/solar" onClick={() => setOpenMenu(null)}
                          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60"
                        >
                          View All Solar Panels →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accessories mega menu */}
              <div className="relative">
                <button
                  data-nav-link
                  className={`px-4 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-xl ${
                    openMenu === 'accessories'
                      ? 'text-bq-blue bg-slate-50'
                      : 'text-slate-600 hover:text-bq-blue hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setOpenMenu('accessories')}
                  onClick={() => setOpenMenu(openMenu === 'accessories' ? null : 'accessories')}
                  aria-expanded={openMenu === 'accessories'}
                  aria-haspopup="true"
                >
                  Accessories
                  <ChevronDown size={14} className={`transition-transform duration-300 ${openMenu === 'accessories' ? 'rotate-180 text-bq-blue' : 'text-slate-400'}`} />
                </button>

                {openMenu === 'accessories' && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[640px] bg-white rounded-2xl shadow-ambient border border-slate-100 p-8 grid grid-cols-3 gap-x-8 gap-y-6 z-50 animate-dropdown-enter origin-top"
                    onMouseLeave={() => setOpenMenu(null)}
                    role="menu"
                  >
                    {[
                      {
                        category: 'BATTERIES',
                        items: [
                          { name: 'DELTA 2 Battery', href: '/ecoflow/delta-2-extra-battery' },
                          { name: 'DELTA Pro Battery', href: '/ecoflow/delta-pro-extra-battery' },
                          { name: 'DELTA 2 Max Battery', href: '/ecoflow/delta-2-max-extra-battery-2048wh' },
                          { name: 'Bluetti B300S', href: '/bluetti/bluetti-b300s' },
                        ],
                      },
                      {
                        category: 'POWER TOOLS',
                        items: [
                          { name: 'Alternator Charger', href: '/ecoflow/alternator-charger-800w' },
                          { name: 'Smart Plug', href: '/ecoflow/smart-plug' },
                          { name: 'MC4 Cables', href: '/ecoflow/mc4-to-xt60-solar-cable' },
                        ],
                      },
                      {
                        category: 'APPLIANCES',
                        items: [
                          { name: 'GLACIER Fridge', href: '/ecoflow/glacier-portable-fridge-freezer' },
                          { name: 'WAVE 2 AC', href: '/ecoflow/wave-2-portable-air-conditioner' },
                          { name: 'Camp Torch', href: '/ecoflow/camp-torch-pro' },
                        ],
                      },
                    ].map((col) => (
                      <div key={col.category}>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-4">{col.category}</p>
                        {col.items.map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                            className="block py-2.5 px-3 -mx-3 rounded-xl text-sm font-semibold text-slate-900 hover:bg-slate-50 hover:text-bq-blue transition-all duration-200"
                            role="menuitem"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support dropdown */}
              <div className="relative">
                <button
                  data-nav-link
                  className={`px-4 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-xl ${
                    openMenu === 'support'
                      ? 'text-bq-blue bg-slate-50'
                      : 'text-slate-600 hover:text-bq-blue hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setOpenMenu('support')}
                  onClick={() => setOpenMenu(openMenu === 'support' ? null : 'support')}
                  aria-expanded={openMenu === 'support'}
                  aria-haspopup="true"
                >
                  Support
                  <ChevronDown size={14} className={`transition-transform duration-300 ${openMenu === 'support' ? 'rotate-180 text-bq-blue' : 'text-slate-400'}`} />
                </button>

                {openMenu === 'support' && (
                  <div
                    className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-ambient border border-slate-100 p-3 z-50 animate-dropdown-enter origin-top-right"
                    onMouseLeave={() => setOpenMenu(null)}
                    role="menu"
                  >
                    {/* Contact Us */}
                    <Link href="/contact" onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200 group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-200 transition-all">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-slate-600 group-hover:text-bq-blue transition-colors" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">Contact Us</p>
                        <p className="text-xs text-slate-500 font-normal mt-0.5">Send us a message</p>
                      </div>
                    </Link>

                    {/* WhatsApp */}
                    <a href="https://wa.me/254716822014" target="_blank" rel="noopener noreferrer"
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200 group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-200 transition-all">
                        <WhatsAppIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-bq-blue transition-colors">WhatsApp Us</p>
                        <p className="text-xs text-slate-500 font-normal mt-0.5">0716 822 014 · Instant reply</p>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </nav>

            {/* Right utilities */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={openSearch}
                className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-bq-blue hover:bg-slate-50 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                aria-label="Open search"
              >
                <Search size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={openCart}
                data-nav-cta
                className="relative w-11 h-11 flex items-center justify-center text-slate-500 hover:text-bq-blue hover:bg-slate-50 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                aria-label="Shopping cart"
              >
                <ShoppingCart size={20} strokeWidth={2.5} />
                <CartBadge />
              </button>

              <button
                onClick={openMobileNav}
                className="lg:hidden w-11 h-11 flex items-center justify-center text-slate-500 hover:text-bq-blue hover:bg-slate-50 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                aria-label="Open navigation menu"
              >
                <Menu size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <SearchBar />
      <CartDrawer />
      <MobileNav />
      <NavAnimation />
    </>
  )
}
