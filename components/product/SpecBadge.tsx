import { cn } from '@/lib/utils'

type SpecBadgeProps = {
  label: string
  value: string
  highlight?: boolean
  className?: string
}

export function SpecBadge({ label, value, highlight = false, className }: SpecBadgeProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 px-3 py-2.5 rounded-[6px] border',
        highlight
          ? 'bg-bq-blue/10 border-bq-blue/30 text-bq-blue'
          : 'bg-bq-gray-900 border-bq-gray-600 text-white',
        className
      )}
    >
      <span className="text-xs text-bq-gray-400 uppercase tracking-wider leading-none">{label}</span>
      <span className="text-sm font-bold font-mono leading-snug">{value}</span>
    </div>
  )
}
