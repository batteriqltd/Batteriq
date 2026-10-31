type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

const TONE_CLS: Record<Tone, string> = {
  neutral: 'bg-[var(--bq-surface-sunken)] text-[var(--bq-text-secondary)] border-[var(--bq-border)]',
  info: 'bg-[var(--bq-blue-light)] text-[var(--bq-blue-dim)] border-transparent',
  success: 'bg-[var(--bq-success-light)] text-[var(--bq-success)] border-transparent',
  warning: 'bg-[var(--bq-warning-light)] text-[var(--bq-warning)] border-transparent',
  danger: 'bg-[var(--bq-danger-light)] text-[var(--bq-danger)] border-transparent',
  accent: 'bg-[var(--bq-amber-light)] text-[var(--bq-amber)] border-transparent',
}

export function StatusPill({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--bq-radius-full)] border text-[11px] font-bold capitalize ${TONE_CLS[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Maps outreach lead/email statuses to a sensible tone without the caller needing to know the palette. */
export function toneForStatus(status: string): Tone {
  switch (status) {
    case 'sent':
    case 'customer':
    case 'interested':
      return 'success'
    case 'hot':
    case 'pending_review':
    case 'approved':
    case 'queued':
      return 'warning'
    case 'failed':
    case 'opted_out':
      return 'danger'
    case 'replied':
      return 'info'
    case 'contacted':
      return 'accent'
    default:
      return 'neutral'
  }
}
