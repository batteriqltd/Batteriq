'use client'
import { useEffect, useRef } from 'react'

interface CardRevealProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function CardReveal({ children, className, staggerDelay = 0.08 }: CardRevealProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const isMobile = window.innerWidth < 768
    const duration = isMobile ? 0.45 : 0.6
    const stagger = isMobile ? 0.05 : staggerDelay

    async function setup() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { gsap } = await import('gsap') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ScrollTrigger } = await import('gsap/ScrollTrigger') as any
      gsap.registerPlugin(ScrollTrigger)

      if (!gridRef.current) return
      const cards = Array.from(gridRef.current.children)
      if (cards.length === 0) return

      gsap.set(cards, { opacity: 0, y: 30, scale: 0.97 })

      ScrollTrigger.create({
        trigger: gridRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(cards, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration,
            stagger,
            ease: 'power3.out',
            clearProps: 'all',
          })
        },
      })
    }

    setup()
  }, [staggerDelay])

  return (
    <div ref={gridRef} className={className}>
      {children}
    </div>
  )
}
