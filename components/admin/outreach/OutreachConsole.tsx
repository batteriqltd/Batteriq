'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Flame,
  Globe,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Pause,
  PhoneCall,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import type { CatalogProductSummary } from '@/lib/outreach/claude'
import type { OutreachProformaLineItem, OutreachProformaPackage } from '@/lib/outreach/proforma'
import {
  DEFAULT_OUTREACH_SETTINGS,
  LEAD_CATEGORIES,
  LEAD_STATUSES,
  type LeadCategory,
  type LeadStatus,
  type OutreachCallLog,
  type OutreachEmail,
  type OutreachLead,
  type OutreachLogEntry,
  type OutreachSettings,
} from '@/lib/outreach/types'
import { WhatsAppInboxTab } from './WhatsAppInboxTab'

type TabKey = 'overview' | 'leads' | 'emails' | 'whatsapp' | 'calling' | 'settings'

interface Metrics {
  emailsSentToday: number
  dailyTarget: number
  pendingReviewEmails: number
  totalLeads: number
  repliesCount: number
  hotLeadsCount: number
  optOutsCount: number
  errorsTodayCount: number
  pendingHumanCount: number
  proformasSentCount?: number
  pipelineValueKes?: number
}

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-slate-500/20 text-slate-200 border border-slate-400/25',
  contacted: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
  replied: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
  interested: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
  hot: 'bg-amber-500/20 text-amber-300 border border-amber-400/35',
  customer: 'bg-green-500/25 text-green-300 border border-green-400/35',
  opted_out: 'bg-red-500/20 text-red-300 border border-red-400/30',
}

const CATEGORY_META: Record<string, { label: string; badge: string }> = {
  school: {
    label: 'School / University',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  },
  ngo: {
    label: 'NGO / Foundation',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  },
  government: {
    label: 'Gov / Parastatal',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  },
  hospital: {
    label: 'Hospital / Clinic',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
  },
  retail: {
    label: 'Retail / Baby Shop',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-400/25',
  },
  shop: {
    label: 'Retail / Shop',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-400/25',
  },
  hotel: {
    label: 'Hotel / Resort',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/25',
  },
  organization: {
    label: 'Organization / Sacco',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25',
  },
  website_inquiry: {
    label: 'Website Inquiry',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
  },
  other: {
    label: 'Organization',
    badge: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
  },
}

