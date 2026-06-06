'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Zap, Sun, Package, Headphones, Info, ArrowRight, MapPin } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'

type AccordionKey = 'power-stations' | 'solar-panels' | 'accessories' | null

const POWER_ITEMS = {
  delta: [
    { name: 'DELTA Pro 3', sub: '4096Wh · 4000W', href: '/ecoflow/delta-pro-3' },
    { name: 'DELTA Pro', sub: '3600Wh · 3600W', href: '/ecoflow/delta-pro' },
    { name: 'DELTA 2 Max', sub: '2048Wh · 2400W', href: '/ecoflow/delta-2-max' },
    { name: 'DELTA 2', sub: '1024Wh · 1800W', href: '/ecoflow/delta-2' },
    { name: 'DELTA 3', sub: '1024Wh · 1800W', href: '/ecoflow/delta-3' },
  ],
  river: [
    { name: 'RIVER 2 Pro', sub: '768Wh · 800W', href: '/ecoflow/river-2-pro' },
    { name: 'RIVER 2 Max', sub: '512Wh · 500W', href: '/ecoflow/river-2-max' },
    { name: 'RIVER 2', sub: '256Wh · 300W', href: '/ecoflow/river-2' },
    { name: 'RIVER 3', sub: '245Wh · 300W', href: '/ecoflow/river-3' },
  ],
  systems: [
    { name: 'Solar Home Systems', sub: 'Whole-home 5–15kWh', href: '/ecoflow-kenya#solar-home-systems' },
    { name: 'All Bluetti Models', sub: 'AC Series · EB Series', href: '/bluetti' },
  ],
}

const SOLAR_ITEMS = {
  portable: [
    { name: '400W Portable Panel', href: '/ecoflow/solar-panel-400w' },
    { name: '220W Bifacial Panel', href: '/ecoflow/solar-panel-220w' },
    { name: '160W Portable Panel', href: '/ecoflow/solar-panel-160w' },
    { name: '110W Portable Panel', href: '/ecoflow/solar-panel-110w' },
    { name: '45W Portable Panel', href: '/ecoflow/solar-panel-45w' },
  ],
  rigid: [
    { name: '125W Rigid Panel x2', href: '/ecoflow/rigid-solar-panel-125w-x2' },
    { name: '100W Flexible Panel', href: '/ecoflow/flexible-solar-panel-100w' },
    { name: 'Bluetti PV200', href: '/bluetti/bluetti-pv200' },
    { name: 'Bluetti PV350', href: '/bluetti/bluetti-pv350' },
  ],
}

const ACCESSORY_ITEMS = [
  { name: 'Extra Batteries', href: '/accessories#batteries' },
  { name: 'Alternator Charger 800W', href: '/ecoflow/alternator-charger-800w' },
  { name: 'GLACIER Fridge Freezer', href: '/ecoflow/glacier-portable-fridge-freezer' },
  { name: 'WAVE 2 Air Conditioner', href: '/ecoflow/wave-2-portable-air-conditioner' },
  { name: 'Smart Plug', href: '/ecoflow/smart-plug' },
  { name: 'Solar Cables', href: '/ecoflow/mc4-to-xt60-solar-cable' },
]

