import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

type BrandAnchorProps = {
  brand: string
  category: string
  seeAllHref: string
  h2?: string
  subtitle?: string
}

export function BrandAnchor({ brand, category, seeAllHref, h2, subtitle }: BrandAnchorProps) {
  return (
    <div className="flex items-end justify-between mb-6 sm:mb-8 gap-4">
      <div>
        <p className="text-xs font-bold text-bq-blue uppercase tracking-widest mb-1">{brand}</p>
        <h2 className="h2-fluid text-gray-900">
          {h2 ?? `${brand} ${category}`}
        </h2>
        {subtitle && (
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      <Link
        href={seeAllHref}
        className="shrink-0 group inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-sm font-black text-[#0000ff] bg-white border border-blue-100 transition-all duration-200 hover:bg-[#0000ff] hover:text-white hover:border-[#0000ff] hover:-translate-y-0.5 active:scale-[0.97]"
        style={{ boxShadow: '0 2px 12px rgba(0,0,255,0.08)' }}
      >
        See all
        <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
