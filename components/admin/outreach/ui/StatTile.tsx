type Accent = 'blue' | 'amber' | 'success' | 'danger'

const DOT_CLS: Record<Accent, string> = {
  blue: 'bg-[var(--bq-blue)]',
  amber: 'bg-[var(--bq-amber)]',
  success: 'bg-[var(--bq-success)]',
  danger: 'bg-[var(--bq-danger)]',
}

export function StatTile({
  label,
  value,
  accent = 'blue',
}: {
  label: string
  value: number | string
  accent?: Accent
}) {
  return (
    <div className="rounded-[var(--bq-radius-xl)] bg-[var(--bq-surface)] border border-[var(--bq-border)] p-4 shadow-[var(--bq-shadow-1)]">
      <p className="flex items-center gap-1.5 bq-text-caption text-[var(--bq-text-tertiary)]">
        <span className={`h-2 w-2 rounded-full ${DOT_CLS[accent]}`} /> {label}
      </p>
      <p className="mt-1.5 bq-text-title2 bq-tabular text-[var(--bq-text-primary)] truncate">{value}</p>
    </div>
  )
}
