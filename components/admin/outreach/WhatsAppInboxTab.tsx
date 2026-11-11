'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  Bot,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Flame,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  AlertCircle,
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

// ── Chat-app palette (WhatsApp-style, defined here so it stays scoped) ──
const WA = {
  panel: '#ffffff',
  header: '#f0f2f5',
  chatBg: '#efeae2',
  outBubble: '#d9fdd3',
  inBubble: '#ffffff',
  text: '#111b21',
  muted: '#667781',
  green: '#00a884',
  greenDark: '#008069',
  chipActive: '#d9fdd3',
  readTick: '#53bdeb',
  divider: '#e9edef',
}

type Filter = 'all' | 'unread' | 'ai' | 'human' | 'hot'

function isWithin24Hours(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false
  const diffMs = Date.now() - new Date(lastInboundAt).getTime()
  return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000
}

function convName(c: OutreachConversation): string {
  return c.contact_name || c.outreach_leads?.business_name || c.phone_e164
}

function lastActivity(c: OutreachConversation): string | null {
  const a = c.last_inbound_at ? Date.parse(c.last_inbound_at) : 0
  const b = c.last_outbound_at ? Date.parse(c.last_outbound_at) : 0
  const t = Math.max(a, b)
  return t ? new Date(t).toISOString() : null
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "10:42" today, "Yesterday", weekday within a week, else "11/11/2026" */
function listTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Yesterday'
  if (now.getTime() - d.getTime() < 6 * 24 * 3600 * 1000) return d.toLocaleDateString('en-KE', { weekday: 'long' })
  return d.toLocaleDateString('en-GB')
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Today'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const AVATAR_COLORS = ['#25d366', '#53bdeb', '#ff7a59', '#a78bfa', '#f59e0b', '#06b6d4', '#ef4444', '#10b981', '#6366f1']
function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '#'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function Avatar({ name, size = 49 }: { name: string; size?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

/** Who sent an outbound message, shown like a quoted name inside the bubble. */
function senderLabel(m: OutreachMessage): { text: string; color: string } | null {
  if (m.direction === 'inbound') return null
  if (m.sender_type === 'ai') return { text: 'AI assistant', color: '#027eb5' }
  if (m.sender_type === 'human') return { text: 'You', color: '#c4302b' }
  if (m.template_name === 'cold_intro') return { text: 'Auto intro', color: '#008069' }
  if (m.template_name === 'proforma_pdf') return { text: 'Quotation', color: '#008069' }
  return { text: 'Template', color: '#008069' }
}

/** Splits "Attached: file.pdf" off a message so it can render as a document chip. */
function splitAttachment(body: string): { text: string; file: string | null } {
  const m = body.match(/\n*Attached:\s*(\S+\.pdf)\s*$/i)
  if (!m) return { text: body, file: null }
  return { text: body.slice(0, m.index).trimEnd(), file: m[1] }
}

function Ticks({ status }: { status: OutreachMessage['delivery_status'] }) {
  if (status === 'failed') return <AlertCircle className="w-3.5 h-3.5 text-red-500" aria-label="Failed" />
  if (status === 'queued') return <Clock className="w-3 h-3" style={{ color: WA.muted }} aria-label="Sending" />
  if (status === 'sent') return <Check className="w-3.5 h-3.5" style={{ color: WA.muted }} aria-label="Sent" />
  return (
    <CheckCheck
      className="w-4 h-4"
      style={{ color: status === 'read' ? WA.readTick : WA.muted }}
      aria-label={status === 'read' ? 'Read' : 'Delivered'}
    />
  )
}

// Subtle, original background texture for the chat area (dots + soft diagonal)
const CHAT_BG_STYLE: React.CSSProperties = {
  backgroundColor: WA.chatBg,
  backgroundImage:
    'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px)',
  backgroundSize: '22px 22px, 22px 22px',
  backgroundPosition: '0 0, 11px 11px',
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
  const [templateName, setTemplateName] = useState(defaultTemplateName || APPROVED_TEMPLATES[0].name)
  const [templateParam1, setTemplateParam1] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  // Self-hosted WhatsApp (WAHA): no Meta 24h/template rules, free-form replies only
  const [wahaMode, setWahaMode] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  useEffect(() => {
    fetch('/api/admin/outreach/whatsapp/waha/status?lite=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setWahaMode(Boolean(d?.configured)))
      .catch(() => {})
  }, [])

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
      const res = await fetch(`/api/admin/outreach/conversations/${convId}`, { cache: 'no-store' })
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
    lastCountRef.current = 0
    loadMessages(selectedId)
    // Keep the open thread live so replies appear on their own
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetch(`/api/admin/outreach/conversations/${selectedId}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setMessages((d.messages ?? []) as OutreachMessage[]))
          .catch(() => {})
      }
    }, 10_000)
    return () => clearInterval(timer)
  }, [selectedId, loadMessages])

  // Stick to the newest message when the thread opens or a message arrives
  useEffect(() => {
    if (messages.length !== lastCountRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
    lastCountRef.current = messages.length
  }, [messages])

  const activeConv = conversations.find((c) => c.id === selectedId) || null
  const windowOpen = activeConv ? wahaMode || isWithin24Hours(activeConv.last_inbound_at) : false
  const canMessageAtAll = activeConv
    ? activeConv.status !== 'opted_out' && (wahaMode || activeConv.opted_in || Boolean(activeConv.last_inbound_at))
    : false

  useEffect(() => {
    if (activeConv) {
      setTemplateParam1(activeConv.contact_name || activeConv.outreach_leads?.business_name || 'there')
      setUseTemplate(!wahaMode && !isWithin24Hours(activeConv.last_inbound_at))
    }
  }, [activeConv, wahaMode])

  const counts = useMemo(
    () => ({
      unread: conversations.filter((c) => c.unread_count > 0).length,
      ai: conversations.filter((c) => c.mode === 'ai').length,
      human: conversations.filter((c) => c.mode === 'human').length,
      hot: conversations.filter((c) => c.outreach_leads?.status === 'hot').length,
    }),
    [conversations]
  )

  const visibleConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations
      .filter((c) => {
        if (filter === 'unread' && !(c.unread_count > 0)) return false
        if (filter === 'ai' && c.mode !== 'ai') return false
        if (filter === 'human' && c.mode !== 'human') return false
        if (filter === 'hot' && c.outreach_leads?.status !== 'hot') return false
        if (!q) return true
        return (
          convName(c).toLowerCase().includes(q) ||
          (c.phone_e164 || '').includes(q.replace(/\s/g, '')) ||
          (c.last_message_preview || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (Date.parse(lastActivity(b) || '0') || 0) - (Date.parse(lastActivity(a) || '0') || 0))
  }, [conversations, filter, query])

  async function handleToggleMode(nextMode: 'ai' | 'human') {
    if (!activeConv || activeConv.mode === nextMode) return
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
          c.id === activeConv.id ? { ...c, mode: nextMode, status: nextMode === 'ai' ? 'open' : c.status } : c
        )
      )
      setFeedback({
        type: 'ok',
        text: nextMode === 'ai' ? 'AI is now replying in this chat.' : 'You are handling this chat. AI replies are paused.',
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
      body: JSON.stringify({ id: activeConv.lead_id, status: nextStatus, mark_human_contacted: true }),
    })
    if (res.ok) {
      await loadConversations()
      onStatsChange?.()
    }
  }

  async function handleSendProforma() {
    if (!activeConv) return
    setFeedback(null)
    setSending(true)
    try {
      const res = await fetch('/api/admin/outreach/whatsapp/waha/proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConv.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Could not send the quotation' })
      } else {
        setFeedback({
          type: 'ok',
          text: `Quotation #${data.proformaNumber} (KES ${Number(data.total || 0).toLocaleString('en-KE')}) sent${data.via === 'link' ? ' as a download link' : ' as a PDF'}.`,
        })
        await loadMessages(activeConv.id)
        await loadConversations()
        onStatsChange?.()
      }
    } finally {
      setSending(false)
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
        : { conversationId: activeConv.id, phoneE164: activeConv.phone_e164, type: 'text', text: textDraft.trim() }

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
        if (data.mode === 'human' && activeConv.mode !== 'human') {
          setFeedback({ type: 'ok', text: 'You took over this chat. AI replies are paused.' })
        }
        await loadMessages(activeConv.id)
        await loadConversations()
        onStatsChange?.()
      }
    } finally {
      setSending(false)
    }
  }

  const filters: Array<{ id: Filter; label: string; count?: number }> = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'ai', label: 'AI', count: counts.ai },
    { id: 'human', label: 'Human', count: counts.human },
    { id: 'hot', label: 'Hot', count: counts.hot },
  ]

  return (
    <div
      className="rounded-[20px] overflow-hidden border border-[#e5e8ed] shadow-[0_1px_2px_rgba(0,20,53,0.04),0_8px_24px_-16px_rgba(0,20,53,0.10)] bg-white"
      style={{ color: WA.text }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,400px)_1fr] h-[calc(100dvh-190px)] min-h-[540px]">
        {/* ─── Chat list ─── */}
        <aside
          className={`min-h-0 flex-col border-r ${mobileShowThread ? 'hidden lg:flex' : 'flex'}`}
          style={{ borderColor: WA.divider, background: WA.panel }}
        >
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-tight" style={{ color: WA.greenDark }}>
              Chats
            </h2>
            <button
              type="button"
              onClick={loadConversations}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] transition"
              style={{ color: WA.muted }}
              aria-label="Refresh chats"
              title="Refresh"
            >
              <RefreshCw className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: WA.muted }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, number or message"
                className="w-full h-10 pl-11 pr-4 rounded-full text-[14px] outline-none focus:ring-2 focus:ring-[#00a884]/30"
                style={{ background: WA.header, color: WA.text }}
              />
            </div>
          </div>

          <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className="h-8 px-3.5 rounded-full text-[14px] whitespace-nowrap border transition"
                  style={
                    active
                      ? { background: WA.chipActive, color: WA.greenDark, borderColor: WA.chipActive }
                      : { background: '#fff', color: WA.muted, borderColor: WA.divider }
                  }
                >
                  {f.label}
                  {f.count ? <span className="ml-1 text-[12px]">{f.count}</span> : null}
                </button>
              )
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loadingList ? (
              <div className="p-8 text-center text-sm" style={{ color: WA.muted }}>
                Loading chats…
              </div>
            ) : visibleConversations.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: '#c4cbd2' }} />
                <p className="text-sm font-semibold">{conversations.length === 0 ? 'No chats yet' : 'No chats match'}</p>
                <p className="text-xs mt-1" style={{ color: WA.muted }}>
                  {conversations.length === 0
                    ? 'Replies and messages you send appear here.'
                    : 'Try another filter or search.'}
                </p>
              </div>
            ) : (
              visibleConversations.map((conv) => {
                const selected = conv.id === selectedId
                const name = convName(conv)
                const hot = conv.outreach_leads?.status === 'hot'
                const unread = conv.unread_count > 0
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conv.id)
                      setMobileShowThread(true)
                      setFeedback(null)
                    }}
                    className={`w-full text-left flex items-center gap-3 pl-3 pr-4 transition ${
                      selected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                    }`}
                  >
                    <Avatar name={name} />
                    <div className="flex-1 min-w-0 py-3 border-b" style={{ borderColor: WA.divider }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[16px] truncate" style={{ color: WA.text }}>
                          {name}
                        </span>
                        <span
                          className="text-[12px] flex-shrink-0"
                          style={{ color: unread ? WA.green : WA.muted }}
                        >
                          {listTime(lastActivity(conv))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[14px] truncate flex items-center gap-1" style={{ color: WA.muted }}>
                          {conv.status === 'opted_out' ? (
                            <span className="text-red-500">Opted out</span>
                          ) : (
                            conv.last_message_preview || 'No messages yet'
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          {hot && <Flame className="w-3.5 h-3.5 text-orange-500" aria-label="Hot lead" />}
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={
                              conv.mode === 'ai'
                                ? { background: '#e7f3fb', color: '#027eb5' }
                                : { background: '#fdf0e6', color: '#b45309' }
                            }
                          >
                            {conv.mode === 'ai' ? 'AI' : 'You'}
                          </span>
                          {unread && (
                            <span
                              className="min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-semibold text-white flex items-center justify-center"
                              style={{ background: '#25d366' }}
                            >
                              {conv.unread_count}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ─── Conversation ─── */}
        <section className={`min-h-0 flex-col ${!mobileShowThread ? 'hidden lg:flex' : 'flex'}`} style={CHAT_BG_STYLE}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10" style={{ background: '#f8f9fa' }}>
              <div className="h-20 w-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#e7f8f2' }}>
                <MessageSquare className="w-9 h-9" style={{ color: WA.green }} />
              </div>
              <p className="text-[22px] font-light" style={{ color: '#41525d' }}>
                Batteriq WhatsApp
              </p>
              <p className="text-sm mt-2 max-w-sm" style={{ color: WA.muted }}>
                Pick a chat to read the conversation, reply, send a quotation, or switch between AI and you.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                className="h-[60px] flex-shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 border-l"
                style={{ background: WA.header, borderColor: WA.divider }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5"
                    style={{ color: '#54656f' }}
                    aria-label="Back to chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar name={convName(activeConv)} size={40} />
                  <div className="min-w-0">
                    <p className="text-[16px] truncate leading-tight">{convName(activeConv)}</p>
                    <p className="text-[13px] truncate leading-tight" style={{ color: WA.muted }}>
                      {activeConv.phone_e164}
                      {' · '}
                      {activeConv.status === 'opted_out'
                        ? 'opted out'
                        : activeConv.mode === 'ai'
                          ? 'AI is replying'
                          : 'you are replying'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {activeConv.lead_id && (
                    <select
                      value={activeConv.outreach_leads?.status || 'replied'}
                      onChange={(e) => handleLeadStatusChange(e.target.value as LeadStatus)}
                      className="hidden sm:block h-8 px-2.5 rounded-full text-[12px] font-medium outline-none border bg-white capitalize"
                      style={{ borderColor: WA.divider, color: '#41525d' }}
                      aria-label="Lead status"
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="inline-flex rounded-full p-0.5 bg-white border" style={{ borderColor: WA.divider }}>
                    <button
                      type="button"
                      onClick={() => handleToggleMode('ai')}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium transition"
                      style={activeConv.mode === 'ai' ? { background: '#027eb5', color: '#fff' } : { color: WA.muted }}
                      title="Let the AI reply"
                    >
                      <Bot className="w-3.5 h-3.5" /> <span className="hidden sm:inline">AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMode('human')}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium transition"
                      style={activeConv.mode === 'human' ? { background: WA.greenDark, color: '#fff' } : { color: WA.muted }}
                      title="Reply yourself"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Me</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-[6%] py-4">
                {activeConv.escalated_reason && activeConv.mode === 'human' && (
                  <div className="flex justify-center mb-3">
                    <span className="px-3 py-1.5 rounded-lg text-[12.5px] text-center shadow-sm" style={{ background: '#ffeecd', color: '#54656f' }}>
                      Handed to you: {activeConv.escalated_reason}
                    </span>
                  </div>
                )}

                {loadingThread && messages.length === 0 ? (
                  <p className="text-center text-xs py-8" style={{ color: WA.muted }}>
                    Loading messages…
                  </p>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center">
                    <span className="px-3 py-1.5 rounded-lg text-[12.5px] bg-white shadow-sm" style={{ color: WA.muted }}>
                      No messages in this chat yet
                    </span>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const inbound = m.direction === 'inbound'
                    const prev = messages[i - 1]
                    const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at))
                    const firstInGroup = newDay || !prev || prev.direction !== m.direction || prev.sender_type !== m.sender_type
                    const label = senderLabel(m)
                    const { text, file } = splitAttachment(m.body || '')
                    return (
                      <div key={m.id}>
                        {newDay && (
                          <div className="flex justify-center my-3">
                            <span
                              className="px-3 py-1 rounded-lg text-[12.5px] bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]"
                              style={{ color: '#54656f' }}
                            >
                              {dayLabel(m.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${inbound ? 'justify-start' : 'justify-end'} ${firstInGroup ? 'mt-2.5' : 'mt-0.5'}`}>
                          <div
                            className={`relative max-w-[88%] sm:max-w-[65%] rounded-lg px-2 pt-1.5 pb-1 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                              firstInGroup ? (inbound ? 'rounded-tl-none' : 'rounded-tr-none') : ''
                            }`}
                            style={{ background: inbound ? WA.inBubble : WA.outBubble }}
                          >
                            {firstInGroup && (
                              <span
                                aria-hidden
                                className="absolute top-0 w-2 h-3"
                                style={
                                  inbound
                                    ? { left: -8, background: WA.inBubble, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }
                                    : { right: -8, background: WA.outBubble, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }
                                }
                              />
                            )}
                            {label && firstInGroup && (
                              <p className="text-[12.5px] font-medium px-1 pb-0.5" style={{ color: label.color }}>
                                {label.text}
                              </p>
                            )}
                            {file && (
                              <div
                                                                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 mb-1"
                                style={{ background: inbound ? '#f5f6f6' : '#c7f0c2' }}
                                title={file}
                              >
                                <span className="h-9 w-7 rounded flex items-center justify-center bg-red-500 text-white text-[9px] font-bold">
                                  PDF
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[13.5px] truncate" style={{ color: WA.text }}>
                                    {file}
                                  </span>
                                  <span className="block text-[11.5px]" style={{ color: WA.muted }}>
                                    PDF document
                                  </span>
                                </span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px] px-1">
                              {text}
                              {/* spacer so the time never overlaps the last line */}
                              <span className="inline-block w-[70px]" aria-hidden />
                            </p>
                            <span
                              className="absolute right-2 bottom-1 flex items-center gap-1 text-[11px]"
                              style={{ color: WA.muted }}
                            >
                              {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                              {!inbound && <Ticks status={m.delivery_status} />}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Feedback toast */}
              {feedback && (
                <div className="flex justify-center px-4 pb-2 -mt-1">
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="px-3.5 py-1.5 rounded-lg text-[12.5px] shadow-sm"
                    style={
                      feedback.type === 'ok'
                        ? { background: '#ffffff', color: WA.greenDark }
                        : { background: '#fde8e8', color: '#b42318' }
                    }
                  >
                    {feedback.text}
                  </button>
                </div>
              )}

              {/* Composer */}
              <div className="flex-shrink-0 px-2 sm:px-4 py-2.5" style={{ background: WA.header }}>
                {!canMessageAtAll ? (
                  <div className="flex items-center justify-center gap-2 text-[13px] py-2" style={{ color: WA.muted }}>
                    <Ban className="w-4 h-4 flex-shrink-0" />
                    {activeConv.status === 'opted_out'
                      ? 'This contact opted out. You can no longer message them.'
                      : 'You can message this contact after they write to you first.'}
                  </div>
                ) : !windowOpen || useTemplate ? (
                  <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-lg bg-white text-[14px] outline-none"
                    >
                      {APPROVED_TEMPLATES.map((tpl) => (
                        <option key={tpl.name} value={tpl.name}>
                          {tpl.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={templateParam1}
                      onChange={(e) => setTemplateParam1(e.target.value)}
                      placeholder="Recipient name"
                      className="sm:w-48 h-11 px-4 rounded-lg bg-white text-[14px] outline-none"
                    />
                    <div className="flex gap-2">
                      {windowOpen && (
                        <button
                          type="button"
                          onClick={() => setUseTemplate(false)}
                          className="h-11 px-3 rounded-lg bg-white text-[13px]"
                          style={{ color: WA.greenDark }}
                        >
                          Free text
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={sending}
                        className="h-11 w-11 rounded-full flex items-center justify-center text-white disabled:opacity-50"
                        style={{ background: WA.green }}
                        aria-label="Send template"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                    {wahaMode ? (
                      <button
                        type="button"
                        onClick={handleSendProforma}
                        disabled={sending}
                        className="h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center hover:bg-black/5 disabled:opacity-50"
                        style={{ color: '#54656f' }}
                        aria-label="Send quotation PDF"
                        title="Send quotation PDF"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUseTemplate(true)}
                        className="h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center hover:bg-black/5"
                        style={{ color: '#54656f' }}
                        aria-label="Use an approved template"
                        title="Use an approved template"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      placeholder={activeConv.mode === 'ai' ? 'Type a message (this takes over from the AI)' : 'Type a message'}
                      className="flex-1 min-w-0 h-11 px-4 rounded-lg bg-white text-[15px] outline-none"
                      style={{ color: WA.text }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !textDraft.trim()}
                      className="h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center text-white transition disabled:opacity-40"
                      style={{ background: WA.green }}
                      aria-label="Send"
                    >
                      {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
