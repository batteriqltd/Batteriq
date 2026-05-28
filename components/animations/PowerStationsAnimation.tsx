'use client'
import { useEffect } from 'react'

export function PowerStationsAnimation() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const init = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).gsap === 'undefined' || typeof (window as any).ScrollTrigger === 'undefined') {
        setTimeout(init, 150)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gsap = (window as any).gsap
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ScrollTrigger = (window as any).ScrollTrigger

      const delta = document.querySelector('[data-hero-panel="delta"]')
      const river = document.querySelector('[data-hero-panel="river"]')

      if (delta) {
        gsap.from(delta, {
          x: -60, opacity: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: delta, start: 'top 85%', once: true },
        })
      }
      if (river) {
        gsap.from(river, {
          x: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.15,
          scrollTrigger: { trigger: river, start: 'top 85%', once: true },
        })
      }
    }

    init()
  }, [])

  return null
}