const SECTOR_QUICK_SCANS: Array<{ label: string; query: string; category: string }> = [
  { label: 'Schools & Universities', query: 'schools colleges and universities in Nairobi Kenya', category: 'school' },
  { label: 'NGOs & Foundations', query: 'NGOs foundations and humanitarian organizations in Kenya', category: 'ngo' },
  { label: 'Gov & Parastatals (.go.ke)', query: 'government parastatals and state corporations in Kenya .go.ke', category: 'government' },
  { label: 'Baby & Retail Shops', query: 'Nila Baby Shop baby stores boutiques and retail shops in Nairobi', category: 'retail' },
  { label: 'Hospitals & Clinics', query: 'hospitals medical clinics and pharmacies in Kenya', category: 'hospital' },
  { label: 'Hotels & Lodges', query: 'hotels resorts and conference lodges in Kenya', category: 'hotel' },
]

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const m = String(Math.floor(safe / 60)).padStart(2, '0')
  const s = String(safe % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function OutreachConsole({ standalone = false }: { standalone?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [adminEmail, setAdminEmail] = useState('')
  const [settings, setSettings] = useState<OutreachSettings>(DEFAULT_OUTREACH_SETTINGS)
  const [metrics, setMetrics] = useState<Metrics>({
    emailsSentToday: 0,
    dailyTarget: 50,
    pendingReviewEmails: 0,
    totalLeads: 0,
    repliesCount: 0,
    hotLeadsCount: 0,
    optOutsCount: 0,
    errorsTodayCount: 0,
    pendingHumanCount: 0,
    proformasSentCount: 0,
    pipelineValueKes: 0,
  })
  const [leads, setLeads] = useState<OutreachLead[]>([])
  const [emails, setEmails] = useState<OutreachEmail[]>([])
  const [logs, setLogs] = useState<OutreachLogEntry[]>([])
  const [calls, setCalls] = useState<OutreachCallLog[]>([])

  // Lead filters & online discovery inputs
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [customDiscoveryQuery, setCustomDiscoveryQuery] = useState('')

  // Manual lead drawer/panel state
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({
    business_name: '',
    category: 'retail' as LeadCategory,
    city: 'Nairobi',
    email: '',
    phone: '',
    website_url: '',
    business_summary: '',
  })

  // Inline email draft editor
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBodyText, setEditBodyText] = useState('')

  // Proforma Quotation Slide-Over Drawer State
  const [proformaLead, setProformaLead] = useState<OutreachLead | null>(null)
  const [proformaLoading, setProformaLoading] = useState(false)
  const [proformaSending, setProformaSending] = useState<'email' | 'download' | null>(null)
  const [proformaPkg, setProformaPkg] = useState<OutreachProformaPackage | null>(null)
  const [catalogOptions, setCatalogOptions] = useState<CatalogProductSummary[]>([])
  const [proformaFeedback, setProformaFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Live 30-Minute Autopilot Countdown State
  const [countdownSec, setCountdownSec] = useState<number>(30 * 60)
  const autoTriggerGuardRef = useRef<number>(0)

  const fetchOverview = useCallback(async () => {
    try {
      const qs = new URLSearchParams()
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      if (categoryFilter !== 'all') qs.set('category', categoryFilter)
      if (searchQ.trim()) qs.set('q', searchQ.trim())

      const res = await fetch(`/api/admin/outreach/overview?${qs.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.admin?.email) setAdminEmail(data.admin.email)
      if (data.settings) setSettings(data.settings)
      if (data.metrics) setMetrics(data.metrics)
      setLeads(data.leads ?? [])
      setEmails(data.emails ?? [])
      setLogs(data.logs ?? [])
      setCalls(data.calls ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, searchQ])

  useEffect(() => {
    fetchOverview()
    const poll = setInterval(fetchOverview, 45_000)
    return () => clearInterval(poll)
  }, [fetchOverview])

  const triggerJob = useCallback(
    async (
      endpoint: string,
      actionKey: string,
      payload: Record<string, unknown> = {}
    ) => {
      setBusyAction(actionKey)
      setBanner(null)
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setBanner({ type: 'err', text: data.error || 'Operation failed' })
        } else {
          if (actionKey === 'autopilot') {
            const lf = data.leadFinder || {}
            const ec = data.emailCampaign || {}
            setBanner({
              type: 'ok',
              text: `30m Autopilot Cycle Complete: Scanned ${lf.placesFound ?? 0} Kenyan sites → ${lf.leadsSaved ?? 0} new leads saved · ${ec.sentNow ?? 0} cold outreach emails + KES proformas sent${ec.draftedForReview ? ` (${ec.draftedForReview} queued for review)` : ''}.`,
            })
          } else if (actionKey === 'leads') {
            setBanner({
              type: 'ok',
              text: `Online Multi-Sector Scan Complete: ${data.leadsSaved ?? 0} new Kenyan leads saved (${data.placesFound ?? 0} sites scanned, ${data.duplicatesSkipped ?? 0} duplicates skipped).`,
            })
          } else if (actionKey === 'emails') {
            setBanner({
              type: 'ok',
              text: data.paused
                ? 'Campaign is currently PAUSED. Resume it first to dispatch outreach.'
                : `Cold Outreach & Proforma Run Complete: ${data.sentNow ?? 0} sent, ${data.draftedForReview ?? 0} drafted (${(data.alreadySentToday ?? 0) + (data.sentNow ?? 0)}/${data.dailyLimit ?? 50} today).`,
            })
          } else if (actionKey === 'followups') {
            setBanner({
              type: 'ok',
              text: `WhatsApp Follow-up Check Complete: ${data.sentCount ?? 0} consented leads messaged.`,
            })
          }
          await fetchOverview()
        }
      } finally {
        setBusyAction(null)
      }
    },
    [fetchOverview]
  )

  // Live 30-Minute Autopilot Countdown Ticker
  useEffect(() => {
    const intervalMin = Math.max(5, settings.autopilot_interval_minutes || 30)
    const intervalMs = intervalMin * 60 * 1000

    function computeRemaining(): number {
      if (!settings.last_autopilot_at) {
        // Compute time until next :00 or :30 mark matching Supabase pg_cron (*/30 * * * *)
        const now = new Date()
        const mins = now.getMinutes()
        const secs = now.getSeconds()
        const minsToNextHalfHour = 30 - (mins % 30)
        return minsToNextHalfHour * 60 - secs
      }
      const lastMs = Date.parse(settings.last_autopilot_at)
      if (!Number.isFinite(lastMs)) return intervalMin * 60
      const nextMs = lastMs + intervalMs
      const diffSec = Math.round((nextMs - Date.now()) / 1000)
      if (diffSec <= 0) {
        // Wrap cleanly to next 30-min cadence
        const elapsed = Date.now() - lastMs
        const remMs = intervalMs - (elapsed % intervalMs)
        return Math.round(remMs / 1000)
      }
      return diffSec
    }

    setCountdownSec(computeRemaining())
    const timer = setInterval(() => {
      const rem = computeRemaining()
      setCountdownSec(rem)

      // Live browser boost: if Autopilot is enabled & countdown hits <= 1s, trigger cycle once
      if (
        rem <= 1 &&
        settings.autopilot_enabled &&
        !settings.campaign_paused &&
        Date.now() - autoTriggerGuardRef.current > 60_000
      ) {
        autoTriggerGuardRef.current = Date.now()
        triggerJob('/api/cron/outreach-autopilot', 'autopilot', {
          trigger: 'live_dashboard_30m_timer',
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [
    settings.last_autopilot_at,
    settings.autopilot_interval_minutes,
    settings.autopilot_enabled,
    settings.campaign_paused,
    triggerJob,
  ])

  async function patchSettings(partial: Partial<OutreachSettings>, label?: string) {
    setBusyAction('settings')
    setBanner(null)
    try {
      const res = await fetch('/api/admin/outreach/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner({ type: 'err', text: data.error || 'Failed to update settings' })
      } else {
        setSettings(data.settings)
        const autoSent = data.autoDispatchResult?.sentNow ?? 0
        const extraMsg =
          autoSent > 0
            ? ` Immediately dispatched ${autoSent} queued cold outreach email(s) + KES proforma(s)!`
            : ''
        setBanner({ type: 'ok', text: `${label || 'Configuration updated.'}${extraMsg}` })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function handleUpdateLeadStatus(leadId: string, status: LeadStatus) {
    const res = await fetch('/api/admin/outreach/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status }),
    })
    if (res.ok) {
      await fetchOverview()
    }
  }

  async function handleAddManualLead(e: React.FormEvent) {
    e.preventDefault()
    setBusyAction('add-lead')
    setBanner(null)
    try {
      const res = await fetch('/api/admin/outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner({ type: 'err', text: data.error || 'Could not save lead' })
      } else {
        setShowAddLead(false)
        setNewLead({
          business_name: '',
          category: 'retail',
          city: 'Nairobi',
          email: '',
          phone: '',
          website_url: '',
          business_summary: '',
        })
        setBanner({ type: 'ok', text: 'Client added to outreach directory.' })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function handleEmailAction(
    action: 'approve_and_send' | 'approve_all_pending' | 'reject',
    emailRow?: OutreachEmail
  ) {
    setBusyAction(`email-${emailRow?.id || 'bulk'}`)
    setBanner(null)
    try {
      const payload: Record<string, unknown> = { action }
      if (emailRow) {
        payload.emailId = emailRow.id
        if (editingEmailId === emailRow.id) {
          payload.subject = editSubject
          payload.bodyText = editBodyText
        }
      }
      const res = await fetch('/api/admin/outreach/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner({ type: 'err', text: data.error || 'Email action failed' })
      } else {
        setEditingEmailId(null)
        setBanner({
          type: 'ok',
          text:
            action === 'reject'
              ? 'Email draft discarded.'
              : action === 'approve_all_pending'
                ? `Approved & dispatched ${data.sentNow ?? 0} outreach emails via Resend.`
                : 'Email & KES Proforma approved and dispatched via Resend.',
        })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function handleTriggerStubCall(leadId: string) {
    setBusyAction(`call-${leadId}`)
    setBanner(null)
    try {
      const res = await fetch('/api/admin/outreach/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner({ type: 'err', text: data.error || 'Voice call blocked by compliance gate' })
      } else {
        setBanner({
          type: 'ok',
          text: `Africa's Talking Voice queued for ${data.callLog?.phone_e164} with mandatory AI disclosure.`,
        })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
  }

  // Open Proforma Quotation Drawer for any lead
  async function openProformaDrawer(lead: OutreachLead) {
    setProformaLead(lead)
    setProformaPkg(null)
    setProformaFeedback(null)
    setProformaLoading(true)
    try {
      const res = await fetch(`/api/admin/outreach/proforma?leadId=${encodeURIComponent(lead.id)}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProformaFeedback({ type: 'err', text: data.error || 'Could not load proforma' })
      } else {
        setProformaPkg(data.proforma)
        setCatalogOptions(data.catalogProducts ?? [])
      }
    } finally {
      setProformaLoading(false)
    }
  }

  function updateProformaItems(nextItems: OutreachProformaLineItem[]) {
    if (!proformaPkg) return
    const cleaned = nextItems.map((it) => {
      const quantity = Math.max(1, Math.round(Number(it.quantity) || 1))
      const unitPrice = Math.max(0, Math.round(Number(it.unitPrice) || 0))
      return {
        ...it,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      }
    })
    const total = cleaned.reduce((s, it) => s + it.total, 0)
    const vatIncludedKes = Math.round((total * 16) / 116)
    setProformaPkg({
      ...proformaPkg,
      items: cleaned,
      subtotal: total,
      vatIncludedKes,
      total,
    })
  }

  async function handleProformaSubmit(action: 'email' | 'download') {
    if (!proformaPkg) return
    setProformaSending(action)
    setProformaFeedback(null)
    try {
      const res = await fetch('/api/admin/outreach/proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          leadId: proformaLead?.id,
          ...proformaPkg,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProformaFeedback({ type: 'err', text: data.error || 'Proforma dispatch failed' })
      } else if (action === 'download' && data.pdfBase64) {
        const byteChars = atob(data.pdfBase64)
        const byteNumbers = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i)
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename || `Batteriq-Proforma-${proformaPkg.proformaNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setProformaFeedback({
          type: 'ok',
          text: `Downloaded ${data.filename}`,
        })
      } else {
        setProformaFeedback({
          type: 'ok',
          text: `Proforma #${proformaPkg.proformaNumber} (KES ${proformaPkg.total.toLocaleString('en-KE')}) emailed to ${proformaPkg.customerEmail} with A4 PDF attached!`,
        })
        await fetchOverview()
      }
    } finally {
      setProformaSending(null)
    }
  }

  function openWhatsAppProformaShare() {
    if (!proformaPkg) return
    const digits = (proformaPkg.customerPhone || '').replace(/\D/g, '')
    const lines = proformaPkg.items.map(
      (it) => `• ${it.name} x${it.quantity} — KES ${it.total.toLocaleString('en-KE')}`
    )
    const text = [
      `Hello ${proformaPkg.customerName} Team,`,
      `Here is your tailored *Batteriq Kenya Proforma Quotation (#${proformaPkg.proformaNumber})* for silent <20ms backup power:`,
      `*${proformaPkg.systemTitle}*`,
      ...lines,
      `*Total (Incl. 16% VAT & 24-Month Warranty): KES ${proformaPkg.total.toLocaleString('en-KE')}*`,
      `Official KRA eTIMS Tax Invoice & LPO accepted. Reply here to customize or confirm delivery! — Batteriq Solutions Ltd (https://batteriq.com)`,
    ].join('\n')

    const waUrl = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleStandaloneSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/outreach-admin/login'
  }

  const progressPct = Math.min(
    100,
    Math.round((metrics.emailsSentToday / Math.max(1, metrics.dailyTarget)) * 100)
  )

  const pendingReviewList = emails.filter((e) => e.status === 'pending_review')
  const eligibleCallLeads = leads.filter(
    (l) =>
      l.phone_e164 &&
      l.status !== 'opted_out' &&
      (['replied', 'interested', 'hot'].includes(l.status) ||
        (l.source === 'website_form' && l.whatsapp_opted_in))
  )

  const autoSendActive = !settings.review_before_send

  return (
    <div className="relative min-h-screen bg-[#060919] text-slate-100 selection:bg-blue-500/30 overflow-x-hidden">
      {/* Subtle 48px Architectural Grid & Radial Sapphire/Emerald Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-48 left-1/4 w-[650px] h-[420px] rounded-full blur-[150px] bg-blue-600/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-20 right-10 w-[420px] h-[320px] rounded-full blur-[150px] bg-emerald-500/10"
      />

      {/* Standalone Executive Top Bar */}
      {standalone && (
        <header className="sticky top-0 z-30 px-4 sm:px-8 py-3.5 bg-[#060919]/85 backdrop-blur-2xl border-b border-white/[0.08]">
          <div className="max-w-[1480px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/25 flex-shrink-0">
                B
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-sm tracking-tight leading-none truncate">
                    BATTERIQ<sup className="text-[9px] text-blue-400">™</sup> COMMAND
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-[10px] font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    30m Autopilot {settings.autopilot_enabled && !settings.campaign_paused ? 'Live' : 'Standby'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                  Autonomous Kenyan Multi-Sector Scraper · Cold Outreach &amp; KES Proforma Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              {adminEmail && (
                <span className="hidden md:inline-block text-xs font-semibold text-slate-300 bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-full">
                  {adminEmail}
                </span>
              )}
              <button
                onClick={handleStandaloneSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-red-500/20 border border-white/10 text-slate-200 hover:text-red-200 text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="relative z-10 p-3.5 sm:p-6 lg:p-8 max-w-[1480px] mx-auto space-y-5 sm:space-y-6">
        {/* AUTONOMOUS 30-MINUTE ENGINE & ONLINE MULTI-SECTOR SCANNER HERO */}
        <section className="relative rounded-3xl bg-gradient-to-br from-[#10162b]/95 via-[#0d1326]/95 to-[#0b1222]/95 backdrop-blur-2xl border border-white/[0.09] p-4 sm:p-6 lg:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.55)] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/70 to-emerald-400/50"
          />

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            {/* Left: Title + Live 30m Telemetry Clock */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  <Zap className="w-3 h-3 text-blue-400" />
                  Gemini 3.5 Flash · Multi-Sector Kenya
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    settings.autopilot_enabled && !settings.campaign_paused
                      ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      settings.autopilot_enabled && !settings.campaign_paused
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-amber-400'
                    }`}
                  />
                  Next 30m Scan in{' '}
                  <span className="font-mono text-xs text-white ml-0.5">
                    {formatCountdown(countdownSec)}
                  </span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-white tracking-tight leading-tight">
                Autonomous Client Discovery &amp; Proforma Command
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-400 max-w-2xl leading-relaxed">
                Continuously scans Kenyan schools, NGOs, government parastatals (
                <code className="text-blue-300">.go.ke</code>), hospitals, hotels, and retail stores
                like Nila Baby Shop every 30 minutes — dispatching tailored EcoFlow &amp; BLUETTI
                pitches with KES Proforma PDFs automatically.
              </p>
            </div>

            {/* Right: 1-Click Autonomous Power Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Auto-Send Toggle (Review Before Send OFF = Auto-Send ON) */}
              <button
                type="button"
                disabled={busyAction === 'settings'}
                onClick={() =>
                  patchSettings(
                    { review_before_send: autoSendActive },
                    autoSendActive
                      ? 'Review Mode ENABLED: Drafts will wait for your approval before sending.'
                      : 'Auto-Send ENABLED: Cold outreach emails & KES Proformas now send automatically every 30 minutes!'
                  )
                }
                className={`inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold border transition-all ${
                  autoSendActive
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/30'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{autoSendActive ? 'Auto-Send Cold Email: ON' : 'Review Mode: ON'}</span>
              </button>

              {/* Auto-Attach KES Proforma Toggle */}
              <button
                type="button"
                disabled={busyAction === 'settings'}
                onClick={() =>
                  patchSettings(
                    { auto_attach_proforma: !settings.auto_attach_proforma },
                    !settings.auto_attach_proforma
                      ? 'Auto-Attach KES Proforma PDF ENABLED for outreach emails.'
                      : 'Auto-Attach KES Proforma PDF turned OFF.'
                  )
                }
                className={`inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold border transition-all ${
                  settings.auto_attach_proforma !== false
                    ? 'bg-amber-500/15 border-amber-400/35 text-amber-200 hover:bg-amber-500/25'
                    : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>
                  KES Proforma PDF: {settings.auto_attach_proforma !== false ? 'AUTO' : 'MANUAL'}
                </span>
              </button>

              {/* Pause / Resume Master Switch */}
              <button
                type="button"
                disabled={busyAction === 'settings'}
                onClick={() =>
                  patchSettings(
                    { campaign_paused: !settings.campaign_paused },
                    settings.campaign_paused
                      ? 'Autonomous Outreach RESUMED.'
                      : 'Autonomous Outreach PAUSED.'
                  )
                }
                className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-extrabold border transition-all ${
                  settings.campaign_paused
                    ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                    : 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {settings.campaign_paused ? (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                )}
              </button>

              {/* Run Full 30-Min Autopilot Cycle Now */}
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() =>
                  triggerJob('/api/cron/outreach-autopilot', 'autopilot', {
                    force: true,
                    ...(customDiscoveryQuery.trim()
                      ? { query: customDiscoveryQuery.trim() }
                      : {}),
                  })
                }
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                {busyAction === 'autopilot' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Cycle…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Run Autopilot Now
                  </>
                )}
              </button>

              <button
                type="button"
                aria-label="Refresh telemetry"
                onClick={fetchOverview}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Instant Online Scraper Search Bar + Multi-Sector Quick-Scan Chips */}
          <div className="mt-5 pt-5 border-t border-white/[0.07] space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                triggerJob(
                  '/api/cron/outreach-leads',
                  'leads',
                  customDiscoveryQuery.trim() ? { query: customDiscoveryQuery.trim() } : {}
                )
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-blue-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customDiscoveryQuery}
                  onChange={(e) => setCustomDiscoveryQuery(e.target.value)}
                  placeholder="Scan online for any Kenyan client: e.g. Nila Baby Shop, Parastatals .go.ke, NGOs in Kisumu, Schools, Clinics…"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#070b18] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={busyAction !== null}
                className="h-11 px-5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
              >
                {busyAction === 'leads' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scraping Online…
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" /> Scan Online Now
                  </>
                )}
              </button>
            </form>

            {/* 1-Tap Sector Scan Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">
                1-Tap Scan:
              </span>
              {SECTOR_QUICK_SCANS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setCustomDiscoveryQuery(chip.query)
                    triggerJob('/api/cron/outreach-leads', 'leads', {
                      query: chip.query,
                      category: chip.category,
                    })
                  }}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-blue-500/20 border border-white/[0.08] hover:border-blue-400/35 text-[11px] font-semibold text-slate-300 hover:text-white transition-all whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Live Feedback Banner */}
        {banner && (
          <div
            className={`px-4 sm:px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 backdrop-blur-xl ${
              banner.type === 'ok'
                ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                : 'bg-red-500/15 text-red-200 border border-red-400/30'
            }`}
          >
            <span>{banner.text}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 EXECUTIVE TELEMETRY BENTO KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Discovered Kenyan Entities */}
          <div className="rounded-2xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Discovered Kenyan Clients
              </span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {metrics.totalLeads}
              </span>
              <span className="text-xs font-semibold text-emerald-400">All Sectors</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Schools · NGOs · Parastatals · Retail &amp; Baby Shops
            </p>
          </div>

          {/* Card 2: Cold Outreach & Proformas Sent */}
          <div className="rounded-2xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Outreach &amp; Proformas Today
              </span>
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {metrics.emailsSentToday}
              </span>
              <span className="text-xs font-bold text-slate-400">
                / {metrics.dailyTarget} daily cap
              </span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {metrics.proformasSentCount ?? 0} total PDF Proforma Invoices sent
            </p>
          </div>

          {/* Card 3: Replies & Hot Leads */}
          <div className="rounded-2xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Engaged &amp; Hot Leads
              </span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {metrics.repliesCount}
              </span>
              <span className="text-xs font-bold text-amber-300">
                {metrics.hotLeadsCount} Hot · {metrics.pendingHumanCount} Human Queue
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              AI WhatsApp &amp; Reply-To <code className="text-slate-300">{settings.reply_to_email}</code>
            </p>
          </div>

          {/* Card 4: Active KES Pipeline Valuation */}
          <div className="rounded-2xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Active KES Quote Pipeline
              </span>
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums tracking-tight">
              KES {(metrics.pipelineValueKes ?? 0).toLocaleString('en-KE')}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>EcoFlow &amp; BLUETTI B2B</span>
              <span className="text-emerald-400 font-semibold">
                {metrics.optOutsCount} DPA Opt-outs Guarded
              </span>
            </div>
          </div>
        </div>

        {/* RESPONSIVE NAVIGATION PILLS (Mobile horizontal scroll + Desktop bar) */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/[0.08]">
          {(
            [
              { id: 'overview', label: 'Command Overview', icon: Activity },
              { id: 'leads', label: `Clients & Proformas (${metrics.totalLeads})`, icon: Building2 },
              {
                id: 'emails',
                label: `Outreach & Quotes${
                  metrics.pendingReviewEmails > 0 ? ` (${metrics.pendingReviewEmails} Review)` : ''
                }`,
                icon: Mail,
              },
              {
                id: 'whatsapp',
                label: `WhatsApp AI${
                  metrics.pendingHumanCount > 0 ? ` (${metrics.pendingHumanCount})` : ''
                }`,
                icon: MessageSquare,
              },
              { id: 'calling', label: 'Voice AI (Phase 2)', icon: PhoneCall },
              { id: 'settings', label: 'Autopilot & Logs', icon: Settings },
            ] as const
          ).map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-extrabold whitespace-nowrap transition-all border-b-2 ${
                  active
                    ? 'bg-blue-500/15 text-white border-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* TAB 1: COMMAND OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Left 8 Cols: Pipelines + Latest Discovered Clients with 1-Click Proforma */}
            <div className="lg:col-span-8 space-y-5">
              {/* 3 Autonomous Engines Card */}
              <div className="rounded-3xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      Autonomous Multi-Channel Engines
                    </h2>
                    <p className="text-xs text-slate-400">
                      Synchronized on a 24/7 cloud 30-minute cycle, or trigger any stage instantly.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                    Schedule: Every 30 Minutes (*/30)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#090e1d] border border-white/[0.07] flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        1. Multi-Sector Scraper
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        Scrapes official Kenyan websites for Schools, NGOs, Parastatals (
                        <code>.go.ke</code>), Hospitals, Hotels &amp; Shops like Nila Baby Shop.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-leads', 'leads')}
                      className="mt-4 w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold disabled:opacity-50"
                    >
                      {busyAction === 'leads' ? 'Scanning Kenya…' : 'Scan New Clients'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#090e1d] border border-white/[0.07] flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                        2. Cold Email + Proforma
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        Gemini 3.5 Flash writes sector-specific pitches &amp; attaches itemized KES
                        EcoFlow/BLUETTI Proforma PDFs automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-emails', 'emails')}
                      className="mt-4 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold disabled:opacity-50"
                    >
                      {busyAction === 'emails'
                        ? 'Dispatching…'
                        : settings.review_before_send
                          ? 'Prepare Drafts & Quotes'
                          : 'Send Cold Emails + PDFs'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#090e1d] border border-white/[0.07] flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        3. WhatsApp Cold &amp; Follow-up
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        Dispatches Meta-approved WhatsApp templates &amp; handles instant AI
                        Takeover replies 24/7.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-followups', 'followups')}
                      className="mt-4 w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-extrabold disabled:opacity-50"
                    >
                      {busyAction === 'followups' ? 'Running…' : 'Run WhatsApp Check'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Latest Discovered Kenyan Clients (Quick Proforma Dispatch) */}
              <div className="rounded-3xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Latest Discovered Clients &amp; Instant Proforma Dispatch
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click &ldquo;Proforma Quote&rdquo; on any client to preview, customize, email
                      or download their tailored KES PDF invoice.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('leads')}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 whitespace-nowrap"
                  >
                    All clients ({metrics.totalLeads}) →
                  </button>
                </div>

                {leads.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    No clients discovered yet. Click &ldquo;Run Autopilot Now&rdquo; above to begin
                    scanning Kenyan sectors.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {leads.slice(0, 6).map((lead) => {
                      const cat = CATEGORY_META[lead.category] || CATEGORY_META.other
                      return (
                        <div
                          key={lead.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-white truncate">
                                {lead.business_name}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.badge}`}
                              >
                                {cat.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {lead.email || 'No email'} · {lead.phone_e164 || 'No phone'} ·{' '}
                              {lead.city || 'Kenya'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                STATUS_BADGE[lead.status]
                              }`}
                            >
                              {lead.status.replace('_', ' ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => openProformaDrawer(lead)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold transition-colors"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Proforma Quote
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Live Telemetry Feed & Recent Sent Emails */}
            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-3xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Telemetry Stream
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    Full logs →
                  </button>
                </div>

                {logs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    No operational events logged yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {logs.slice(0, 14).map((l) => (
                      <div
                        key={l.id}
                        className={`p-3 rounded-xl border text-xs ${
                          l.level === 'error'
                            ? 'bg-red-500/10 border-red-400/25 text-red-200'
                            : l.level === 'warn'
                              ? 'bg-amber-500/10 border-amber-400/25 text-amber-200'
                              : 'bg-[#090e1d] border-white/[0.06] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase opacity-70 mb-1">
                          <span>
                            {l.module} · {l.event}
                          </span>
                          <span>
                            {new Date(l.created_at).toLocaleTimeString('en-KE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="leading-snug font-medium break-words">{l.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENTS DIRECTORY & PROFORMA DISPATCH (Desktop Table + Mobile Cards) */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter & Add Client Bar */}
            <div className="rounded-2xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Filter by client name, domain, email, +254 phone, city…"
                    className="h-10 pl-9 pr-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-medium text-white placeholder:text-slate-500 w-full outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-bold text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="all">All Kenyan Sectors</option>
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#090e1d]">
                      {(CATEGORY_META[c]?.label || c).toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-bold text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-[#090e1d]">
                      {s.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAddLead((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Client Manually
              </button>
            </div>

            {showAddLead && (
              <form
                onSubmit={handleAddManualLead}
                className="rounded-2xl bg-[#10162b] border border-blue-400/30 p-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  required
                  placeholder="Client / Institution Name (e.g. Nila Baby Shop) *"
                  value={newLead.business_name}
                  onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <select
                  value={newLead.category}
                  onChange={(e) =>
                    setNewLead({ ...newLead, category: e.target.value as LeadCategory })
                  }
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-bold text-white"
                >
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#090e1d]">
                      {(CATEGORY_META[c]?.label || c).toUpperCase()}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="City (e.g. Nairobi)"
                  value={newLead.city}
                  onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <input
                  type="email"
                  placeholder="Official Email (e.g. info@nilababyshop.com)"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <input
                  placeholder="Official Phone (+254...)"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <input
                  placeholder="Website URL (https://...)"
                  value={newLead.website_url}
                  onChange={(e) => setNewLead({ ...newLead, website_url: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <input
                  placeholder="Short operational notes for AI pitch & proforma sizing"
                  value={newLead.business_summary}
                  onChange={(e) => setNewLead({ ...newLead, business_summary: e.target.value })}
                  className="sm:col-span-2 h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={busyAction === 'add-lead'}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider"
                >
                  Save Client
                </button>
              </form>
            )}

            {/* MOBILE EXECUTIVE CARDS (Phones < 768px) */}
            <div className="md:hidden space-y-3">
              {leads.length === 0 ? (
                <div className="rounded-2xl bg-[#10162b] border border-white/10 p-8 text-center text-xs text-slate-400">
                  No clients match the current filter.
                </div>
              ) : (
                leads.map((lead) => {
                  const cat = CATEGORY_META[lead.category] || CATEGORY_META.other
                  return (
                    <div
                      key={lead.id}
                      className="rounded-2xl bg-[#10162b]/95 border border-white/[0.08] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm text-white leading-snug">
                            {lead.business_name}
                          </p>
                          {lead.website_url && (
                            <a
                              href={lead.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-400 mt-0.5 truncate max-w-[230px]"
                            >
                              {lead.domain || lead.website_url}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${cat.badge}`}
                        >
                          {cat.label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1 bg-[#090e1d] p-3 rounded-xl border border-white/[0.05]">
                        <p className="truncate">
                          <span className="text-slate-500">Email:</span> {lead.email || '—'}
                        </p>
                        <p className="font-mono text-[11px]">
                          <span className="text-slate-500 font-sans">Phone:</span>{' '}
                          {lead.phone_e164 || '—'} · {lead.city || 'Kenya'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                          }
                          className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase outline-none ${
                            STATUS_BADGE[lead.status]
                          }`}
                        >
                          {LEAD_STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-[#090e1d] text-white">
                              {st.replace('_', ' ')}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => openProformaDrawer(lead)}
                          className="flex-1 h-9 px-3 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Send Proforma
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* DESKTOP & LAPTOP EXECUTIVE TABLE (>= 768px) */}
            <div className="hidden md:block rounded-3xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    <th className="py-4 px-5">Client / Organization</th>
                    <th className="py-4 px-4">Sector &amp; City</th>
                    <th className="py-4 px-4">Verified Contacts</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-5 text-right">Proforma &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No clients match the current filter.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const cat = CATEGORY_META[lead.category] || CATEGORY_META.other
                      return (
                        <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-5">
                            <p className="font-bold text-white text-[13px]">
                              {lead.business_name}
                            </p>
                            {lead.website_url && (
                              <a
                                href={lead.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 truncate max-w-[250px]"
                              >
                                {lead.domain || lead.website_url}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cat.badge}`}
                            >
                              {cat.label}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {lead.city || 'Kenya'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-200">{lead.email || '—'}</p>
                            <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {lead.phone_e164 || '—'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                              }
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer outline-none ${
                                STATUS_BADGE[lead.status]
                              }`}
                            >
                              {LEAD_STATUSES.map((st) => (
                                <option key={st} value={st} className="bg-[#090e1d] text-white">
                                  {st.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openProformaDrawer(lead)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold transition-colors"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Proforma Quote
                              </button>
                              {lead.status !== 'opted_out' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLeadStatus(lead.id, 'opted_out')}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                >
                                  Opt Out
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: OUTREACH EMAILS & SENT PROFORMA LOG */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            {pendingReviewList.length > 0 && (
              <div className="rounded-3xl bg-[#10162b]/95 border border-amber-400/35 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Review Queue ({pendingReviewList.length} Drafts Ready)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Turn &ldquo;Auto-Send Cold Email: ON&rdquo; at the top to send automatically,
                      or approve below.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleEmailAction('approve_all_pending')}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-50"
                  >
                    Approve &amp; Send All ({pendingReviewList.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingReviewList.map((em) => {
                    const isEditing = editingEmailId === em.id
                    return (
                      <div
                        key={em.id}
                        className="p-4 rounded-2xl bg-[#090e1d] border border-white/10 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-extrabold text-white">
                              To: {em.outreach_leads?.business_name || em.to_email} ({em.to_email})
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                From: {em.from_identity}
                              </span>
                              {em.proforma_number && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-200">
                                  PDF Proforma #{em.proforma_number} · KES{' '}
                                  {Number(em.proforma_total_kes || 0).toLocaleString('en-KE')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmailId(em.id)
                                  setEditSubject(em.subject)
                                  setEditBodyText(em.body_text.split('\n---\n')[0])
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleEmailAction('approve_and_send', em)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve &amp; Send
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleEmailAction('reject', em)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-400/25 text-xs font-bold"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Discard
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-white/10 text-xs font-bold bg-[#10162b] text-white"
                            />
                            <textarea
                              rows={6}
                              value={editBodyText}
                              onChange={(e) => setEditBodyText(e.target.value)}
                              className="w-full p-3 rounded-xl border border-white/10 text-xs bg-[#10162b] text-slate-200 leading-relaxed"
                            />
                          </div>
                        ) : (
                          <div className="bg-[#10162b] p-3.5 rounded-xl border border-white/[0.06]">
                            <p className="text-xs font-extrabold text-white mb-1.5">
                              Subject: {em.subject}
                            </p>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {em.body_text}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sent & Historical Outreach + Proforma Log */}
            <div className="rounded-3xl bg-[#10162b]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6">
              <h3 className="text-base font-extrabold text-white mb-4">
                Dispatched Cold Outreach &amp; Proforma History
              </h3>
              {emails.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No outreach emails logged yet.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {emails.map((em) => (
                    <div
                      key={em.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-[13px] font-bold text-white">
                            {em.subject}
                          </p>
                          {em.proforma_number && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-200">
                              #{em.proforma_number} · KES{' '}
                              {Number(em.proforma_total_kes || 0).toLocaleString('en-KE')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {em.outreach_leads?.business_name || 'Client'} · {em.to_email}
                          {em.sent_at
                            ? ` · Sent ${new Date(em.sent_at).toLocaleString('en-KE')}`
                            : ''}
                          {em.claude_model ? ` · ${em.claude_model}` : ''}
                        </p>
                        {em.error_message && (
                          <p className="text-[11px] text-red-400 font-medium mt-0.5">
                            {em.error_message}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase self-start sm:self-center flex-shrink-0 ${
                          em.status === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : em.status === 'pending_review'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                              : em.status === 'failed'
                                ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {em.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WHATSAPP INBOX & AI TAKEOVER */}
        {activeTab === 'whatsapp' && (
          <WhatsAppInboxTab
            defaultTemplateName={settings.whatsapp_default_template}
            onStatsChange={fetchOverview}
          />
        )}

        {/* TAB 5: CALLING (PHASE 2 — AFRICA'S TALKING VOICE) */}
        {activeTab === 'calling' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-[#10162b]/90 border border-white/[0.08] p-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5" /> Phase 2 · Africa&apos;s Talking Voice AI
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Warm Leads Eligible for AI Voice Follow-Up
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Voice calls are queued exclusively for engaged leads (`replied`, `interested`,
                `hot`) or consented inquiries, with upfront Batteriq AI assistant disclosure.
              </p>

              {eligibleCallLeads.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center bg-[#090e1d] rounded-2xl border border-white/[0.05]">
                  No warm leads currently awaiting voice follow-up.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {eligibleCallLeads.slice(0, 12).map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{lead.business_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {lead.phone_e164} · Status: {lead.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleTriggerStubCall(lead.id)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
                      >
                        Queue AI Call
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-[#10162b]/90 border border-white/[0.08] p-6 space-y-4">
              <h3 className="text-base font-extrabold text-white">Voice Call Audit Log</h3>
              {calls.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No voice calls queued yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {calls.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-[#090e1d] border border-white/[0.06] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white">
                          {c.outreach_leads?.business_name || c.phone_e164} ({c.phone_e164})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Eligibility: <strong>{c.eligibility_reason}</strong> ·{' '}
                        {new Date(c.created_at).toLocaleString('en-KE')}
                      </p>
                      <p className="text-[11px] text-slate-300 italic bg-[#10162b] p-2.5 rounded-xl border border-white/[0.05]">
                        &ldquo;{c.ai_disclosure_script}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AUTOPILOT CONFIGURATION & FULL OPERATIONAL LOGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-3xl bg-[#10162b]/90 border border-white/[0.08] p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-extrabold text-white">
                30-Minute Autopilot &amp; Proforma Settings
              </h3>

              {/* Boolean Toggles */}
              <div className="space-y-2.5 bg-[#090e1d] p-4 rounded-2xl border border-white/[0.06]">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">30-Minute Cloud Autopilot</p>
                    <p className="text-[11px] text-slate-400">
                      Automatically scan online &amp; outreach every 30 minutes
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autopilot_enabled !== false}
                    onChange={(e) =>
                      setSettings({ ...settings, autopilot_enabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-white/[0.05]">
                  <div>
                    <p className="text-xs font-bold text-white">
                      Auto-Send Cold Emails (When Review is OFF)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Dispatch emails immediately without waiting in review queue
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!settings.review_before_send}
                    onChange={(e) =>
                      setSettings({ ...settings, review_before_send: !e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-white/[0.05]">
                  <div>
                    <p className="text-xs font-bold text-white">
                      Auto-Attach Tailored KES Proforma PDF
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Include itemized EcoFlow/BLUETTI KES invoice PDF in outreach
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_attach_proforma !== false}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_attach_proforma: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-white/[0.05]">
                  <div>
                    <p className="text-xs font-bold text-white">
                      Automated WhatsApp Cold Template Mode
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Send approved Meta WhatsApp template when Cloud API is active
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.auto_cold_whatsapp)}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_cold_whatsapp: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Daily Outreach Cap
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={settings.daily_email_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, daily_email_limit: Number(e.target.value) || 50 })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Scan Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.autopilot_interval_minutes || 30}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autopilot_interval_minutes: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={settings.sender_name}
                  onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-medium text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Verified Sender Email
                  </label>
                  <input
                    type="email"
                    value={settings.sender_email}
                    onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-medium text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={settings.reply_to_email}
                    onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-medium text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Target Kenyan Sectors (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={(settings.target_categories || []).join(', ')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      target_categories: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#090e1d] border border-white/10 text-xs font-medium text-white"
                />
              </div>

              <button
                type="button"
                disabled={busyAction === 'settings'}
                onClick={() =>
                  patchSettings(
                    {
                      autopilot_enabled: settings.autopilot_enabled,
                      autopilot_interval_minutes: settings.autopilot_interval_minutes,
                      review_before_send: settings.review_before_send,
                      auto_attach_proforma: settings.auto_attach_proforma,
                      auto_cold_whatsapp: settings.auto_cold_whatsapp,
                      daily_email_limit: settings.daily_email_limit,
                      sender_name: settings.sender_name,
                      sender_email: settings.sender_email,
                      reply_to_email: settings.reply_to_email,
                      target_categories: settings.target_categories,
                      followup_days: settings.followup_days,
                      whatsapp_followup_template: settings.whatsapp_followup_template,
                      whatsapp_default_template: settings.whatsapp_default_template,
                    },
                    'Autopilot & Proforma settings saved.'
                  )
                }
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25"
              >
                Save Configuration
              </button>
            </div>

            <div className="lg:col-span-7 rounded-3xl bg-[#10162b]/90 border border-white/[0.08] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-white">
                  System, Autopilot &amp; Compliance Audit Logs
                </h3>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> Latest {logs.length} events
                </span>
              </div>
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 py-10 text-center">No logs recorded yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        l.level === 'error'
                          ? 'bg-red-500/10 border-red-400/25 text-red-200'
                          : l.level === 'warn'
                            ? 'bg-amber-500/10 border-amber-400/25 text-amber-200'
                            : 'bg-[#090e1d] border-white/[0.06] text-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase opacity-75 mb-1">
                        <span>
                          [{l.level}] {l.module} → {l.event}
                        </span>
                        <span>{new Date(l.created_at).toLocaleString('en-KE')}</span>
                      </div>
                      <p className="font-medium leading-relaxed break-words">{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OVER KES PROFORMA QUOTATION DRAWER (Responsive Mobile Full-Sheet + Desktop Drawer) */}
      {proformaLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#0b1022] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#10162b] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Batteriq KES Proforma Quotation Studio
                </p>
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {proformaLead.business_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProformaLead(null)}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {proformaLoading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Sizing sector-tailored EcoFlow &amp; BLUETTI backup solution…
                  </p>
                </div>
              ) : proformaPkg ? (
                <>
                  {proformaFeedback && (
                    <div
                      className={`px-4 py-3 rounded-xl text-xs font-bold ${
                        proformaFeedback.type === 'ok'
                          ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200'
                          : 'bg-red-500/15 border border-red-400/30 text-red-200'
                      }`}
                    >
                      {proformaFeedback.text}
                    </div>
                  )}

                  {/* Recipient & Package Header Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Proforma Number
                      </label>
                      <input
                        value={proformaPkg.proformaNumber}
                        onChange={(e) =>
                          setProformaPkg({ ...proformaPkg, proformaNumber: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#070b18] border border-white/10 text-xs font-mono font-bold text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Client Email (For PDF Delivery)
                      </label>
                      <input
                        type="email"
                        value={proformaPkg.customerEmail}
                        onChange={(e) =>
                          setProformaPkg({ ...proformaPkg, customerEmail: e.target.value })
                        }
                        placeholder="info@client.co.ke"
                        className="w-full h-10 px-3 rounded-xl bg-[#070b18] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Recommended System Title
                      </label>
                      <input
                        value={proformaPkg.systemTitle}
                        onChange={(e) =>
                          setProformaPkg({ ...proformaPkg, systemTitle: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#070b18] border border-white/10 text-xs font-bold text-white"
                      />
                    </div>
                  </div>

                  {/* Line Items Editor */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                        Itemized Batteriq Backup &amp; Solar Units (KES)
                      </span>
                      {catalogOptions.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const idx = Number(e.target.value)
                            if (!Number.isFinite(idx) || !catalogOptions[idx]) return
                            const picked = catalogOptions[idx]
                            updateProformaItems([
                              ...proformaPkg.items,
                              {
                                brand: picked.brand || 'EcoFlow',
                                name: picked.name,
                                quantity: 1,
                                unitPrice: Math.round(Number(picked.price_kes) || 0),
                                total: Math.round(Number(picked.price_kes) || 0),
                              },
                            ])
                            e.target.value = ''
                          }}
                          className="h-8 px-2.5 rounded-lg bg-blue-500/15 border border-blue-400/30 text-[11px] font-bold text-blue-200 outline-none"
                        >
                          <option value="">+ Add from Store Catalog…</option>
                          {catalogOptions.map((p, idx) => (
                            <option key={`${p.name}-${idx}`} value={idx} className="bg-[#090e1d]">
                              {p.name} — KES {Number(p.price_kes).toLocaleString('en-KE')}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {proformaPkg.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#10162b] border border-white/[0.08] space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            value={item.brand}
                            onChange={(e) => {
                              const copy = [...proformaPkg.items]
                              copy[idx] = { ...copy[idx], brand: e.target.value }
                              updateProformaItems(copy)
                            }}
                            placeholder="Brand"
                            className="w-24 h-9 px-2.5 rounded-lg bg-[#070b18] border border-white/10 text-xs font-bold text-blue-300"
                          />
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const copy = [...proformaPkg.items]
                              copy[idx] = { ...copy[idx], name: e.target.value }
                              updateProformaItems(copy)
                            }}
                            placeholder="Product model & capacity"
                            className="flex-1 h-9 px-2.5 rounded-lg bg-[#070b18] border border-white/10 text-xs font-semibold text-white"
                          />
                          {proformaPkg.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateProformaItems(proformaPkg.items.filter((_, i) => i !== idx))
                              }
                              className="p-2 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Qty</span>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...proformaPkg.items]
                                copy[idx] = {
                                  ...copy[idx],
                                  quantity: Math.max(1, Number(e.target.value) || 1),
                                }
                                updateProformaItems(copy)
                              }}
                              className="w-full h-9 px-2.5 rounded-lg bg-[#070b18] border border-white/10 text-xs font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Unit KES</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => {
                                const copy = [...proformaPkg.items]
                                copy[idx] = {
                                  ...copy[idx],
                                  unitPrice: Math.max(0, Number(e.target.value) || 0),
                                }
                                updateProformaItems(copy)
                              }}
                              className="w-full h-9 px-2.5 rounded-lg bg-[#070b18] border border-white/10 text-xs font-bold text-white"
                            />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Line Total</span>
                            <span className="text-xs font-black text-amber-300 tabular-nums">
                              KES {item.total.toLocaleString('en-KE')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        updateProformaItems([
                          ...proformaPkg.items,
                          {
                            brand: 'EcoFlow',
                            name: 'EcoFlow 220W Bifacial Solar Panel Kit',
                            quantity: 1,
                            unitPrice: 78000,
                            total: 78000,
                          },
                        ])
                      }
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Custom Line Item
                    </button>
                  </div>

                  {/* Totals & eTIMS VAT Summary Box */}
                  <div className="rounded-2xl bg-gradient-to-r from-[#10162b] to-[#131d38] border border-amber-400/25 p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Included 16% KRA eTIMS VAT Portion</span>
                      <span className="font-mono">
                        KES {proformaPkg.vatIncludedKes.toLocaleString('en-KE')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base font-black text-white pt-1 border-t border-white/10">
                      <span>Total Proforma (KES)</span>
                      <span className="text-amber-300 tabular-nums">
                        KES {proformaPkg.total.toLocaleString('en-KE')}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drawer Footer Actions */}
            {proformaPkg && (
              <div className="p-4 sm:p-5 bg-[#10162b] border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={proformaSending !== null}
                  onClick={() => handleProformaSubmit('email')}
                  className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {proformaSending === 'email' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Email PDF Proforma</span>
                </button>

                <button
                  type="button"
                  disabled={proformaSending !== null}
                  onClick={() => handleProformaSubmit('download')}
                  className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {proformaSending === 'download' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppProformaShare}
                  className="h-11 px-4 rounded-xl bg-blue-600/25 hover:bg-blue-600/35 border border-blue-400/30 text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
