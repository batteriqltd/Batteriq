'use client'

import { AlertTriangle, CheckCircle, X } from 'lucide-react'

export type ToastMessage = { type: 'ok' | 'err'; text: string }

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  if (!toast) return null
  const ok = toast.type === 'ok'
  return (
    <div
      className="flex items-start justify-between gap-3 px-4 py-3 rounded-[var(--bq-radius-lg)] bq-text-caption font-semibold border"
      style={{
        background: ok ? 'var(--bq-success-light)' : 'var(--bq-danger-light)',
        borderColor: 'transparent',
        color: ok ? 'var(--bq-success)' : 'var(--bq-danger)',
      }}
      role="status"
    >
      <span className="flex items-start gap-2">
        {ok ? (
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-px" />
        ) : (
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
        )}
        {toast.text}
      </span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        <X className="w-4 h-4 opacity-60" />
      </button>
    </div>
  )
}
