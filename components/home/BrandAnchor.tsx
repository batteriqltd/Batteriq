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
        className="shrink-0 flex items-center gap-1.5 text-sm text-bq-blue font-medium hover:text-bq-blue-dim transition-colors"
      >
        See all <ChevronRight size={16} />
      </Link>
    </div>
  )
}
