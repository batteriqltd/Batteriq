'use client'

import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type ProductRailProps = {
  children: React.ReactNode
  /** Cards visible at once on laptop+ (4 or 5). Phones show 2, tablets 3. */
  perView?: 4 | 5
}

/**
 * One-row product slider: keeps every homepage section inside a single screen
 * height. Swipe / trackpad / arrow buttons move sideways; scroll-snap lines
 * the cards up.
 */
export function ProductRail({ children, perView = 4 }: ProductRailProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  function scrollBy(dir: 1 | -1) {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  const itemWidth =
    perView === 5
      ? 'w-[46%] sm:w-[31.5%] lg:w-[23.5%] xl:w-[18.8%]'
      : 'w-[46%] sm:w-[31.5%] lg:w-[23.5%]'

  return (
    <div className="relative">
      <div
        ref={ref}
        className="product-rail flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
      >
        {Children.map(children, (child) =>
          child ? <div className={`${itemWidth} shrink-0 snap-start flex`}>{child}</div> : null
        )}
      </div>

      {canPrev && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous products"
          className="hidden sm:flex absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-white hover:bg-bq-blue transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="More products"
          className="hidden sm:flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-white hover:bg-bq-blue transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
