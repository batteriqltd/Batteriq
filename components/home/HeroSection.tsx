'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

type Slide = {
  id: number
  badge: string
  headline: string
  headlineAccent: string
  subline: string
  cta: { label: string; href: string }
  ctaSecondary: { label: string; href: string }
  bg: string
  image: string
  product: string
  startingPrice: string
}

const slides: Slide[] = [
  {
    id: 0,
    badge: 'Authorised EcoFlow & Bluetti Dealer — Kenya',
    headline: 'Power Through',
    headlineAccent: 'Every Outage',
    subline: "Kenya's #1 authorised EcoFlow & Bluetti dealer. Instant M-Pesa checkout. Same-day Nairobi delivery.",
    cta: { label: 'Shop Power Stations', href: '/ecoflow-kenya' },
    ctaSecondary: { label: 'View All Products', href: '/#power-stations' },
    bg: 'from-slate-900 via-blue-950 to-slate-900',
    image: '/heroes/hero-power-stations-new.png',
    product: 'EcoFlow DELTA Pro',
    startingPrice: 'From KES 27,259',
  },
  {
    id: 1,
    badge: 'EcoFlow Solar Panels Kenya',
    headline: 'Harvest the',
    headlineAccent: 'African Sun',
    subline: 'From 45W portable panels to 400W powerhouses. IP68 waterproof. Works with all EcoFlow stations.',
    cta: { label: 'Shop Solar Panels', href: '/solar' },
    ctaSecondary: { label: 'Learn More', href: '/#solar-panels' },
    bg: 'from-amber-900 via-orange-950 to-slate-900',
    image: '/heroes/hero-solar.jpg',
    product: 'EcoFlow Solar Panels',
    startingPrice: 'From KES 7,599',
  },
  {
    id: 2,
    badge: 'Compact & Portable Power',
    headline: 'Power Anywhere',
    headlineAccent: 'You Go',
    subline: 'RIVER series from KES 27,259. Lightweight, powerful, M-Pesa ready. Perfect for home, camping & safari.',
    cta: { label: 'Shop RIVER Series', href: '/ecoflow-kenya#power-stations' },
    ctaSecondary: { label: 'Compare Models', href: '/compare' },
    bg: 'from-emerald-900 via-teal-950 to-slate-900',
    image: '/heroes/hero-river-new.jpg',
    product: 'EcoFlow RIVER 2',
    startingPrice: 'From KES 27,259',
  },
]


export function HeroSection() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [paused, next])

  const slide = slides[current]

  return (
    <section
      className="relative w-full overflow-hidden hero-section"
      style={{ minHeight: 'clamp(520px, 90vh, 800px)' }}
      aria-label="Hero banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Product image — full clear display */}
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt={slide.product}
              className="w-full h-full object-cover object-center"
              style={{ display: 'block' }}
            />
          </div>
          {/* Single soft gradient ONLY at the bottom for text readability */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.85) 100%)'
          }} />
          {/* Left side gradient for text area on desktop */}
          <div className="absolute inset-0 hidden lg:block" style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 65%)'
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-end pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full text-left lg:max-w-2xl lg:ml-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-5 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {slide.badge}
              </div>

              {/* Headline */}
              <h1 className="text-white mb-4 text-left"
                style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)', letterSpacing: '-0.03em', lineHeight: 1.0, fontWeight: 900, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                {slide.headline}<br />
                <span style={{ color: '#4d9fff' }}>{slide.headlineAccent}</span>
              </h1>

              {/* Price tag */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 bg-white/10 backdrop-blur-sm border border-white/15">
                <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Starting</span>
                <span className="text-white font-black text-base">{slide.startingPrice}</span>
              </div>

              <p className="text-white/75 mb-8 text-left leading-relaxed max-w-md"
                style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.05rem)' }}>
                {slide.subline}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
                <Link href={slide.cta.href}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-black text-sm rounded-2xl transition-all duration-200 hover:-translate-y-0.5 min-h-[52px]"
                  style={{ background: '#0000ff', boxShadow: '0 8px 32px rgba(0,0,255,0.4)' }}>
                  {slide.cta.label} <ArrowRight size={18} />
                </Link>
                <Link href={slide.ctaSecondary.href}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-black text-sm rounded-2xl border border-white/25 hover:bg-white/20 hover:border-white/40 transition-all duration-200 min-h-[52px]">
                  {slide.ctaSecondary.label}
                </Link>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-2 mt-0" role="tablist" aria-label="Slide navigation">
                {slides.map((s, i) => (
                  <button key={s.id} role="tab" aria-selected={i === current} aria-label={`Go to slide ${i + 1}`}
                    onClick={() => { setCurrent(i); setPaused(true) }}
                    className={`h-1 rounded-full transition-all duration-400 ${i === current ? 'w-10 bg-white' : 'w-4 bg-white/30 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Arrows */}
      <button onClick={() => { prev(); setPaused(true) }}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-all"
        aria-label="Previous slide">
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => { next(); setPaused(true) }}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-all"
        aria-label="Next slide">
        <ChevronRight size={20} />
      </button>
    </section>
  )
}
