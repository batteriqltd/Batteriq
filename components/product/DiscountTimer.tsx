'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function DiscountTimer({ discountEnd }: { discountEnd: string }) {
  const [label, setLabel] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function tick() {
      const diff = new Date(discountEnd).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        return
      }
      const totalSeconds = Math.floor(diff / 1000)
      const d = Math.floor(totalSeconds / 86400)
      const h = Math.floor((totalSeconds % 86400) / 3600)
      const m = Math.floor((totalSeconds % 3600) / 60)
      const s = totalSeconds % 60
      if (d > 0) {
        setLabel(`${d}d ${h}h left`)
      } else {
        setLabel(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        )
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [discountEnd])

  if (expired) return null

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 font-mono">
      <Clock size={9} />
      {label}
    </span>
  )
}
