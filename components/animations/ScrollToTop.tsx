'use client'

import { useEffect } from 'react'

// Every fresh load or refresh must open at the very top (hero) —
// browsers otherwise restore the previous scroll position on reload.
export function ScrollToTop() {
  useEffect(() => {
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    } catch {
      // ignore
    }
    window.scrollTo(0, 0)
  }, [])

  return null
}
