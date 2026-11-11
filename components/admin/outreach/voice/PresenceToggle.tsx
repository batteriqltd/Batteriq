'use client'

import { useEffect, useState } from 'react'
import type { AgentPresenceStatus } from '@/lib/outreach/types'
import { useVoice } from './VoiceProvider'

const OPTIONS: Array<{ value: AgentPresenceStatus; label: string; dot: string }> = [
  { value: 'available', label: 'Available', dot: 'bg-emerald-500' },
  { value: 'busy', label: 'Busy', dot: 'bg-amber-500' },
  { value: 'away', label: 'Away', dot: 'bg-slate-400' },
  { value: 'offline', label: 'Offline', dot: 'bg-slate-300' },
]

export function PresenceToggle({ adminEmail }: { adminEmail: string }) {
  const { configured } = useVoice()
  const [status, setStatus] = useState<AgentPresenceStatus>('offline')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!adminEmail) return
    fetch('/api/outreach/presence')
      .then((r) => r.json())
      .then((data) => {
        const mine = (data.agents ?? []).find(
          (a: { admin_email: string; status: AgentPresenceStatus }) => a.admin_email === adminEmail
        )
        if (mine) setStatus(mine.status)
      })
      .catch(() => {})
  }, [adminEmail])

  async function setPresence(next: AgentPresenceStatus) {
    setSaving(true)
    try {
      const res = await fetch('/api/outreach/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) setStatus(next)
    } finally {
      setSaving(false)
    }
  }

  const current = OPTIONS.find((o) => o.value === status) || OPTIONS[3]

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => setPresence(opt.value)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-[var(--bq-radius-md)] text-[11px] font-bold transition-colors disabled:opacity-60 ${
              status === opt.value ? 'bg-[var(--bq-surface)] shadow-[var(--bq-shadow-1)] text-[var(--bq-text-primary)]' : 'text-[var(--bq-text-secondary)]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
            {opt.label}
          </button>
        ))}
      </div>
      {!configured && (
        <span className="text-[10px] font-bold text-[var(--bq-warning)] bg-[var(--bq-warning-light)] px-2 py-1 rounded-full">
          Not connected
        </span>
      )}
      <span className="sr-only">Current status: {current.label}</span>
    </div>
  )
}
