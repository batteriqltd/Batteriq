'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  Bot,
  CheckCheck,
  Clock,
  FileText,
  Flame,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import {
  LEAD_STATUSES,
  type LeadStatus,
  type OutreachConversation,
  type OutreachMessage,
} from '@/lib/outreach/types'

const APPROVED_TEMPLATES = [
  {
    name: 'batteriq_quote_ready',
    label: 'Commercial Proforma & Backup Quote Ready',
    preview:
      'Hello {{1}}, your Batteriq Kenya commercial backup & eTIMS proforma quote is ready. Reply YES to review details with our specialist.',
  },
  {
    name: 'batteriq_business_reply',
    label: 'Business Power Inquiry Follow-up',
    preview:
      'Hello {{1}}, thank you for reaching out to Batteriq Kenya. How can our team assist with your EcoFlow or BLUETTI power backup setup today?',
  },
  {
    name: 'batteriq_inquiry_followup',
    label: 'Website Lead Check-in',
    preview:
      'Hello {{1}}, following up on your recent inquiry at batteriq.com regarding backup power solutions. Reply here anytime if you would like a tailored quote.',
  },
]

function isWithin24Hours(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false
  const diffMs = Date.now() - new Date(lastInboundAt).getTime()
  return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000
}

export function WhatsAppInboxTab({
  defaultTemplateName,
  onStatsChange,
}: {
  defaultTemplateName: string
  onStatsChange?: () => void
}) {
  const [conversations, setConversations] = useState<OutreachConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)
  const [templateName, setTemplateName] = useState(
    defaultTemplateName || APPROVED_TEMPLATES[0].name
  )
  const [templateParam1, setTemplateParam1] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/outreach/conversations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list = (data.conversations ?? []) as OutreachConversation[]
      setConversations(list)
      setSelectedId((prev) => prev || list[0]?.id || null)
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingThread(true)
    try {
      const res = await fetch(`/api/admin/outreach/conversations/${convId}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages((data.messages ?? []) as OutreachMessage[])
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    const timer = setInterval(loadConversations, 12_000)
    return () => clearInterval(timer)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    loadMessages(selectedId)
  }, [selectedId, loadMessages])

  const activeConv = conversations.find((c) => c.id === selectedId) || null
  const windowOpen = activeConv ? isWithin24Hours(activeConv.last_inbound_at) : false
  const canMessageAtAll = activeConv
    ? activeConv.status !== 'opted_out' &&
      (activeConv.opted_in || Boolean(activeConv.last_inbound_at))
    : false

  useEffect(() => {
    if (activeConv) {
      setTemplateParam1(
        activeConv.contact_name ||
          activeConv.outreach_leads?.business_name ||
          'there'
      )
      setUseTemplate(!isWithin24Hours(activeConv.last_inbound_at))
    }
  }, [activeConv])

  async function handleToggleMode(nextMode: 'ai' | 'human') {
    if (!activeConv) return
    setFeedback(null)
    const res = await fetch(`/api/admin/outreach/conversations/${activeConv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: nextMode }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, mode: nextMode, status: nextMode === 'ai' ? 'open' : c.status }
            : c
        )
      )
      setFeedback({
        type: 'ok',
        text:
          nextMode === 'ai'
            ? 'AI Takeover active — Gemini 3.5 Flash handles incoming WhatsApp replies automatically.'
            : 'Human Mode active — AI auto-replies paused for this thread.',
      })
      onStatsChange?.()
    } else {
      setFeedback({ type: 'err', text: data.error || 'Could not switch mode' })
    }
  }

  async function handleLeadStatusChange(nextStatus: LeadStatus) {
    if (!activeConv?.lead_id) return
    const res = await fetch('/api/admin/outreach/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeConv.lead_id,
        status: nextStatus,
        mark_human_contacted: true,
      }),
    })
    if (res.ok) {
      await loadConversations()
      onStatsChange?.()
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!activeConv) return
    setFeedback(null)

    const mustUseTemplate = !windowOpen || useTemplate
    if (!mustUseTemplate && !textDraft.trim()) return

    setSending(true)
    try {
      const payload = mustUseTemplate
        ? {
            conversationId: activeConv.id,
            phoneE164: activeConv.phone_e164,
            type: 'template',
            templateName,
            templateParams: [templateParam1 || 'there'],
          }
        : {
            conversationId: activeConv.id,
            phoneE164: activeConv.phone_e164,
            type: 'text',
            text: textDraft.trim(),
          }

      const res = await fetch('/api/admin/outreach/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'WhatsApp send failed' })
      } else {
        setTextDraft('')
        await loadMessages(activeConv.id)
        await loadConversations()
        onStatsChange?.()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-[#ecebf7] shadow-[0_12px_32px_-18px_rgba(0,0,77,0.15)] overflow-hidden text-[#0b1a3a]">
      {/* Top Telemetry & Compliance Strip */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#f5f4fc] border-b border-[#e8e5f7] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs font-medium text-[#5844d8]">
          <ShieldCheck className="w-4 h-4 text-[#6c5dd3] flex-shrink-0" />
          <span>
            <strong className="text-[#1f1d3d]">WhatsApp Cloud &amp; AI Takeover:</strong> Free-form
            AI/staff replies inside 24h window · Approved Meta templates outside 24h · Permanent
            Kenya DPA opt-out guard.
          </span>
        </div>
        <button
          onClick={loadConversations}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6c5dd3] hover:text-[#1f1d3d] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Sync
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* Left Pane: Thread List (visible on desktop or when mobileShowThread is false) */}
        <div
          className={`lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#ecebf7] flex flex-col max-h-[620px] overflow-y-auto ${
            mobileShowThread ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {loadingList ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading conversations…</div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-[#0b1a3a]">No WhatsApp threads yet</p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Inbound messages to your WhatsApp Cloud webhook, template dispatches, and consented
                follow-ups appear here in real time.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const selected = conv.id === selectedId
              const isOpen24h = isWithin24Hours(conv.last_inbound_at)
              const leadStatus = conv.outreach_leads?.status
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(conv.id)
                    setMobileShowThread(true)
                  }}
                  className={`w-full text-left px-5 py-4 border-b border-[#eef2fa] transition-colors ${
                    selected ? 'bg-[#f5f4fc] border-l-2 border-l-[#6c5dd3]' : 'hover:bg-[#f6f5fc]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#0b1a3a] truncate">
                      {conv.contact_name ||
                        conv.outreach_leads?.business_name ||
                        conv.phone_e164}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {leadStatus === 'hot' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                          <Flame className="w-3 h-3" /> Hot
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          conv.mode === 'ai'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {conv.mode === 'ai' ? 'AI' : 'Human'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-slate-400 mt-0.5">{conv.phone_e164}</p>
                  <p className="text-xs text-slate-500 truncate mt-1.5">
                    {conv.last_message_preview || 'No messages'}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-[10px] font-bold ${
                        conv.status === 'opted_out'
                          ? 'text-red-600'
                          : isOpen24h
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {conv.status === 'opted_out'
                        ? 'Opted Out'
                        : isOpen24h
                          ? '● 24h Window Open'
                          : 'Template Mode (>24h)'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Right Pane: Active Thread */}
        <div
          className={`lg:col-span-8 flex flex-col justify-between bg-[#f8f8fd] ${
            !mobileShowThread ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center p-12 text-sm text-slate-500">
              Select a WhatsApp conversation to view live messages and AI Takeover controls.
            </div>
          ) : (
            <>
              {/* Conversation Top Bar */}
              <div className="px-4 sm:px-6 py-4 bg-white border-b border-[#ecebf7] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="lg:hidden p-2 rounded-xl bg-[#f6f5fc] text-slate-600 hover:text-[#0b1a3a]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-[#0b1a3a] truncate">
                        {activeConv.contact_name ||
                          activeConv.outreach_leads?.business_name ||
                          activeConv.phone_e164}
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        {activeConv.phone_e164}
                      </span>
                    </div>
                    {activeConv.escalated_reason && activeConv.mode === 'human' && (
                      <p className="text-xs font-semibold text-amber-700 mt-0.5">
                        Escalated to Human: {activeConv.escalated_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeConv.lead_id && (
                    <select
                      value={activeConv.outreach_leads?.status || 'replied'}
                      onChange={(e) => handleLeadStatusChange(e.target.value as LeadStatus)}
                      className="h-9 px-3 rounded-xl border border-[#e7e5f6] bg-[#f8f8fd] text-xs font-bold text-[#0b1a3a] outline-none focus:border-[#6c5dd3]"
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white text-[#0b1a3a]">
                          {st.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="inline-flex rounded-xl p-1 bg-[#f8f8fd] border border-[#e7e5f6]">
                    <button
                      type="button"
                      onClick={() => handleToggleMode('ai')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeConv.mode === 'ai'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-[#0b1a3a]'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" /> AI Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMode('human')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeConv.mode === 'human'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-[#0b1a3a]'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Human
                    </button>
                  </div>
                </div>
              </div>

              {feedback && (
                <div
                  className={`mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                    feedback.type === 'ok'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[390px]">
                {loadingThread ? (
                  <p className="text-center text-xs text-slate-500 py-8">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">
                    No messages in this conversation yet.
                  </p>
                ) : (
                  messages.map((m) => {
                    const inbound = m.direction === 'inbound'
                    return (
                      <div
                        key={m.id}
                        className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                            inbound
                              ? 'bg-white border border-[#ecebf7] text-[#0b1a3a]'
                              : m.sender_type === 'ai'
                                ? 'bg-gradient-to-br from-[#6c5dd3] to-[#5844d8] text-white'
                                : m.sender_type === 'system_template'
                                  ? 'bg-emerald-600/90 text-white'
                                  : 'bg-[#1f1d3d] text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1 opacity-75 text-[10px] font-bold uppercase tracking-wider">
                            <span>
                              {inbound
                                ? 'Client'
                                : m.sender_type === 'ai'
                                  ? 'Gemini AI'
                                  : m.sender_type === 'system_template'
                                    ? `Template (${m.template_name || 'approved'})`
                                    : 'Batteriq Staff'}
                            </span>
                            <span>·</span>
                            <span>
                              {new Date(m.created_at).toLocaleTimeString('en-KE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {!inbound && <CheckCheck className="w-3 h-3" />}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-[13px]">
                            {m.body}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Composer */}
              <div className="p-4 bg-white border-t border-[#ecebf7]">
                {!canMessageAtAll ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                    <Ban className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Messaging blocked: contact opted out or has no initiated / consented WhatsApp
                      session.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-[#6c5dd3]" />
                        {windowOpen
                          ? '24-hour customer care window active — free-form reply allowed'
                          : 'Outside 24-hour window — approved Meta template required'}
                      </span>
                      {windowOpen && (
                        <button
                          type="button"
                          onClick={() => setUseTemplate((v) => !v)}
                          className="inline-flex items-center gap-1 text-[#6c5dd3] font-bold hover:text-[#5844d8]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {useTemplate ? 'Switch to Free-form Text' : 'Send Approved Template'}
                        </button>
                      )}
                    </div>

                    {!windowOpen || useTemplate ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <select
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="sm:col-span-5 h-11 px-3 rounded-xl border border-[#e7e5f6] text-xs font-bold text-[#0b1a3a] bg-[#f8f8fd] outline-none focus:border-[#6c5dd3]"
                        >
                          {APPROVED_TEMPLATES.map((tpl) => (
                            <option
                              key={tpl.name}
                              value={tpl.name}
                              className="bg-white text-[#0b1a3a]"
                            >
                              {tpl.label} ({tpl.name})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={templateParam1}
                          onChange={(e) => setTemplateParam1(e.target.value)}
                          placeholder="Recipient name ({{1}})"
                          className="sm:col-span-4 h-11 px-3 rounded-xl border border-[#e7e5f6] bg-[#f8f8fd] text-xs font-medium text-[#0b1a3a] outline-none focus:border-[#6c5dd3]"
                        />
                        <button
                          type="submit"
                          disabled={sending}
                          className="sm:col-span-3 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sending ? 'Sending…' : 'Send Template'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={textDraft}
                          onChange={(e) => setTextDraft(e.target.value)}
                          placeholder="Write a WhatsApp reply as Batteriq specialist…"
                          className="flex-1 h-11 px-4 rounded-xl border border-[#e7e5f6] bg-[#f8f8fd] text-sm text-[#0b1a3a] placeholder:text-slate-400 focus:border-[#6c5dd3] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={sending || !textDraft.trim()}
                          className="px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sending ? 'Sending…' : 'Reply'}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
