'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function GSAPProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    async function initGSAP() {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)
      ScrollTrigger.refresh()
    }

    initGSAP()
  }, [pathname])

  return null
}
