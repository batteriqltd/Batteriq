'use client'
import { useEffect, useRef, useState } from 'react'

interface StatItem {
  prefix: string
  value: number
  suffix: string
  label: string
  sub: string
  isText?: boolean
  textValue?: string
  duration: number
}

const STATS: StatItem[] = [
  {
    prefix: '',
    value: 500,
    suffix: '+',
    label: 'Products Sold',
    sub: 'and counting',
    duration: 2000,
  },
  {
    prefix: 'KES ',
    value: 27,
    suffix: 'K+',
    label: 'Starting Price',
    sub: 'products in range',
    duration: 1800,
  },
  {
    prefix: '',
    value: 0,
    suffix: '',
    label: 'Nairobi Delivery',
    sub: 'order before 12PM',
    isText: true,
    textValue: 'Same Day',
    duration: 0,
  },
  {
    prefix: '',
    value: 100,
    suffix: '%',
    label: 'Authorised Stock',
    sub: 'official EcoFlow dealer',
    duration: 1600,
  },
]

function useCountUp(target: number, duration: number, started: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started || target === 0) return

    // If reduced motion, jump straight to target
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target)
      return
    }

    let startTime: number | null = null
    let animFrame: number

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3)
    }

    function tick(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      setCount(Math.floor(eased * target))
      if (progress < 1) {
        animFrame = requestAnimationFrame(tick)
      } else {
        setCount(target)
      }
    }

    animFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrame)
  }, [started, target, duration])

  return count
}

function StatCard({ stat, started }: { stat: StatItem; started: boolean }) {
  const count = useCountUp(stat.value, stat.duration, started)
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    if (started && stat.isText) {
      const t = setTimeout(() => setTextVisible(true), 300)
      return () => clearTimeout(t)
    }
  }, [started, stat.isText])

  return (
    <div className="flex flex-col items-center text-center lg:px-8 group">
      <div
        className="font-black text-white mb-1 tabular-nums"
        style={{
          fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          textShadow: '0 0 40px rgba(100,130,255,0.5)',
          minHeight: '3rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {stat.isText ? (
          <span
            style={{
              opacity: textVisible ? 1 : 0,
              transform: textVisible ? 'scale(1)' : 'scale(0.8)',
              transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'inline-block',
            }}
          >
            {stat.textValue}
          </span>
        ) : (
          <span>
            {stat.prefix}{started ? count : 0}{stat.suffix}
          </span>
        )}
      </div>

      <p className="font-black text-blue-200 text-sm uppercase tracking-wider mb-1">
        {stat.label}
      </p>
      <p className="text-blue-300/60 text-xs font-medium">{stat.sub}</p>

      <div
        className="mt-4 h-0.5 w-0 group-hover:w-12 transition-all duration-500 rounded-full"
        style={{ background: 'linear-gradient(90deg, #0000ff, #4f46e5)' }}
      />
    </div>
  )
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Start immediately if already in view
    const rect = section.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setStarted(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !started) {
            setStarted(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    )

    observer.observe(section)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <section
        ref={sectionRef}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00004d 0%, #000080 50%, #00004d 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute top-0 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0000ff, transparent)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent)', filter: 'blur(60px)' }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-white/10">
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} started={started} />
            ))}
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
        />
      </section>

      <div
        className="relative overflow-hidden py-4"
        style={{ background: 'linear-gradient(135deg, #0000ff 0%, #0000cc 100%)' }}
      >
        <div
          className="flex items-center gap-0 whitespace-nowrap"
          style={{ animation: 'marquee 28s linear infinite' }}
        >
          {[...Array(3)].map((_, repeatIdx) => (
            <div key={repeatIdx} className="flex items-center gap-8 pr-8">
              {[
                { icon: '✓',  text: "Kenya's Official Authorised EcoFlow Distributor" },
                { icon: '🛡️', text: 'Genuine products · Full manufacturer warranty' },
                { icon: '⚡', text: 'EcoFlow-certified service & support' },
                { icon: '🚚', text: 'Nairobi delivery · Nationwide shipping' },
                { icon: '📞', text: 'Call or WhatsApp: 0716 822 014' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-white/80 text-sm">{item.icon}</span>
                  <span className="text-white font-semibold text-sm">{item.text}</span>
                  <span className="text-white/30 text-sm mx-2">·</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
