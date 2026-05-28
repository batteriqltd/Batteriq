import { cn } from '@/lib/utils'

type DiscountBadgeProps = {
  percent: number
  label?: string
  className?: string
}

export function DiscountBadge({ percent, label, className }: DiscountBadgeProps) {
  if (!percent && !label) return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 bg-bq-blue text-white text-xs font-bold rounded-[4px] uppercase tracking-wider',
        className
      )}
    >
      {label ?? `-${percent}%`}
    </span>
  )
}
