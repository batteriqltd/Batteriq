export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3.5 rounded-[var(--bq-radius-full)] text-[12px] font-bold capitalize whitespace-nowrap transition-colors duration-[var(--bq-duration-fast)] ${
        active
          ? 'bg-[var(--bq-blue)] text-white shadow-[var(--bq-shadow-1)]'
          : 'bg-[var(--bq-surface-sunken)] text-[var(--bq-text-secondary)] hover:bg-[var(--bq-border)]'
      }`}
    >
      {children}
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="inline-flex rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 h-9 rounded-[var(--bq-radius-md)] text-[12px] font-bold capitalize transition-colors duration-[var(--bq-duration-fast)] ${
            value === opt.value
              ? 'bg-[var(--bq-blue)] text-white shadow-[var(--bq-shadow-1)]'
              : 'text-[var(--bq-blue-dim)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
