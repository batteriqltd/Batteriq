'use client'
import { useEffect } from 'react'

const SECTION_IDS = [
  'power-stations',
  'solar-panels',
  'batteries',
  'powerkits',
  'appliances',
  'bluetti',
]

export function SectionObserver() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            window.history.replaceState(null, '', `#${entry.target.id}`)
          }
        })
      },
      {
        threshold: 0.3,
        rootMargin: '-10% 0px -60% 0px',
      }
    )

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return null
}
