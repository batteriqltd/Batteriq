export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--bq-radius-md)] bg-[var(--bq-border)] ${className}`}
    />
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)]">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
