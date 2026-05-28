'use client'
import { useEffect } from 'react'

export function NavAnimation() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const initNav = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).gsap === 'undefined') {
        setTimeout(initNav, 100)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gsap = (window as any).gsap

      const logo = document.querySelector('[data-nav-logo]')
      const navLinks = document.querySelectorAll('[data-nav-link]')
      const navCta = document.querySelector('[data-nav-cta]')

      const tl = gsap.timeline({ delay: 0.1 })

      if (logo) {
        tl.from(logo, { opacity: 0, x: -20, duration: 0.5, ease: 'power2.out' })
      }
      if (navLinks.length > 0) {
        tl.from(navLinks, { opacity: 0, y: -10, duration: 0.4, stagger: 0.07, ease: 'power2.out' }, '-=0.2')
      }
      if (navCta) {
        tl.from(navCta, { opacity: 0, scale: 0.9, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.2')
      }
    }

    initNav()
  }, [])

  return null
}
