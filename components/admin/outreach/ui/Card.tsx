export function Card({
  children,
  className = '',
  padding = 'md',
}: {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}) {
  const pad = { none: '', sm: 'p-3.5', md: 'p-5', lg: 'p-6' }[padding]
  return (
    <div
      className={`rounded-[var(--bq-radius-2xl)] bg-[var(--bq-surface)] border border-[var(--bq-border)] shadow-[var(--bq-shadow-1)] ${pad} ${className}`}
    >
      {children}
    </div>
  )
}

/** A tappable row inside a list — the base for client cards, email rows, log rows. */
export function ListRow({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)] text-left transition-colors duration-[var(--bq-duration-fast)] ${
        onClick ? 'hover:border-[var(--bq-border-strong)] active:scale-[0.995]' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}