export function MobileNav() {
  const { mobileNavOpen, closeMobileNav } = useUIStore()
  const [openAccordion, setOpenAccordion] = useState<AccordionKey>(null)

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setOpenAccordion(null)
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeMobileNav])

  function toggleAccordion(key: AccordionKey) {
    setOpenAccordion(openAccordion === key ? null : key)
  }

  function handleNav() {
    closeMobileNav()
    setOpenAccordion(null)
  }

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
            aria-hidden="true"
          />
          <motion.nav
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white border-l border-gray-200 flex flex-col lg:hidden overflow-y-auto"
            aria-label="Mobile navigation"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex flex-col leading-none">
                <span className="font-black text-[20px] tracking-tight text-gray-900 leading-none">
                  BATTERIQ<sup className="text-bq-blue text-[10px] font-bold">™</sup>
                </span>
                <span className="text-[8px] text-gray-400 tracking-[0.15em] font-medium uppercase leading-none mt-0.5">
                  Guarantee your Uptime
                </span>
              </div>
              <button
                onClick={closeMobileNav}
                className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[6px] transition-colors"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 p-4 space-y-1">
              <Link
                href="/"
                onClick={handleNav}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light rounded-[8px] transition-colors"
              >
                <Zap size={18} className="text-bq-blue" />
                Home
              </Link>

              {/* Power Stations accordion */}
              <div>
                <button
                  onClick={() => toggleAccordion('power-stations')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-[8px] transition-colors ${
                    openAccordion === 'power-stations'
                      ? 'text-bq-blue bg-bq-blue-light'
                      : 'text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Zap size={18} className="text-bq-blue" />
                    Power Stations
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'power-stations' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {openAccordion === 'power-stations' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 pl-4 border-l-2 border-bq-blue-light space-y-1 pb-2">
                        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest pt-2 pb-1">DELTA Series</p>
                        {POWER_ITEMS.delta.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="flex flex-col py-1.5 px-2 rounded-[6px] hover:bg-bq-blue-light group"
                          >
                            <span className="text-sm font-medium text-gray-800 group-hover:text-bq-blue">{item.name}</span>
                            <span className="text-xs text-gray-400">{item.sub}</span>
                          </Link>
                        ))}
                        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest pt-2 pb-1">RIVER Series</p>
                        {POWER_ITEMS.river.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="flex flex-col py-1.5 px-2 rounded-[6px] hover:bg-bq-blue-light group"
                          >
                            <span className="text-sm font-medium text-gray-800 group-hover:text-bq-blue">{item.name}</span>
                            <span className="text-xs text-gray-400">{item.sub}</span>
                          </Link>
                        ))}
                        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest pt-2 pb-1">SYSTEMS</p>
                        {POWER_ITEMS.systems.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="flex flex-col py-1.5 px-2 rounded-[6px] hover:bg-bq-blue-light group"
                          >
                            <span className="text-sm font-medium text-gray-800 group-hover:text-bq-blue">{item.name}</span>
                            <span className="text-xs text-gray-400">{item.sub}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Solar Panels accordion */}
              <div>
                <button
                  onClick={() => toggleAccordion('solar-panels')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-[8px] transition-colors ${
                    openAccordion === 'solar-panels'
                      ? 'text-bq-blue bg-bq-blue-light'
                      : 'text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Sun size={18} className="text-bq-blue" />
                    Solar Panels
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'solar-panels' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {openAccordion === 'solar-panels' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 pl-4 border-l-2 border-bq-blue-light space-y-1 pb-2">
                        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest pt-2 pb-1">PORTABLE</p>
                        {SOLAR_ITEMS.portable.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="block py-1.5 px-2 rounded-[6px] text-sm font-medium text-gray-800 hover:text-bq-blue hover:bg-bq-blue-light"
                          >
                            {item.name}
                          </Link>
                        ))}
                        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest pt-2 pb-1">RIGID & FLEXIBLE</p>
                        {SOLAR_ITEMS.rigid.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="block py-1.5 px-2 rounded-[6px] text-sm font-medium text-gray-800 hover:text-bq-blue hover:bg-bq-blue-light"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accessories accordion */}
              <div>
                <button
                  onClick={() => toggleAccordion('accessories')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-[8px] transition-colors ${
                    openAccordion === 'accessories'
                      ? 'text-bq-blue bg-bq-blue-light'
                      : 'text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Package size={18} className="text-bq-blue" />
                    Accessories
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'accessories' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {openAccordion === 'accessories' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 pl-4 border-l-2 border-bq-blue-light space-y-1 pb-2">
                        {ACCESSORY_ITEMS.map((item) => (
                          <Link key={item.href} href={item.href} onClick={handleNav}
                            className="block py-1.5 px-2 rounded-[6px] text-sm font-medium text-gray-800 hover:text-bq-blue hover:bg-bq-blue-light"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/support"
                onClick={handleNav}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light rounded-[8px] transition-colors"
              >
                <Headphones size={18} className="text-bq-blue" />
                Support
              </Link>

              <Link
                href="/track-order"
                onClick={handleNav}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light rounded-[8px] transition-colors"
              >
                <MapPin size={18} className="text-bq-blue" />
                Track My Order
              </Link>

              <Link
                href="/contact"
                onClick={handleNav}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light rounded-[8px] transition-colors"
              >
                <Headphones size={18} className="text-bq-blue" />
                Contact Us
              </Link>

              <Link
                href="/about"
                onClick={handleNav}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-bq-blue hover:bg-bq-blue-light rounded-[8px] transition-colors"
              >
                <Info size={18} className="text-bq-blue" />
                About Batteriq
              </Link>
            </div>

            {/* Footer CTAs */}
            <div className="p-4 border-t border-gray-100 space-y-3">
              <Link
                href="/ecoflow-kenya"
                onClick={handleNav}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-bq-blue text-white font-bold text-sm rounded-[10px] hover:bg-bq-blue-dim transition-colors"
              >
                Shop Now <ArrowRight size={16} />
              </Link>
              <a
                href="https://wa.me/254716822014"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-gray-900 font-semibold text-sm rounded-[10px] border-2 border-gray-200 hover:border-bq-blue hover:text-bq-blue transition-colors"
              >
                <WhatsAppIcon size={18} /> WhatsApp Us
              </a>
              <p className="text-xs text-gray-400 text-center">Authorised EcoFlow & Bluetti Dealer · Nairobi, Kenya</p>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
