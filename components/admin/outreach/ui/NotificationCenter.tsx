'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, Flame, MessageSquare, Repeat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet } from './Sheet'

interface OutreachAlert {
  kind: 'whatsapp_message' | 'hot_lead' | 'batch_failed' | 'autopilot_error'
  id: string
  createdAt: string
  title: string
  subtitle: string
  url: string
}

const KIND_META: Record<OutreachAlert['kind'], { label: string; icon: LucideIcon; tone: string }> = {
  whatsapp_message: { label: 'WhatsApp', icon: MessageSquare, tone: 'text-[var(--bq-success)] bg-[var(--bq-success-light)]' },
  hot_lead: { label: 'Hot leads', icon: Flame, tone: 'text-[var(--bq-warning)] bg-[var(--bq-warning-light)]' },
  batch_failed: { label: 'Send failures', icon: Repeat, tone: 'text-[var(--bq-danger)] bg-[var(--bq-danger-light)]' },
  autopilot_error: { label: 'Autopilot errors', icon: AlertTriangle, tone: 'text-[var(--bq-danger)] bg-[var(--bq-danger-light)]' },
}

const READ_CURSOR_KEY = 'bq-outreach-notif-read-at'

function fmtShort(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function NotificationCenter({
  onNavigate,
  variant = 'dark',
}: {
  onNavigate: (hash: string) => void
  /** 'dark' for the navy sidebar context, 'light' for the white header bar. */
  variant?: 'dark' | 'light'
}) {
  const [alerts, setAlerts] = useState<OutreachAlert[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    let since: string
    try {
      since = localStorage.getItem(READ_CURSOR_KEY) || new Date(Date.now() - 7 * 86_400_000).toISOString()
    } catch {
      since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    }
    // Widen the window so already-read items still render (for context) —
    // unread is computed client-side against the stored read cursor below.
    const widenedSince = new Date(Math.min(Date.parse(since), Date.now() - 24 * 60 * 60 * 1000)).toISOString()
    try {
      const res = await fetch(`/api/admin/outreach/alerts?since=${encodeURIComponent(widenedSince)}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list = (data.alerts ?? []) as OutreachAlert[]
      setAlerts(list.slice().reverse())

      let readAt = 0
      try {
        readAt = Date.parse(localStorage.getItem(READ_CURSOR_KEY) || '') || 0
      } catch { /* ignore */ }
      const unread = list.filter((a) => Date.parse(a.createdAt) > readAt).length
      setUnreadCount(unread)

      if ('setAppBadge' in navigator) {
        if (unread > 0) navigator.setAppBadge(unread).catch(() => {})
        else navigator.clearAppBadge?.().catch(() => {})
      }
    } catch { /* offline — keep showing the last loaded list */ }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  function openPanel() {
    setOpen(true)
    try {
      localStorage.setItem(READ_CURSOR_KEY, new Date().toISOString())
    } catch { /* ignore */ }
    setUnreadCount(0)
    navigator.clearAppBadge?.().catch(() => {})
  }

  const grouped = (Object.keys(KIND_META) as OutreachAlert['kind'][])
    .map((kind) => ({ kind, items: alerts.filter((a) => a.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        title="Notifications"
        className={
          variant === 'dark'
            ? 'relative h-9 w-9 sm:h-8 sm:w-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition flex-shrink-0'
            : 'relative h-11 w-11 rounded-2xl bg-white border border-[var(--bq-border)] flex items-center justify-center text-[var(--bq-text-secondary)] hover:text-[var(--bq-blue)] transition flex-shrink-0'
        }
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--bq-danger)] text-white text-[9px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {grouped.length === 0 ? (
          <div className="py-14 text-center">
            <Bell className="w-8 h-8 mx-auto text-[var(--bq-text-tertiary)]" />
            <p className="mt-3 bq-text-body text-[var(--bq-text-tertiary)]">Nothing in the last 7 days.</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {grouped.map((g) => {
              const meta = KIND_META[g.kind]
              const Icon = meta.icon
              return (
                <div key={g.kind}>
                  <p className="bq-text-caption uppercase tracking-wide text-[var(--bq-text-tertiary)] mb-2 px-1">
                    {meta.label}
                  </p>
                  <div className="space-y-2">
                    {g.items.map((a) => (
                      <button
                        key={`${a.kind}-${a.id}`}
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          onNavigate(a.url.split('#')[1] || '')
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)] text-left hover:border-[var(--bq-border-strong)] transition-colors"
                      >
                        <span className={`h-8 w-8 rounded-[var(--bq-radius-md)] flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block bq-text-body font-semibold text-[var(--bq-text-primary)] truncate">{a.title}</span>
                          <span className="block bq-text-caption text-[var(--bq-text-secondary)] truncate">{a.subtitle}</span>
                          <span className="block bq-text-caption text-[var(--bq-text-tertiary)] mt-0.5">{fmtShort(a.createdAt)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sheet>
    </>
  )
}
