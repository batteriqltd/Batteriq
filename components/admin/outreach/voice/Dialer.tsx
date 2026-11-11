'use client'

import { useEffect, useMemo, useState } from 'react'
import { Delete, Phone, Search } from 'lucide-react'
import type { OutreachLead, OutreachVoiceCall } from '@/lib/outreach/types'
import { useVoice } from './VoiceProvider'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

/** Formats a raw Kenyan number as the user types: 0712 345 678 / +254 712 345 678. */
function formatKenyanDisplay(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+254')) {
    const rest = digits.slice(4)
    return `+254 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)}`.trim()
  }
  if (digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`.trim()
  }
  return digits
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return `+${digits}`
  if (digits.startsWith('254')) return `+${digits}`
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`
  return digits ? `+${digits}` : ''
}

export function Dialer({ leads }: { leads: OutreachLead[] }) {
  const { configured, ready, phase, call } = useVoice()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<OutreachVoiceCall[]>([])

  useEffect(() => {
    fetch('/api/outreach/calls')
      .then((r) => r.json())
      .then((data) => setRecent((data.calls ?? []).filter((c: OutreachVoiceCall) => c.direction === 'outbound').slice(0, 8)))
      .catch(() => {})
  }, [phase]) // refresh after a call ends

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return leads.filter((l) => l.business_name.toLowerCase().includes(q) || l.phone_e164?.includes(q)).slice(0, 6)
  }, [leads, search])

  function pressKey(key: string) {
    setInput((v) => v + key)
  }

  function dialCurrent(leadId?: string) {
    const e164 = toE164(input)
    if (!e164) return
    call(e164, leadId)
  }

  const disabled = !configured || !ready || phase !== 'idle'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-[20px] bg-[var(--bq-surface)] border border-[var(--bq-border)] p-5">
        <h3 className="bq-text-headline text-[var(--bq-text-primary)] mb-1">Dialer</h3>
        {!configured ? (
          <p className="bq-text-caption text-[var(--bq-warning)] mb-4">
            Voice calling isn&apos;t connected yet — add Africa&apos;s Talking credentials to enable.
          </p>
        ) : (
          <p className="bq-text-caption text-[var(--bq-text-tertiary)] mb-4">
            {ready ? 'Connected — ready to call.' : 'Connecting…'}
          </p>
        )}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+254 7XX XXX XXX"
          className="w-full h-14 px-4 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)] text-center text-xl font-bold font-mono text-[var(--bq-text-primary)] outline-none focus:border-[var(--bq-blue)]"
        />
        <p className="text-center bq-text-caption text-[var(--bq-text-tertiary)] mt-1.5 h-4">
          {input && formatKenyanDisplay(toE164(input))}
        </p>

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pressKey(k)}
              className="h-14 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] hover:bg-[var(--bq-border)] text-xl font-bold text-[var(--bq-text-primary)] transition-colors"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={() => setInput((v) => v.slice(0, -1))}
            disabled={!input}
            aria-label="Backspace"
            className="h-12 w-12 rounded-full bg-[var(--bq-surface-sunken)] text-[var(--bq-text-secondary)] flex items-center justify-center disabled:opacity-40"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => dialCurrent()}
            disabled={disabled || !input}
            className="flex-1 h-12 rounded-[var(--bq-radius-lg)] bg-[var(--bq-blue)] hover:bg-[var(--bq-blue-dim)] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Phone className="w-4 h-4" /> Call
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[20px] bg-[var(--bq-surface)] border border-[var(--bq-border)] p-5">
          <h3 className="bq-text-headline text-[var(--bq-text-primary)] mb-3">Call a client</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--bq-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full h-11 pl-10 pr-3 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)] text-[13px] outline-none focus:border-[var(--bq-blue)]"
            />
          </div>
          {matches.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {matches.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  disabled={disabled || !l.phone_e164}
                  onClick={() => {
                    setInput(l.phone_e164 || '')
                    call(l.phone_e164 || '', l.id)
                  }}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-[var(--bq-radius-md)] hover:bg-[var(--bq-surface-sunken)] text-left disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--bq-text-primary)] truncate">{l.business_name}</span>
                    <span className="block text-[11px] text-[var(--bq-text-tertiary)] font-mono">{l.phone_e164 || 'No phone'}</span>
                  </span>
                  <Phone className="w-3.5 h-3.5 text-[var(--bq-blue)] flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[20px] bg-[var(--bq-surface)] border border-[var(--bq-border)] p-5">
          <h3 className="bq-text-headline text-[var(--bq-text-primary)] mb-3">Recent calls</h3>
          {recent.length === 0 ? (
            <p className="bq-text-caption text-[var(--bq-text-tertiary)]">No outbound calls yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-[var(--bq-radius-md)] bg-[var(--bq-surface-sunken)]">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--bq-text-primary)] truncate">
                      {c.outreach_leads?.business_name || c.to_number}
                    </span>
                    <span className="block text-[11px] text-[var(--bq-text-tertiary)] font-mono">{c.to_number}</span>
                  </span>
                  <button
                    type="button"
                    disabled={disabled || !c.to_number}
                    onClick={() => { setInput(c.to_number || ''); call(c.to_number || '', c.lead_id || undefined) }}
                    aria-label={`Call ${c.to_number}`}
                    className="h-8 w-8 rounded-full bg-[var(--bq-blue-light)] text-[var(--bq-blue)] flex items-center justify-center disabled:opacity-40"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
