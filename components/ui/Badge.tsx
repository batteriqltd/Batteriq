import { cn } from '@/lib/utils'

type BadgeVariant = 'blue' | 'green' | 'red' | 'gray' | 'navy'

type BadgeProps = {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'blue', className, children }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    blue: 'bg-bq-blue text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
    gray: 'bg-bq-gray-600 text-white',
    navy: 'bg-bq-navy text-white',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-[4px]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
