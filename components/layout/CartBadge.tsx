'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

export function CartBadge() {
  const [mounted, setMounted] = useState(false)
  const totalItems = useCartStore((s) => s.totalItems())

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || totalItems === 0) return null

  return (
    <span
      suppressHydrationWarning
      className="absolute -top-1 -right-1 w-5 h-5 bg-bq-blue text-white text-xs font-bold rounded-full flex items-center justify-center pointer-events-none"
    >
      {totalItems > 99 ? '99+' : totalItems}
    </span>
  )
}
