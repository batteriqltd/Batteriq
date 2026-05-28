'use client'
import { useEffect, useRef } from 'react'

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ref.current.classList.add('page-enter')
  }, [])

  return <div ref={ref}>{children}</div>
}
