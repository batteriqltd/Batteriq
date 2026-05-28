'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export function PowerStationsHero() {
  const [hoveredPanel, setHoveredPanel] = useState<'delta' | 'river' | null>(null)

  return (
    <section className="relative w-full overflow-hidden">

      {/* ── DESKTOP: Side by side ── */}
      <div className="hidden md:flex h-[65vh] min-h-[500px] max-h-[720px]">

        {/* LEFT PANEL: DELTA SERIES */}
        <motion.div
          data-hero-panel="delta"
          className="relative overflow-hidden cursor-pointer"
          initial={{ width: '55%' }}
          animate={{
            width: hoveredPanel === 'delta' ? '60%' : hoveredPanel === 'river' ? '40%' : '55%',
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onMouseEnter={() => setHoveredPanel('delta')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #000033 0%, #00004d 40%, #000080 70%, #0000aa 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 h-full flex flex-col justify-end pb-10 pl-8 pr-6 lg:pl-14 lg:pr-10">
            <div className="absolute top-8 left-8 lg:left-14">
              <div className="flex items-center gap-1.5 bg-blue-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Shield size={10} className="text-white" />
                <span className="text-white text-[10px] font-black uppercase tracking-widest">
                  Official EcoFlow Dealer
                </span>
              </div>
            </div>

            <div>
              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.25em] mb-2">EcoFlow</p>
              <h2
                className="text-white font-black leading-none mb-2"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
              >
                DELTA Series
              </h2>
              <p className="text-white/70 text-sm lg:text-base font-medium mb-1 max-w-xs">
                Whole-home backup power. Silence the outages.
              </p>
              <p className="text-white/50 text-xs mb-5 max-w-xs">
                LFP chemistry · 3,500+ cycles · 10-year lifespan
              </p>

              <div className="flex gap-4 mb-6">
                {[
                  { label: 'From', value: 'KES 85,539' },
                  { label: 'Output', value: 'Up to 4000W' },
                  { label: 'Capacity', value: 'Up to 4096Wh' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-blue-400 text-[9px] font-bold uppercase tracking-wider">{s.label}</p>
                    <p className="text-white text-xs font-black font-mono">{s.value}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/power-stations?filter=delta"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-600/30 group"
              >
                Shop DELTA Series
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              {['DELTA 2', 'DELTA Pro', 'DELTA 3 Plus', 'DELTA Pro 3'].map((model) => (
                <Link
                  key={model}
                  href={`/ecoflow/${model.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-[10px] font-semibold text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-2.5 py-1 rounded-full transition-all"
                >
                  {model}
                </Link>
              ))}
            </div>
          </div>

          <motion.div
            className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500"
            animate={{ opacity: hoveredPanel === 'delta' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        {/* RIGHT PANEL: RIVER SERIES */}
        <div
          data-hero-panel="river"
          className="relative overflow-hidden cursor-pointer flex-grow"
          onMouseEnter={() => setHoveredPanel('river')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #001133 40%, #002266 70%, #003399 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/10" />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 h-full flex flex-col justify-end pb-10 pr-8 pl-6 lg:pr-14 lg:pl-10">
            <div className="absolute top-8 right-8 lg:right-14">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
                <Zap size={10} className="text-blue-300" />
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Portable Series</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.25em] mb-2">EcoFlow</p>
              <h2
                className="text-white font-black leading-none mb-2"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
              >
                RIVER Series
              </h2>
              <p className="text-white/70 text-sm lg:text-base font-medium mb-1">
                Lightweight. Portable. Powerful.
              </p>
              <p className="text-white/50 text-xs mb-5">UPS 10ms · 4 charging options</p>

              <div className="flex gap-4 mb-6 justify-end">
                {[
                  { label: 'From', value: 'KES 27,259' },
                  { label: 'Weight', value: 'From 3.5kg' },
                  { label: 'UPS', value: '10ms switch' },
                ].map((s) => (
                  <div key={s.label} className="text-right">
                    <p className="text-blue-400 text-[9px] font-bold uppercase tracking-wider">{s.label}</p>
                    <p className="text-white text-xs font-black font-mono">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Link
                  href="/power-stations?filter=river"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/60 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all group backdrop-blur-sm"
                >
                  Shop RIVER Series
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap justify-end">
              {['RIVER 2', 'RIVER 3', 'RIVER 2 Pro', 'RIVER 3 Plus'].map((model) => (
                <Link
                  key={model}
                  href={`/ecoflow/${model.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-[10px] font-semibold text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-2.5 py-1 rounded-full transition-all"
                >
                  {model}
                </Link>
              ))}
            </div>
          </div>

          <motion.div
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400"
            animate={{ opacity: hoveredPanel === 'river' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* ── MOBILE: Stacked ── */}
      <div className="flex md:hidden flex-col">
        {/* DELTA panel */}
        <div
          className="relative w-full"
          style={{ height: '55vw', minHeight: '220px', maxHeight: '320px' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #000033 0%, #00004d 40%, #000080 70%, #0000aa 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          <div className="relative z-10 h-full flex flex-col justify-end pb-6 pl-5 pr-5">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">EcoFlow</p>
            <h2 className="text-white font-black text-2xl leading-none mb-1">DELTA Series</h2>
            <p className="text-white/60 text-xs mb-3">Whole-home backup power · From KES 85,539</p>
            <Link
              href="/power-stations?filter=delta"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-lg w-fit"
            >
              Shop DELTA <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* RIVER panel */}
        <div
          className="relative w-full"
          style={{ height: '55vw', minHeight: '220px', maxHeight: '320px' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #001133 40%, #002266 70%, #003399 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/10" />
          <div className="relative z-10 h-full flex flex-col justify-end pb-6 pl-5 pr-5">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">EcoFlow</p>
            <h2 className="text-white font-black text-2xl leading-none mb-1">RIVER Series</h2>
            <p className="text-white/60 text-xs mb-3">Portable power station · From KES 27,259</p>
            <Link
              href="/power-stations?filter=river"
              className="inline-flex items-center gap-1.5 bg-white/10 border border-white/30 text-white font-bold text-xs px-4 py-2 rounded-lg w-fit"
            >
              Shop RIVER <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}
