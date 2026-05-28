'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AOSInit() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const reinit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).AOS !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).AOS.refresh()
      }
    }
    const t = setTimeout(reinit, 150)
    return () => clearTimeout(t)
  }, [pathname])

  return null
}
