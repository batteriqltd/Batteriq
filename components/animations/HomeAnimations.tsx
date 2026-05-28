'use client'
import { useEffect } from 'react'

export function HomeAnimations() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    async function initAnimations() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { gsap } = await import('gsap') as any

      const heroTitle = document.querySelector('[data-hero-title]')
      if (heroTitle) {
        gsap.to(heroTitle, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.2 })
      }

      const heroSub = document.querySelector('[data-hero-sub]')
      if (heroSub) {
        gsap.to(heroSub, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.45 })
      }

      const heroBtns = document.querySelectorAll('[data-hero-btn]')
      if (heroBtns.length > 0) {
        gsap.to(heroBtns, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12, delay: 0.65 })
      }

      const trustItems = document.querySelectorAll('[data-trust-item]')
      if (trustItems.length > 0) {
        gsap.to(trustItems, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08, delay: 0.9 })
      }
    }

    initAnimations()
  }, [])

  return null
}
