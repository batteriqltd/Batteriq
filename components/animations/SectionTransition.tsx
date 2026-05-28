'use client'
import { useEffect, useRef } from 'react'

interface SectionTransitionProps {
  children: React.ReactNode
  id?: string
  className?: string
  animationType?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right'
}

export function SectionTransition({
  children,
  id,
  className = '',
  animationType = 'fade-up',
}: SectionTransitionProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const isMobile = window.innerWidth < 768
    const duration = isMobile ? 0.5 : 0.85
    const yOffset = isMobile ? 20 : 50

    async function setup() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { gsap } = await import('gsap') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ScrollTrigger } = await import('gsap/ScrollTrigger') as any
      gsap.registerPlugin(ScrollTrigger)

      if (!ref.current) return

      const fromVars: Record<string, number> = { opacity: 0 }
      if (animationType === 'fade-up') fromVars.y = yOffset
      if (animationType === 'slide-left') fromVars.x = -yOffset
      if (animationType === 'slide-right') fromVars.x = yOffset

      gsap.set(ref.current, fromVars)

      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(ref.current, {
            opacity: 1,
            y: 0,
            x: 0,
            duration,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
          })
        },
      })
    }

    setup()
  }, [animationType])

  return (
    <section ref={ref} id={id} className={className}>
      {children}
    </section>
  )
}
