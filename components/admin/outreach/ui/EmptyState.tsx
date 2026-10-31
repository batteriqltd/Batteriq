import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title?: string
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
      <span className="h-14 w-14 rounded-[var(--bq-radius-xl)] bg-[var(--bq-blue-light)] text-[var(--bq-blue)] flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </span>
      {title && <p className="bq-text-headline text-[var(--bq-text-primary)]">{title}</p>}
      <p className="bq-text-body text-[var(--bq-text-tertiary)] max-w-[260px]">{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 h-10 px-4 rounded-[var(--bq-radius-lg)] bg-[var(--bq-blue)] hover:bg-[var(--bq-blue-dim)] text-white text-[12px] font-bold transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
