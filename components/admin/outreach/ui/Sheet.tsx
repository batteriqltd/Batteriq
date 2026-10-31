'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom sheet — the mobile-native stand-in for a centered modal.
 * Desktop callers can still use it (it just centers), but on phones it docks
 * to the bottom with a drag handle and respects the home-indicator safe area.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = 'sm:max-w-md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidthClassName?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'var(--bq-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`w-full ${maxWidthClassName} max-h-[88vh] sm:max-h-[85vh] bg-[var(--bq-surface)] rounded-t-[28px] sm:rounded-[28px] shadow-[var(--bq-shadow-4)] flex flex-col overflow-hidden animate-[bq-sheet-in_var(--bq-duration-slow)_var(--bq-ease-spring)]`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex-shrink-0 sm:hidden pt-2.5 pb-1 flex justify-center">
          <span className="h-1.5 w-10 rounded-full bg-[var(--bq-border-strong)]" />
        </div>
        {title && (
          <div className="flex-shrink-0 px-5 pt-2 sm:pt-5 pb-3 flex items-center justify-between border-b border-[var(--bq-border)]">
            <h3 className="bq-text-headline text-[var(--bq-text-primary)]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 rounded-full bg-[var(--bq-surface-sunken)] text-[var(--bq-text-secondary)] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <style>{`
        @keyframes bq-sheet-in {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
