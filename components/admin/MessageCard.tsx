'use client'

import { useState } from 'react'
import { Mail, Phone, MessageSquare, MessageCircle, Check, Loader2 } from 'lucide-react'
import type { ContactSubmission } from '@/lib/supabase/types'

// Messages saved by older form versions can arrive percent-encoded or with
// HTML entities — decode both so the admin always reads plain text.
function decodeText(raw: string | null | undefined): string {
  let s = String(raw ?? '')
  for (let i = 0; i < 2 && /%[0-9A-Fa-f]{2}/.test(s); i++) {
    try {
      s = decodeURIComponent(s.replace(/\+/g, ' '))
    } catch {
      break
    }
  }
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

export function MessageCard({ message: m }: { message: ContactSubmission }) {
  const [status, setStatus] = useState(m.status)
  const [saving, setSaving] = useState(false)

  const firstName = decodeText(m.first_name)
  const lastName = decodeText(m.last_name)
  const body = decodeText(m.message)
  const inquiryType = m.inquiry_type ? decodeText(m.inquiry_type) : null

  async function updateStatus(next: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, status: next }),
      })
      if (res.ok) setStatus(next)
    } catch {
      // keep current status on failure
    } finally {
      setSaving(false)
    }
  }

  const submittedAt = m.submitted_at
    ? new Date(m.submitted_at).toLocaleString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—'

  return (
    <div
      className="bg-white rounded-2xl sm:rounded-[28px] p-5 sm:p-8 transition-all hover:shadow-xl hover:shadow-blue-900/5 group"
      style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
    >
      {/* Top row — sender identity + inquiry tag */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
          >
            {firstName.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <p className="text-[15px] sm:text-[17px] font-black text-gray-900 tracking-tight break-words">
                {firstName} {lastName}
              </p>
              {status === 'new' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-blue-600 text-white uppercase tracking-tighter animate-pulse shadow-lg shadow-blue-100">NEW</span>
              )}
              {status === 'replied' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-green-100 text-green-700 uppercase tracking-tighter">REPLIED</span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-[0.12em]">
              {submittedAt}
            </p>
          </div>
        </div>

        {inquiryType && (
          <span className="self-start text-[10px] font-black px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-widest whitespace-nowrap">
            {inquiryType}
          </span>
        )}
      </div>

      {/* Contact details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-100 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
            <Mail size={14} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
            <a href={`mailto:${m.email}`} className="text-[13px] font-bold text-gray-900 hover:text-blue-600 transition-colors break-all">
              {m.email}
            </a>
          </div>
        </div>
        {m.phone && (
          <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-100 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
              <Phone size={14} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
              <a href={`tel:${m.phone}`} className="text-[13px] font-bold text-gray-900 font-mono break-all">{m.phone}</a>
            </div>
          </div>
        )}
      </div>

      {/* Message body — plain, readable, wraps long words/links */}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50/40 border border-blue-100/60 p-4 sm:p-6">
        <MessageSquare size={16} className="text-blue-400 mt-1 flex-shrink-0" />
        <p className="text-[14px] sm:text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words min-w-0">
          {body}
        </p>
      </div>

      {/* Actions — wrap on small screens */}
      <div className="flex flex-wrap items-center gap-3 mt-6">
        <a
          href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${inquiryType ?? 'Your inquiry'} — Batteriq`)}`}
          onClick={() => { if (status !== 'replied') updateStatus('replied') }}
          className="h-11 sm:h-12 px-5 sm:px-7 rounded-2xl text-[11px] sm:text-[12px] font-black text-white transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-blue-100 hover:scale-[1.03] active:scale-95 uppercase tracking-widest w-full sm:w-auto"
          style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
        >
          <Mail size={15} />
          Reply by Email
        </a>
        {m.phone && (
          <a
            href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '254')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { if (status !== 'replied') updateStatus('replied') }}
            className="h-11 sm:h-12 px-5 sm:px-7 rounded-2xl text-[11px] sm:text-[12px] font-black text-white transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-green-100 hover:scale-[1.03] active:scale-95 uppercase tracking-widest w-full sm:w-auto"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <MessageCircle size={15} />
            Reply on WhatsApp
          </a>
        )}
        {status === 'new' && (
          <button
            onClick={() => updateStatus('read')}
            disabled={saving}
            className="h-11 sm:h-12 px-5 rounded-2xl text-[11px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto sm:ml-auto"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Mark as read
          </button>
        )}
      </div>
    </div>
  )
}
