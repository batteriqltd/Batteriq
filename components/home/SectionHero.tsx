'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface SectionHeroProps {
  brand: 'EcoFlow' | 'Bluetti'
  title: string
  subtitle: string
  description: string
  ctaText: string
  ctaHref: string
  heroImage: string
  bgGradient?: string
  accentColor?: string
  tagline?: string
  stats?: { value: string; label: string }[]
  imagePosition?: 'right' | 'left'
}

export function SectionHero({
  brand,
  title,
  subtitle,
  description,
  ctaText,
  ctaHref,
  heroImage,
  bgGradient = 'linear-gradient(135deg, #00001a 0%, #000033 50%, #00004d 100%)',
  accentColor = '#0000ff',
  tagline,
  stats,
  imagePosition = 'right',
}: SectionHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (imageRef.current) imageRef.current.style.opacity = '1'
      return
    }

    const isLowPower =
      (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
        .connection?.saveData === true ||
      (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType === '2g'

    if (isLowPower) {
      if (imageRef.current) imageRef.current.style.opacity = '1'
      return
    }

    const isMobile = window.innerWidth < 768
    const duration = isMobile ? 0.6 : 0.9
    const stagger = isMobile ? 0.1 : 0.15
    const xOffset = imagePosition === 'right' ? 60 : -60

    async function setupAnimation() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { gsap } = await import('gsap') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ScrollTrigger } = await import('gsap/ScrollTrigger') as any
      gsap.registerPlugin(ScrollTrigger)

      if (!sectionRef.current || !textRef.current || !imageRef.current) return

      const animItems = textRef.current.querySelectorAll('[data-animate]')

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          once: true,
        },
      })

      tl.from(animItems, {
        opacity: 0,
        y: 40,
        duration,
        stagger,
        ease: 'power3.out',
      })

      tl.from(
        imageRef.current,
        {
          opacity: 0,
          x: xOffset,
          scale: 0.96,
          duration: duration + 0.2,
          ease: 'power3.out',
        },
        '-=0.6'
      )
    }

    setupAnimation()
  }, [imagePosition])

  return (
    <div
      ref={sectionRef}
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl mb-6"
      style={{ background: bgGradient, minHeight: '380px' }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow orb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}, transparent)`,
          filter: 'blur(72px)',
          [imagePosition === 'right' ? 'left' : 'right']: '-5%',
        }}
      />

      <div
        className={`relative z-10 flex flex-col sm:flex-row items-center ${
          imagePosition === 'left' ? 'sm:flex-row-reverse' : 'sm:flex-row'
        }`}
        style={{ minHeight: '380px' }}
      >
        {/* TEXT SIDE */}
        <div
          ref={textRef}
          className="w-full sm:flex-1 px-6 sm:px-12 lg:px-16 py-10 sm:py-12 flex flex-col justify-center"
          style={{ maxWidth: '540px' }}
        >
          {tagline && (
            <p
              data-animate
              className="text-xs font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: accentColor }}
            >
              {tagline}
            </p>
          )}

          <p
            data-animate
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {subtitle}
          </p>

          <h2
            data-animate
            className="font-black text-white leading-[0.95] mb-4"
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </h2>

          <p
            data-animate
            className="text-sm sm:text-base leading-relaxed mb-6"
            style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '380px' }}
          >
            {description}
          </p>

          {stats && stats.length > 0 && (
            <div data-animate className="flex flex-wrap gap-5 mb-7">
              {stats.map((s, i) => (
                <div key={i}>
                  <p
                    className="text-xl font-black text-white font-mono"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    {s.value}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div data-animate>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #00004d)`,
                boxShadow: `0 6px 24px ${accentColor}40`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 12px 32px ${accentColor}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 6px 24px ${accentColor}40`
              }}
            >
              {ctaText}
            </Link>
          </div>
        </div>

        {/* IMAGE SIDE */}
        <div
          ref={imageRef}
          data-image-side=""
          className="hidden sm:flex flex-1 relative items-center justify-center py-8 px-8"
          style={{ minHeight: '340px' }}
        >
          <div className="relative w-full" style={{ minHeight: '300px' }}>
            <Image
              src={heroImage}
              alt={`${brand} ${title}`}
              fill
              className="object-contain object-center"
              style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,100,0.5))' }}
              onError={(e) => {
                const parent = e.currentTarget.closest('[data-image-side]') as HTMLElement | null
                if (parent) parent.style.display = 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.1))' }}
      />
    </div>
  )
}
