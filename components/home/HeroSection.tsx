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
}

const slides: Slide[] = [
  {
    id: 0,
    badge: 'Authorised EcoFlow & Bluetti Dealer — Kenya',
    headline: "Power Through",
    headlineAccent: "Every Outage",
    subline: "Kenya's #1 authorised EcoFlow & Bluetti dealer. Instant M-Pesa checkout. Nairobi delivery & nationwide shipping.",
    cta: { label: 'Shop Power Stations', href: '/ecoflow-kenya' },
    ctaSecondary: { label: 'View All Products', href: '/#power-stations' },
    bg: 'from-slate-900 via-blue-950 to-slate-900',
    image: '/heroes/hero-power-stations.jpg',
  },
  {
    id: 1,
    badge: 'EcoFlow Solar Panels Kenya',
    headline: "Harvest the",
    headlineAccent: "African Sun",
    subline: "From 45W portable panels to 400W powerhouses. IP68 waterproof. Compatible with all EcoFlow power stations.",
    cta: { label: 'Shop Solar Panels', href: '/solar' },
    ctaSecondary: { label: 'Learn More', href: '/#solar-panels' },
    bg: 'from-amber-900 via-orange-950 to-slate-900',
    image: '/heroes/hero-solar.jpg',
  },
  {
    id: 2,
    badge: 'Compact & Portable Power',
    headline: "Power Anywhere",
    headlineAccent: "You Go",
    subline: "RIVER series power stations from KES 27,259. Lightweight, powerful, M-Pesa ready. Perfect for home backup, camping & safari.",
    cta: { label: 'Shop RIVER Series', href: '/ecoflow-kenya#power-stations' },
    ctaSecondary: { label: 'Ask AI Assistant', href: '#' },
    bg: 'from-emerald-900 via-teal-950 to-slate-900',
    image: '/heroes/hero-river.jpg',
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
      aria-label="Hero banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background photo + gradient crossfade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Brand gradient base — fallback when no photo */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg}`} />
          {/* Full-bleed product photo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${slide.image}')` }}
          />
          {/* Layer 1: Light overall tint — image stays visible */}
          <div
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,20,0.25) 0%, rgba(0,0,20,0.15) 40%, rgba(0,0,20,0.65) 80%, rgba(0,0,10,0.92) 100%)',
            }}
          />
          {/* Layer 2: Left-side text protection — desktop only */}
          <div
            className="absolute inset-0 z-10 hidden sm:block"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,20,0.55) 0%, rgba(0,0,20,0.3) 35%, transparent 65%)',
            }}
          />
          {/* Brand colour tint */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} opacity-30 mix-blend-multiply`} />
        </motion.div>
      </AnimatePresence>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,255,0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Blue radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(0,0,255,0.12) 0%, transparent 70%)' }}
      />

      {/* Content — bottom on mobile, center on desktop */}
      <div className="absolute inset-0 z-20 flex items-end sm:items-center pb-10 sm:pb-0">
        <div
          className="max-w-5xl mx-auto px-4 sm:px-8 w-full text-center"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-bq-blue/40 rounded-full bg-bq-blue/10 text-sm text-blue-300 font-medium">
                <span className="w-2 h-2 bg-bq-blue rounded-full animate-pulse" />
                {slide.badge}
              </div>

              {/* Headline */}
              <h1
                data-hero-title
                className="h1-fluid text-white mb-6"
                style={{ fontSize: 'clamp(1.6rem, 5vw, 4rem)', letterSpacing: '-0.03em', lineHeight: 1.05, fontWeight: 900 }}
              >
                {slide.headline}{' '}
                <span className="text-bq-blue">{slide.headlineAccent}</span>
              </h1>

              <p
                data-hero-sub
                className="text-gray-300 mx-auto mb-10"
                style={{ fontSize: 'clamp(0.85rem, 2vw, 1.2rem)', maxWidth: '520px', lineHeight: 1.6 }}
              >
                {slide.subline}
              </p>

              {/* CTAs — stack on mobile, row on desktop */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8">
                <Link
                  data-hero-btn
                  href={slide.cta.href}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-bq-blue text-white font-bold text-sm sm:text-base rounded-2xl hover:bg-bq-blue-dim hover:shadow-blue-glow transition-all duration-250 min-h-[52px]"
                >
                  {slide.cta.label} <ArrowRight size={18} />
                </Link>
                <Link
                  data-hero-btn
                  href={slide.ctaSecondary.href}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold text-sm sm:text-base rounded-2xl border-2 border-white/40 hover:border-white hover:bg-white/5 transition-all duration-250 min-h-[52px]"
                >
                  {slide.ctaSecondary.label}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-10" role="tablist" aria-label="Slide navigation">
            {slides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => { setCurrent(i); setPaused(true) }}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-bq-blue' : 'w-2 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={() => { prev(); setPaused(true) }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={() => { next(); setPaused(true) }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

    </section>
  )
}
