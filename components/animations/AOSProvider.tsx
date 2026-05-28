'use client'
import 'aos/dist/aos.css'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AOSProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    async function initAOS() {
      const AOS = (await import('aos')).default
      AOS.init({
        duration: 700,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
        delay: 0,
      })
      AOS.refresh()
    }

    initAOS()
  }, [pathname])

  return null
}
