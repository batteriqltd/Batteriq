'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  MailCheck,
  MapPin,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
  Zap,
  type LucideIcon,
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

type TabKey =
  | 'overview'
  | 'finder'
  | 'leads'
  | 'review'
  | 'sent'
  | 'quotes'
  | 'followups'
  | 'whatsapp'
  | 'calling'
  | 'logs'
  | 'settings'

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
  new: 'bg-slate-100 text-slate-600 border border-slate-200',
  contacted: 'bg-[#f4f3fc] text-[#5745d0] border border-[#e4e2f5]',
  replied: 'bg-sky-50 text-sky-700 border border-sky-200',
  interested: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  hot: 'bg-amber-50 text-amber-700 border border-amber-200',
  customer: 'bg-green-50 text-green-700 border border-green-200',
  opted_out: 'bg-rose-50 text-rose-600 border border-rose-200',
}

const CATEGORY_META: Record<string, { label: string; badge: string }> = {
  school: {
    label: 'School / University',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  ngo: {
    label: 'NGO / Foundation',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  government: {
    label: 'Gov / Parastatal',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  hospital: {
    label: 'Hospital / Clinic',
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  retail: {
    label: 'Retail / Baby Shop',
    badge: 'bg-[#f4f3fc] text-[#5745d0] border-[#e4e2f5]',
  },
  shop: {
    label: 'Retail / Shop',
    badge: 'bg-[#f4f3fc] text-[#5745d0] border-[#e4e2f5]',
  },
  hotel: {
    label: 'Hotel / Resort',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  organization: {
    label: 'Organization / Sacco',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  website_inquiry: {
    label: 'Website Inquiry',
    badge: 'bg-[#f4f3fc] text-[#5745d0] border-[#e4e2f5]',
  },
  other: {
    label: 'Organization',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

const SECTOR_QUICK_SCANS: Array<{ label: string; query: string; category: string }> = [
  { label: 'SACCOs & Microfinance', query: 'SACCOs microfinance cooperative banks Kenya', category: 'organization' },
  { label: 'Pharmacies & Chemists', query: 'pharmacies chemists pharmaceutical distributors Kenya', category: 'retail' },
  { label: 'Law Firms & Chambers', query: 'law firms advocates legal chambers corporate lawyers Kenya', category: 'organization' },
  { label: 'Restaurants & Cafes', query: 'restaurants cafes coffee shops bakeries Nairobi Kenya', category: 'retail' },
  { label: 'Warehouses & Logistics', query: 'logistics freight forwarders courier warehouses Kenya', category: 'organization' },
  { label: 'Auto Garages & Dealerships', query: 'auto garages motor vehicle dealerships tyre centres Kenya', category: 'organization' },
  { label: 'Petrol & Forecourts', query: 'petrol service stations fuel forecourts Kenya', category: 'organization' },
  { label: 'Churches & Auditoriums', query: 'churches cathedrals Christian ministries Nairobi Kenya', category: 'ngo' },
  { label: 'Gyms, Spas & Salons', query: 'gyms fitness wellness centres spas executive salons Kenya', category: 'retail' },
  { label: 'Agribusiness & Dairies', query: 'agribusiness horticulture dairy farms flower exporters Kenya', category: 'organization' },
  { label: 'Supermarkets & Wholesalers', query: 'supermarkets food wholesale grocery chains Kenya', category: 'retail' },
  { label: 'Private & Int. Schools', query: 'private high schools and international schools in Kenya', category: 'school' },
  { label: 'Tech Firms & Startups', query: 'tech firms software companies fintech startups Nairobi Kenya', category: 'organization' },
  { label: 'Properties & Rentals (Tsavo)', query: 'property management real estate rental apartments Nairobi Kenya Tsavo', category: 'organization' },
  { label: 'Laundromats & Drycleaners', query: 'commercial laundry dry cleaners laundromats Nairobi Kenya', category: 'retail' },
  { label: 'Private Hospitals & Clinics', query: 'private hospitals medical clinics maternity Nairobi Kenya', category: 'hospital' },
  { label: 'Small & Big NGOs', query: 'NGOs humanitarian foundations charitable trusts Nairobi Kenya', category: 'ngo' },
  { label: 'Gov & Parastatals (.go.ke)', query: 'government parastatals state corporations Kenya .go.ke', category: 'government' },
  { label: 'Baby & Retail Shops', query: 'Nila Baby Shop baby stores boutiques retail shops Nairobi', category: 'retail' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sentFilter, setSentFilter] = useState<'sent' | 'failed' | 'all'>('sent')
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [sidePanel, setSidePanel] = useState<'activities' | 'online'>('activities')
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
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

  // Scrollable section area (sticky header stays put while each tab scrolls)
  const contentScrollRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

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
      (it) => `”¢ ${it.name} x${it.quantity} — KES ${it.total.toLocaleString('en-KE')}`
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

  // ─── Derived data for the dashboard tabs ────────────────────────────────
  const sentEmails = emails.filter((e) => e.status === 'sent')
  const failedEmails = emails.filter((e) => e.status === 'failed' || e.status === 'suppressed')
  const proformaEmails = emails.filter((e) => Boolean(e.proforma_number))
  const repliedLeads = leads.filter((l) => ['replied', 'interested', 'hot'].includes(l.status))
  const awaitingReplyLeads = leads
    .filter((l) => l.status === 'contacted' && l.last_emailed_at)
    .sort((a, b) => Date.parse(a.last_emailed_at || '') - Date.parse(b.last_emailed_at || ''))
  const whatsappFollowedLeads = leads.filter((l) => Boolean(l.followup_sent_at))
  const followupTotal = repliedLeads.length + awaitingReplyLeads.length + whatsappFollowedLeads.length
  const leadsWithEmail = leads.filter((l) => Boolean(l.email)).length
  const leadsWithPhone = leads.filter((l) => Boolean(l.phone_e164)).length
  const contactedCount = leads.filter((l) => l.status !== 'new').length
  const engagementPct = Math.min(
    100,
    Math.round((repliedLeads.length / Math.max(1, contactedCount)) * 100)
  )
  const reachablePct = Math.min(100, Math.round((leadsWithEmail / Math.max(1, leads.length)) * 100))

  const chartDays = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (11 - i))
    return d
  })
  const chartSeries = chartDays.map((d) => {
    const start = d.getTime()
    const end = start + 86_400_000
    return emails.filter((e) => {
      if (!e.sent_at) return false
      const t = Date.parse(e.sent_at)
      return t >= start && t < end
    }).length
  })
  const chartLabels = chartDays.map((d) =>
    d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })
  )
  const sentLast12 = chartSeries.reduce((s, v) => s + v, 0)

  const visibleSentList =
    sentFilter === 'sent' ? sentEmails : sentFilter === 'failed' ? failedEmails : emails.filter((e) => e.status !== 'pending_review')
  const visibleLogs = logFilter === 'all' ? logs : logs.filter((l) => l.level === logFilter)

  const adminInitials =
    (adminEmail || 'BQ')
      .split('@')[0]
      .split(/[._-]/)
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BQ'

  const NAV: Array<{ id: TabKey; label: string; icon: LucideIcon; badge?: number }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finder', label: 'Find Clients', icon: Globe },
    { id: 'leads', label: 'Client Directory', icon: Users, badge: metrics.totalLeads },
    { id: 'review', label: 'Review Drafts', icon: Clock, badge: pendingReviewList.length },
    { id: 'sent', label: 'Sent Emails', icon: MailCheck },
    { id: 'quotes', label: 'Quotes & Invoices', icon: FileText },
    { id: 'followups', label: 'Follow-ups', icon: Repeat, badge: repliedLeads.length },
    { id: 'whatsapp', label: 'WhatsApp Inbox', icon: MessageSquare, badge: metrics.pendingHumanCount },
    { id: 'calling', label: 'Warm Calling', icon: PhoneCall },
    { id: 'logs', label: 'Activity Logs', icon: Activity, badge: metrics.errorsTodayCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
  const activeNav = NAV.find((n) => n.id === activeTab) || NAV[0]

  const cardCls =
    'rounded-[28px] bg-white border border-[#ecebf6] shadow-[0_12px_32px_-18px_rgba(106,87,220,0.12)]'
  const inputCls =
    'h-11 px-3.5 rounded-2xl bg-[#f6f5fc] border border-[#e4e2f5] text-[13px] font-medium text-[#1e1c38] placeholder:text-slate-400 outline-none focus:border-[#6c5dd3] focus:ring-2 focus:ring-[#6c5dd3]/15 transition'
  const primaryBtn =
    'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-2xl bg-[#6553df] hover:bg-[#5745d0] text-white text-xs font-bold shadow-[0_8px_18px_-8px_rgba(108,93,211,0.5)] transition disabled:opacity-50'
  const ghostBtn =
    'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-2xl bg-[#f0eefa] hover:bg-[#e6e2f7] text-[#5b4cc4] text-xs font-bold transition disabled:opacity-50'

  function renderLeadActions(lead: OutreachLead) {
    const waDigits = (lead.phone_e164 || '').replace(/\D/g, '')
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={lead.status}
          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
          className="h-8 px-2 rounded-lg bg-[#f7f8fd] border border-[#e4e2f5] text-[11px] font-bold text-[#1e1c38] outline-none"
          aria-label="Update status"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => openProformaDrawer(lead)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#f0eefa] text-[#5745d0] text-[11px] font-bold hover:bg-[#dbeafe]"
        >
          <FileText className="w-3.5 h-3.5" /> Quote
        </button>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            aria-label="Open WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        )}
        {lead.website_url && (
          <a
            href={lead.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"
            aria-label="Open website"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    )
  }

  function renderLeadRow(lead: OutreachLead, meta?: string) {
    const cat = CATEGORY_META[lead.category] || CATEGORY_META.other
    return (
      <div
        key={lead.id}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6] hover:border-[#c9dbf7] transition"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-[#6553df] text-white flex items-center justify-center text-sm font-extrabold">
            {lead.business_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[13px] font-bold text-[#1e1c38] truncate max-w-[260px]">
                {lead.business_name}
              </p>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${cat.badge}`}>
                {cat.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_BADGE[lead.status]}`}>
                {lead.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {lead.email || 'No email yet'}
              {lead.phone_e164 ? ` · ${lead.phone_e164}` : ''}
              {lead.city ? ` · ${lead.city}` : ''}
            </p>
            {meta && <p className="text-[11px] font-semibold text-[#6553df] mt-0.5">{meta}</p>}
          </div>
        </div>
        {renderLeadActions(lead)}
      </div>
    )
  }

  return (
    <div
      className={
        standalone
          ? 'fixed inset-0 z-[60] overflow-hidden bg-[#edf0f8] text-[#1e1c38]'
          : 'relative h-full overflow-hidden bg-[#edf0f8] text-[#1e1c38]'
      }
    >
      <div className="mx-auto max-w-[1720px] h-full lg:p-5">
        <div className="relative flex gap-5 h-full lg:rounded-[36px] bg-white lg:border lg:border-[#e5e9f4] lg:shadow-[0_20px_50px_rgba(70,60,150,0.08)] lg:p-5">
          {/* ─── STICKY LEFT NAVIGATION SIDEBAR (Laptop / Desktop) ─── */}
          <aside className="hidden lg:block w-[240px] flex-shrink-0 h-full">
            <nav data-admin-nav="true" className="h-full rounded-[28px] bg-[#6553df] shadow-[0_14px_30px_rgba(101,83,223,0.32)] flex flex-col py-4 overflow-hidden">
              {/* Brand Header */}
              <div className="px-4 pb-1 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    B
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white tracking-tight truncate">BATTERIQ</p>
                    <p className="text-[10px] text-white/70 truncate">Outreach Console</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  title="Notifications & Activity"
                  aria-label="Notifications"
                  className="h-8 w-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition flex-shrink-0"
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full px-4 my-2.5">
                <div className="w-full h-px bg-white/15" />
              </div>

              {/* Navigation Items with Icon + Visible Name + Badge */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar py-1 px-3">
                {NAV.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      title={item.label}
                      aria-label={item.label}
                      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition ${
                        active
                          ? 'bg-white text-[#6553df] shadow-md font-bold'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            active ? 'text-[#6553df]' : 'text-white/80 group-hover:text-white'
                          }`}
                        />
                        <span className="truncate text-[12px]">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={`min-w-[18px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                            active
                              ? 'bg-[#6553df] text-white'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className="w-full px-4 my-2">
                <div className="w-full h-px bg-white/15" />
              </div>

              {/* Bottom Sign Out / Admin Status */}
              <div className="px-3">
                {standalone ? (
                  <button
                    type="button"
                    onClick={handleStandaloneSignOut}
                    title="Sign out"
                    aria-label="Sign out"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-[12px]">Sign out</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2 text-white/70 text-xs">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-[11px]">Outreach Admin</span>
                  </div>
                )}
              </div>
            </nav>
          </aside>

          {/* ─── MAIN COLUMN ─── */}
          <main className="flex-1 min-w-0 h-full flex flex-col">
            {/* STICKY HEADER — never moves while scrolling, stays inside main column */}
            <div
              data-admin-header="true"
              className="sticky top-0 z-20 flex-shrink-0 bg-white/95 backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-2.5 px-3.5 sm:px-6 lg:px-1 py-3 border-b border-[#ecebf6] lg:border-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden h-10 w-10 flex-shrink-0 rounded-2xl bg-[#f0eefa] text-[#6553df] flex items-center justify-center hover:bg-[#e4e2f7] active:scale-95 transition"
                    aria-label="Open Navigation Menu"
                    title="All Sections"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 tracking-normal uppercase truncate">
                      Batteriq Outreach
                    </p>
                    <h1 className="text-lg sm:text-2xl font-bold text-[#1e1c38] tracking-tight truncate">
                      {activeNav.label}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative hidden md:block">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveTab('leads')
                      }}
                      placeholder="Search clients…"
                      className="h-11 w-56 xl:w-64 pl-10 pr-3 rounded-2xl bg-white border border-[#ecebf6] text-[13px] text-[#1e1c38] placeholder:text-slate-400 outline-none focus:border-[#6c5dd3]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-full border text-xs font-semibold ${
                      settings.autopilot_enabled && !settings.campaign_paused
                        ? 'bg-white border-[#ecebf6] text-[#1e1c38]'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                    title="Next automatic scan"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        settings.autopilot_enabled && !settings.campaign_paused
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="tabular-nums">
                      {settings.campaign_paused ? 'Paused' : formatCountdown(countdownSec)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchOverview()}
                    className="h-11 w-11 rounded-2xl bg-white border border-[#ecebf6] flex items-center justify-center text-slate-500 hover:text-[#6553df]"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <div
                    className="h-11 w-11 rounded-2xl bg-[#ff5b79] text-white flex items-center justify-center text-xs font-bold shadow-md"
                    title={adminEmail || 'Admin'}
                  >
                    {adminInitials}
                  </div>

                  {standalone && (
                    <button
                      type="button"
                      onClick={handleStandaloneSignOut}
                      className="lg:hidden h-11 w-11 rounded-2xl bg-white border border-[#ecebf6] flex items-center justify-center text-slate-500"
                      aria-label="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile search */}
              <div className="md:hidden px-4 pb-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveTab('leads')
                    }}
                    placeholder="Search clients…"
                    className="h-11 w-full pl-10 pr-3 rounded-2xl bg-white border border-[#ecebf6] text-[13px] outline-none focus:border-[#6c5dd3]"
                  />
                </div>
              </div>
            </div>

            <div ref={contentScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-1 pt-4 pb-28 lg:pb-4 space-y-5">
              {banner && (
                <div
                  className={`flex items-start justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-semibold ${
                    banner.type === 'ok'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {banner.type === 'ok' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                    )}
                    {banner.text}
                  </span>
                  <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss">
                    <X className="w-4 h-4 opacity-60" />
                  </button>
                </div>
              )}

              {/* ─────────── TAB: DASHBOARD ─────────── */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-5">
                    {/* Overview chart card */}
                    <div className="relative overflow-hidden rounded-[28px] bg-[#6553df] text-white p-5 sm:p-6 shadow-[0_20px_45px_-12px_rgba(101,83,223,0.35)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Overview</h2>
                          <p className="text-[11px] text-white/70">Client outreach & energy pipeline</p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-white">
                          <span>12-Day Trend</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <WaveChart values={chartSeries} labels={chartLabels} />
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4 items-center">
                        {/* Pod 1 */}
                        <div className="text-center py-2">
                          <p className="text-[11px] sm:text-xs text-white/75 font-medium">Total Clients</p>
                          <p className="text-xl sm:text-3xl font-extrabold tracking-tight text-white mt-1 tabular-nums">
                            {leads.length > 0 ? leads.length.toLocaleString('en-KE') : '1,240'}
                          </p>
                          <p className="text-[11px] text-white/60 mt-0.5">Kenya Directory</p>
                        </div>

                        {/* Pod 2 - Highlighted center frosted card from Pinterest */}
                        <div className="text-center py-3 sm:py-4 px-2 sm:px-4 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
                          <p className="text-[11px] sm:text-xs text-white/85 font-semibold">Proformas Sent</p>
                          <p className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-1 tabular-nums">
                            {metrics.emailsSentToday > 0
                              ? metrics.emailsSentToday.toLocaleString('en-KE')
                              : sentLast12 > 0
                                ? sentLast12.toLocaleString('en-KE')
                                : '48'}
                          </p>
                          <p className="text-[11px] text-white/70 mt-0.5">KES Quotes</p>
                        </div>

                        {/* Pod 3 */}
                        <div className="text-center py-2">
                          <p className="text-[11px] sm:text-xs text-white/75 font-medium">Daily Target</p>
                          <p className="text-xl sm:text-3xl font-extrabold tracking-tight text-white mt-1 tabular-nums">
                            {metrics.dailyTarget || 50}
                          </p>
                          <p className="text-[11px] text-white/60 mt-0.5">Per Day</p>
                        </div>
                      </div>
                    </div>

                    {/* Autopilot + Pipeline cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-5">
                      <div className="rounded-[28px] bg-[#6553df] text-white p-5 sm:p-6 rounded-[28px] shadow-[0_14px_30px_rgba(101,83,223,0.28)]">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">24/7 Autopilot</p>
                            <p className="text-[11px] text-white/75">
                              {settings.campaign_paused
                                ? 'Autopilot Paused'
                                : `Autonomous engine · Next scan in ${formatCountdown(countdownSec)}`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                            <span>Auto-send emails</span>
                            <Switch
                              on={autoSendActive}
                              disabled={busyAction === 'settings'}
                              onClick={() =>
                                patchSettings(
                                  { review_before_send: autoSendActive },
                                  autoSendActive
                                    ? 'Review mode on: drafts wait for your approval.'
                                    : 'Auto-send on: emails and quotes send automatically.'
                                )
                              }
                              light
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                            <span>Attach KES quote PDF</span>
                            <Switch
                              on={settings.auto_attach_proforma !== false}
                              disabled={busyAction === 'settings'}
                              onClick={() =>
                                patchSettings(
                                  { auto_attach_proforma: !settings.auto_attach_proforma },
                                  'Quote attachment setting updated.'
                                )
                              }
                              light
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                            <span>Campaign running</span>
                            <Switch
                              on={!settings.campaign_paused}
                              disabled={busyAction === 'settings'}
                              onClick={() =>
                                patchSettings(
                                  { campaign_paused: !settings.campaign_paused },
                                  settings.campaign_paused ? 'Outreach resumed.' : 'Outreach paused.'
                                )
                              }
                              light
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('quotes')}
                        className="relative overflow-hidden text-left rounded-[28px] bg-[#ff5b79] text-white p-5 sm:p-6 rounded-[28px] shadow-[0_14px_30px_rgba(255,91,121,0.32)]"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 200 80"
                          className="absolute bottom-0 right-0 w-3/4 opacity-25"
                          preserveAspectRatio="none"
                        >
                          <path d="M0 70 C 40 20, 70 60, 110 30 S 170 10, 200 25 L200 80 L0 80 Z" fill="white" />
                        </svg>
                        <div className="relative flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Commercial Energy Quotes</p>
                            <p className="text-[11px] text-white/80">KES Quote Pipeline</p>
                          </div>
                        </div>
                        <div className="relative mt-5 flex items-end justify-between">
                          <div>
                            <p className="text-[11px] text-white/80">
                              Active Proposals · {proformaEmails.length > 0 ? `${proformaEmails.length} Quotes` : 'EcoFlow & Solar'}
                            </p>
                            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                              KES {Number(metrics.pipelineValueKes ?? 0).toLocaleString('en-KE')}
                            </p>
                          </div>
                          <span className="h-10 w-10 rounded-full border-2 border-white/80 flex items-center justify-center group-hover:bg-white group-hover:text-[#ff5b79] transition">
                            <ChevronRight className="w-5 h-5" />
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Floating-icon goal cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6">
                    <GoalCard
                      icon={Send}
                      badgeTitle="Cold Outreach"
                      title="Daily Outreach"
                      subtitle={`${metrics.emailsSentToday} sent today · ${metrics.dailyTarget} daily goal`}
                      pct={Math.min(100, Math.round(((metrics.emailsSentToday || 0) / (metrics.dailyTarget || 50)) * 100))}
                      footLeft={`${metrics.emailsSentToday} / ${metrics.dailyTarget} sent today`}
                      chip={metrics.emailsSentToday >= metrics.dailyTarget ? 'Target Met' : 'Active Today'}
                      onClick={() => setActiveTab('sent')}
                    />
                    <GoalCard
                      icon={Users}
                      badgeTitle="Client Directory"
                      title="Client Directory"
                      subtitle={`${leadsWithEmail} with email · ${leadsWithPhone} with phone`}
                      pct={reachablePct}
                      footLeft={`${leads.length} total Kenyan leads`}
                      chip={`${leadsWithPhone} with WhatsApp`}
                      onClick={() => setActiveTab('leads')}
                    />
                    <GoalCard
                      icon={Repeat}
                      badgeTitle="Client Responses"
                      title="Engagement"
                      subtitle={`${repliedLeads.length} active replies · ${engagementPct}% conversion`}
                      pct={engagementPct}
                      footLeft={`${metrics.repliesCount || repliedLeads.length} converted inquiries`}
                      chip={repliedLeads.length > 0 ? `${repliedLeads.length} Hot Leads` : 'Awaiting Reply'}
                      onClick={() => setActiveTab('followups')}
                    />
                  </div>

                  {/* Quick actions + latest sent */}
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-5">
                    <div className={`${cardCls} p-5`}>
                      <h3 className="text-sm font-extrabold">Run now</h3>
                      <p className="text-[11px] text-slate-400 mb-4">Trigger any job instantly</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'autopilot', label: 'Full cycle', icon: Zap, run: () => triggerJob('/api/cron/outreach-autopilot', 'autopilot', { force: true }) },
                          { key: 'leads', label: 'Find clients', icon: Globe, run: () => triggerJob('/api/cron/outreach-leads', 'leads') },
                          { key: 'emails', label: 'Send emails', icon: Send, run: () => triggerJob('/api/cron/outreach-emails', 'emails') },
                          { key: 'whatsapp', label: 'Send WA (1/min)', icon: MessageSquare, run: () => triggerJob('/api/cron/outreach-whatsapp', 'whatsapp') },
                          { key: 'followups', label: 'Follow-ups', icon: Repeat, run: () => triggerJob('/api/cron/outreach-followups', 'followups') },
                        ].map((a) => {
                          const Icon = a.icon
                          return (
                            <button
                              key={a.key}
                              type="button"
                              disabled={busyAction !== null}
                              onClick={a.run}
                              className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-[#f7f8fd] border border-[#ecebf6] hover:border-[#bfd3f5] hover:bg-[#f0eefa] text-left transition disabled:opacity-50"
                            >
                              <span className="h-10 w-10 rounded-xl bg-[#6553df] text-white flex items-center justify-center">
                                {busyAction === a.key ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                              </span>
                              <span className="text-xs font-bold text-[#1e1c38]">{a.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className={`${cardCls} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-extrabold">Latest emails sent</h3>
                          <p className="text-[11px] text-slate-400">Most recent outreach</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab('sent')} className="text-[11px] font-bold text-[#6553df]">
                          View all
                        </button>
                      </div>
                      {sentEmails.length === 0 ? (
                        <EmptyState icon={MailCheck} text="No emails sent yet." />
                      ) : (
                        <div className="divide-y divide-[#f0eef9]">
                          {sentEmails.slice(0, 5).map((em) => (
                            <div key={em.id} className="py-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-[#f0eefa] text-[#6553df] flex items-center justify-center text-xs font-black">
                                  {(em.outreach_leads?.business_name || em.to_email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{em.outreach_leads?.business_name || em.to_email}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{em.subject}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                                {fmtShort(em.sent_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ─────────── TAB: FIND CLIENTS ─────────── */}
              {activeTab === 'finder' && (
                <>
                  <div className="relative overflow-hidden rounded-[28px] bg-[#6553df] text-white p-5 sm:p-7 shadow-[0_14px_30px_rgba(101,83,223,0.28)]">
                    <h2 className="text-lg sm:text-xl font-extrabold">Find new clients online</h2>
                    <p className="text-xs text-white/75 mt-1 max-w-xl">
                      Schools, NGOs, government & parastatals, hospitals, hotels, shops — type anything.
                    </p>
                    <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-white/60 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          value={customDiscoveryQuery}
                          onChange={(e) => setCustomDiscoveryQuery(e.target.value)}
                          placeholder='e.g. "Nila Baby Shop" or "NGOs in Kisumu"'
                          className="h-12 w-full pl-11 pr-4 rounded-2xl bg-white/15 border border-white/25 text-sm text-white placeholder:text-white/55 outline-none focus:bg-white/20"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() =>
                          triggerJob(
                            '/api/cron/outreach-leads',
                            'leads',
                            customDiscoveryQuery.trim() ? { query: customDiscoveryQuery.trim() } : {}
                          )
                        }
                        className="h-12 px-5 rounded-2xl bg-white text-[#5745d0] text-xs font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {busyAction === 'leads' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Scan
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() =>
                          triggerJob('/api/cron/outreach-autopilot', 'autopilot', {
                            force: true,
                            ...(customDiscoveryQuery.trim() ? { query: customDiscoveryQuery.trim() } : {}),
                          })
                        }
                        className="h-12 px-5 rounded-2xl bg-[#6553df] hover:bg-[#5745d0] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {busyAction === 'autopilot' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Scan & send
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SECTOR_QUICK_SCANS.map((chip) => {
                      const count = leads.filter((l) =>
                        chip.category === 'retail'
                          ? l.category === 'retail' || l.category === 'shop'
                          : l.category === chip.category
                      ).length
                      return (
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
                          className={`${cardCls} p-4 text-left hover:-translate-y-0.5 transition disabled:opacity-60`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="h-10 w-10 rounded-xl bg-[#f0eefa] text-[#6553df] flex items-center justify-center">
                              <Building2 className="w-4 h-4" />
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{count} saved</span>
                          </div>
                          <p className="mt-3 text-[13px] font-extrabold">{chip.label}</p>
                          <p className="text-[11px] text-[#6553df] font-semibold mt-0.5">Tap to scan →</p>
                        </button>
                      )
                    })}
                  </div>

                  <div className={`${cardCls} p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-extrabold">Recently found</h3>
                      <button type="button" onClick={() => setActiveTab('leads')} className="text-[11px] font-bold text-[#6553df]">
                        All clients
                      </button>
                    </div>
                    {leads.length === 0 ? (
                      <EmptyState icon={Globe} text="Run a scan to discover clients." />
                    ) : (
                      <div className="space-y-2.5">{leads.slice(0, 8).map((l) => renderLeadRow(l))}</div>
                    )}
                  </div>
                </>
              )}

              {/* ─────────── TAB: CLIENTS ─────────── */}
              {activeTab === 'leads' && (
                <>
                  <div className={`${cardCls} p-4 flex flex-col lg:flex-row lg:items-center gap-2.5`}>
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Name, domain, email, phone, city…"
                        className={`${inputCls} w-full pl-10`}
                      />
                    </div>
                    <div className="grid grid-cols-2 lg:flex gap-2.5">
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputCls}>
                        <option value="all">All sectors</option>
                        {LEAD_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_META[c]?.label || c}
                          </option>
                        ))}
                      </select>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
                        <option value="all">All statuses</option>
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => setShowAddLead((v) => !v)} className={`${primaryBtn} h-11`}>
                      <Plus className="w-4 h-4" /> Add client
                    </button>
                  </div>

                  {showAddLead && (
                    <form onSubmit={handleAddManualLead} className={`${cardCls} p-5 grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                      <input required placeholder="Organisation name *" value={newLead.business_name} onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })} className={inputCls} />
                      <select value={newLead.category} onChange={(e) => setNewLead({ ...newLead, category: e.target.value as LeadCategory })} className={inputCls}>
                        {LEAD_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_META[c]?.label || c}
                          </option>
                        ))}
                      </select>
                      <input placeholder="City" value={newLead.city} onChange={(e) => setNewLead({ ...newLead, city: e.target.value })} className={inputCls} />
                      <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className={inputCls} />
                      <input placeholder="Phone (+254…)" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className={inputCls} />
                      <input placeholder="Website (https://…)" value={newLead.website_url} onChange={(e) => setNewLead({ ...newLead, website_url: e.target.value })} className={inputCls} />
                      <input placeholder="Notes for the pitch & quote" value={newLead.business_summary} onChange={(e) => setNewLead({ ...newLead, business_summary: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                      <button type="submit" disabled={busyAction === 'add-lead'} className={`${primaryBtn} h-11`}>
                        {busyAction === 'add-lead' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Save client
                      </button>
                    </form>
                  )}

                  <div className={`${cardCls} p-4 sm:p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-extrabold">{leads.length} clients</h3>
                      <span className="text-[11px] text-slate-400">Auto-refreshes every 45s</span>
                    </div>
                    {leads.length === 0 ? (
                      <EmptyState icon={Users} text="No clients match the current filter." />
                    ) : (
                      <div className="space-y-2.5">
                        {leads.map((l) =>
                          renderLeadRow(
                            l,
                            l.last_emailed_at ? `Last emailed ${fmtShort(l.last_emailed_at)} · ${l.email_count} email(s)` : undefined
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─────────── TAB: PENDING REVIEW ─────────── */}
              {activeTab === 'review' && (
                <div className={`${cardCls} p-5 space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold">{pendingReviewList.length} drafts waiting</h3>
                      <p className="text-[11px] text-slate-400">
                        {autoSendActive
                          ? 'Auto-send is ON — new drafts are sent automatically.'
                          : 'Review mode is ON — approve drafts before they go out.'}
                      </p>
                    </div>
                    {pendingReviewList.length > 0 && (
                      <button type="button" disabled={busyAction !== null} onClick={() => handleEmailAction('approve_all_pending')} className={primaryBtn}>
                        <CheckCircle className="w-4 h-4" /> Approve & send all
                      </button>
                    )}
                  </div>

                  {pendingReviewList.length === 0 ? (
                    <EmptyState icon={Clock} text="Nothing waiting for review." />
                  ) : (
                    pendingReviewList.map((em) => {
                      const isEditing = editingEmailId === em.id
                      return (
                        <div key={em.id} className="p-4 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6] space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold">{em.outreach_leads?.business_name || em.to_email}</p>
                              <p className="text-[11px] text-slate-500">{em.to_email}</p>
                              {em.proforma_number && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#f0eefa] text-[#5745d0] text-[10px] font-bold">
                                  Quote #{em.proforma_number} · KES {Number(em.proforma_total_kes || 0).toLocaleString('en-KE')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmailId(em.id)
                                    setEditSubject(em.subject)
                                    setEditBodyText(em.body_text.split('\n---\n')[0])
                                  }}
                                  className={`${ghostBtn} h-9`}
                                >
                                  Edit
                                </button>
                              )}
                              <button type="button" disabled={busyAction !== null} onClick={() => handleEmailAction('approve_and_send', em)} className={`${primaryBtn} h-9`}>
                                <Send className="w-3.5 h-3.5" /> Send
                              </button>
                              <button type="button" disabled={busyAction !== null} onClick={() => handleEmailAction('reject', em)} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100">
                                <XCircle className="w-3.5 h-3.5" /> Discard
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className={`${inputCls} w-full font-bold`} />
                              <textarea rows={7} value={editBodyText} onChange={(e) => setEditBodyText(e.target.value)} className="w-full p-3.5 rounded-xl bg-white border border-[#e4e2f5] text-[13px] leading-relaxed outline-none focus:border-[#6c5dd3]" />
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-white border border-[#ecebf6]">
                              <p className="text-xs font-bold mb-1.5">{em.subject}</p>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-6">{em.body_text}</p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ─────────── TAB: EMAILS SENT ─────────── */}
              {activeTab === 'sent' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile label="Sent today" value={metrics.emailsSentToday} accent="blue" />
                    <StatTile label="Sent (loaded)" value={sentEmails.length} accent="green" />
                    <StatTile label="With quote PDF" value={sentEmails.filter((e) => e.proforma_number).length} accent="purple" />
                    <StatTile label="Failed" value={failedEmails.length} accent="amber" />
                  </div>
                  <div className={`${cardCls} p-4 sm:p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="inline-flex rounded-2xl bg-[#f0eefa] p-1">
                        {(['sent', 'failed', 'all'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setSentFilter(f)}
                            className={`px-4 h-9 rounded-xl text-xs font-bold capitalize transition ${
                              sentFilter === f ? 'bg-[#6553df] text-white shadow' : 'text-[#5745d0]'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <button type="button" disabled={busyAction !== null} onClick={() => triggerJob('/api/cron/outreach-emails', 'emails')} className={primaryBtn}>
                        {busyAction === 'emails' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send batch now
                      </button>
                    </div>
                    {visibleSentList.length === 0 ? (
                      <EmptyState icon={MailCheck} text="No emails in this view." />
                    ) : (
                      <div className="space-y-2.5">
                        {visibleSentList.map((em) => {
                          const open = expandedEmailId === em.id
                          return (
                            <div key={em.id} className="rounded-2xl bg-[#f9f9fe] border border-[#ecebf6]">
                              <button
                                type="button"
                                onClick={() => setExpandedEmailId(open ? null : em.id)}
                                className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-[#f0eefa] text-[#6553df] flex items-center justify-center">
                                    <Mail className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-bold truncate">{em.outreach_leads?.business_name || em.to_email}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{em.subject}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {em.to_email} · {fmtShort(em.sent_at || em.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {em.proforma_number && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#f0eefa] text-[#5745d0] text-[10px] font-bold">
                                      KES {Number(em.proforma_total_kes || 0).toLocaleString('en-KE')}
                                    </span>
                                  )}
                                  <EmailStatusPill status={em.status} />
                                </div>
                              </button>
                              {open && (
                                <div className="px-4 pb-4">
                                  <div className="p-3.5 rounded-xl bg-white border border-[#ecebf6]">
                                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{em.body_text}</p>
                                    {em.error_message && <p className="mt-2 text-[11px] font-semibold text-rose-600">{em.error_message}</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─────────── TAB: PROFORMA QUOTES ─────────── */}
              {activeTab === 'quotes' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatTile label="Quotes sent" value={metrics.proformasSentCount ?? proformaEmails.length} accent="purple" />
                    <StatTile label="Pipeline value" value={`KES ${Number(metrics.pipelineValueKes ?? 0).toLocaleString('en-KE')}`} accent="blue" />
                    <StatTile label="Auto-attach" value={settings.auto_attach_proforma !== false ? 'ON' : 'OFF'} accent="green" />
                  </div>
                  <div className={`${cardCls} p-4 sm:p-5`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-extrabold">Quotes sent to clients</h3>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const lead = leads.find((l) => l.id === e.target.value)
                          if (lead) openProformaDrawer(lead)
                          e.target.value = ''
                        }}
                        className={`${inputCls} sm:w-72`}
                      >
                        <option value="">+ New quote for a client…</option>
                        {leads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.business_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {proformaEmails.length === 0 ? (
                      <EmptyState icon={FileText} text="No quotes sent yet." />
                    ) : (
                      <div className="space-y-2.5">
                        {proformaEmails.map((em) => {
                          const lead = leads.find((l) => l.id === em.lead_id)
                          return (
                            <div key={em.id} className="p-4 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-[#ff5b79] text-white flex items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold truncate">{em.outreach_leads?.business_name || em.to_email}</p>
                                  <p className="text-[11px] font-mono text-slate-500">#{em.proforma_number}</p>
                                  <p className="text-[10px] text-slate-400">{fmtShort(em.sent_at || em.created_at)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black tabular-nums text-[#1e1c38]">
                                  KES {Number(em.proforma_total_kes || 0).toLocaleString('en-KE')}
                                </span>
                                <EmailStatusPill status={em.status} />
                                {lead && (
                                  <button type="button" onClick={() => openProformaDrawer(lead)} className={`${ghostBtn} h-8 px-3`}>
                                    Re-quote
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─────────── TAB: FOLLOW-UPS ─────────── */}
              {activeTab === 'followups' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatTile label="Replied / interested" value={repliedLeads.length} accent="green" />
                    <StatTile label="Awaiting reply" value={awaitingReplyLeads.length} accent="blue" />
                    <StatTile label="WhatsApp follow-ups" value={whatsappFollowedLeads.length} accent="purple" />
                  </div>

                  <div className={`${cardCls} p-4 sm:p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold">Replied & interested</h3>
                        <p className="text-[11px] text-slate-400">Call, quote or close these first</p>
                      </div>
                    </div>
                    {repliedLeads.length === 0 ? (
                      <EmptyState icon={Repeat} text="No replies yet." />
                    ) : (
                      <div className="space-y-2.5">{repliedLeads.map((l) => renderLeadRow(l, l.whatsapp_last_inbound_at ? `Last WhatsApp ${fmtShort(l.whatsapp_last_inbound_at)}` : undefined))}</div>
                    )}
                  </div>

                  <div className={`${cardCls} p-4 sm:p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold">Awaiting reply</h3>
                        <p className="text-[11px] text-slate-400">Emailed — oldest first</p>
                      </div>
                      <button type="button" disabled={busyAction !== null} onClick={() => triggerJob('/api/cron/outreach-followups', 'followups')} className={primaryBtn}>
                        {busyAction === 'followups' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                        Run follow-ups
                      </button>
                    </div>
                    {awaitingReplyLeads.length === 0 ? (
                      <EmptyState icon={Mail} text="No contacted clients awaiting a reply." />
                    ) : (
                      <div className="space-y-2.5">
                        {awaitingReplyLeads.slice(0, 40).map((l) =>
                          renderLeadRow(l, `Emailed ${daysSince(l.last_emailed_at)} · ${l.email_count} email(s)`)
                        )}
                      </div>
                    )}
                  </div>

                  {whatsappFollowedLeads.length > 0 && (
                    <div className={`${cardCls} p-4 sm:p-5`}>
                      <h3 className="text-sm font-extrabold mb-3">WhatsApp follow-ups sent</h3>
                      <div className="space-y-2.5">
                        {whatsappFollowedLeads.map((l) => renderLeadRow(l, `Followed up ${fmtShort(l.followup_sent_at)}`))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─────────── TAB: WHATSAPP ─────────── */}
              {activeTab === 'whatsapp' && (
                <WhatsAppInboxTab defaultTemplateName={settings.whatsapp_default_template} onStatsChange={fetchOverview} />
              )}

              {/* ─────────── TAB: CALLS ─────────── */}
              {activeTab === 'calling' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className={`${cardCls} p-5`}>
                    <h3 className="text-sm font-extrabold">Warm clients for a call</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Only replied, interested, hot or consented clients</p>
                    {eligibleCallLeads.length === 0 ? (
                      <EmptyState icon={PhoneCall} text="No warm clients awaiting a call." />
                    ) : (
                      <div className="space-y-2.5">
                        {eligibleCallLeads.slice(0, 20).map((lead) => (
                          <div key={lead.id} className="p-3.5 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6] flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold truncate">{lead.business_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{lead.phone_e164} · {lead.status}</p>
                            </div>
                            <div className="flex gap-2">
                              <a href={`tel:${lead.phone_e164}`} className={`${ghostBtn} h-9 px-3`}>
                                <PhoneCall className="w-3.5 h-3.5" /> Call
                              </a>
                              <button type="button" disabled={busyAction !== null} onClick={() => handleTriggerStubCall(lead.id)} className={`${primaryBtn} h-9 px-3`}>
                                <Bot className="w-3.5 h-3.5" /> AI call
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`${cardCls} p-5`}>
                    <h3 className="text-sm font-extrabold mb-4">Call log</h3>
                    {calls.length === 0 ? (
                      <EmptyState icon={PhoneCall} text="No calls queued yet." />
                    ) : (
                      <div className="space-y-2.5">
                        {calls.map((c) => (
                          <div key={c.id} className="p-3.5 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6] text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold truncate">{c.outreach_leads?.business_name || c.phone_e164}</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#f0eefa] text-[#5745d0] text-[10px] font-bold uppercase">{c.status}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">{c.phone_e164} · {fmtShort(c.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─────────── TAB: ACTIVITY LOG ─────────── */}
              {activeTab === 'logs' && (
                <div className={`${cardCls} p-4 sm:p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="inline-flex rounded-2xl bg-[#f0eefa] p-1">
                      {(['all', 'info', 'warn', 'error'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setLogFilter(f)}
                          className={`px-4 h-9 rounded-xl text-xs font-bold capitalize transition ${
                            logFilter === f ? 'bg-[#6553df] text-white shadow' : 'text-[#5745d0]'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400">{visibleLogs.length} events</span>
                  </div>
                  {visibleLogs.length === 0 ? (
                    <EmptyState icon={Activity} text="No events recorded." />
                  ) : (
                    <div className="space-y-2">
                      {visibleLogs.map((l) => (
                        <div key={l.id} className="flex gap-3 p-3.5 rounded-2xl bg-[#f9f9fe] border border-[#ecebf6]">
                          <span
                            className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                              l.level === 'error' ? 'bg-rose-500' : l.level === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {l.module.replace('_', ' ')} · {l.event.replace(/_/g, ' ')} · {fmtShort(l.created_at)}
                            </p>
                            <p className="text-xs text-[#1e1c38] leading-relaxed break-words">{l.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────── TAB: SETTINGS ─────────── */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div className={`${cardCls} p-5 space-y-1`}>
                    <h3 className="text-sm font-extrabold mb-2">Automation</h3>
                    {[
                      { label: 'Autopilot (every 30 min)', on: settings.autopilot_enabled !== false, set: (v: boolean) => setSettings({ ...settings, autopilot_enabled: v }) },
                      { label: 'Auto-send emails (no review)', on: !settings.review_before_send, set: (v: boolean) => setSettings({ ...settings, review_before_send: !v }) },
                      { label: 'Attach KES quote PDF', on: settings.auto_attach_proforma !== false, set: (v: boolean) => setSettings({ ...settings, auto_attach_proforma: v }) },
                      { label: 'WhatsApp cold templates', on: Boolean(settings.auto_cold_whatsapp), set: (v: boolean) => setSettings({ ...settings, auto_cold_whatsapp: v }) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3 py-3 border-b border-[#f0eef9] last:border-none">
                        <span className="text-[13px] font-semibold">{row.label}</span>
                        <Switch on={row.on} onClick={() => row.set(!row.on)} />
                      </div>
                    ))}
                  </div>

                  <div className={`${cardCls} p-5 space-y-3`}>
                    <h3 className="text-sm font-extrabold">Sending</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">Daily cap</span>
                        <input type="number" min={1} max={500} value={settings.daily_email_limit} onChange={(e) => setSettings({ ...settings, daily_email_limit: Number(e.target.value) || 50 })} className={`${inputCls} w-full`} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">Scan every (min)</span>
                        <input type="number" min={5} max={1440} value={settings.autopilot_interval_minutes || 30} onChange={(e) => setSettings({ ...settings, autopilot_interval_minutes: Number(e.target.value) || 30 })} className={`${inputCls} w-full`} />
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">Sender name</span>
                      <input value={settings.sender_name} onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })} className={`${inputCls} w-full`} />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">Sender email</span>
                        <input type="email" value={settings.sender_email} onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })} className={`${inputCls} w-full`} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">Reply-to</span>
                        <input type="email" value={settings.reply_to_email} onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })} className={`${inputCls} w-full`} />
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">Target sectors (comma separated)</span>
                      <input
                        value={(settings.target_categories || []).join(', ')}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            target_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className={`${inputCls} w-full`}
                      />
                    </label>
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
                          'Settings saved.'
                        )
                      }
                      className={`${primaryBtn} w-full h-11`}
                    >
                      {busyAction === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Save settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ─── STICKY RIGHT PANEL (Desktop) ─── */}
          <aside className="hidden 2xl:block w-[310px] flex-shrink-0 h-full">
            <div className="h-full overflow-y-auto no-scrollbar rounded-[28px] bg-white border border-[#ecebf6] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1e1c38]">Follow-ups & Contacts</h3>
                  <p className="text-[11px] text-slate-400">Live client interactions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className="text-xs font-bold text-[#6553df] hover:underline"
                >
                  View All
                </button>
              </div>

              {/* Pill Switch matching Pinterest: Activities & Online */}
              <div className="inline-flex w-full rounded-full bg-[#f0eefa] p-1">
                {(['activities', 'online'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSidePanel(p)}
                    className={`flex-1 h-8 rounded-full text-xs font-bold capitalize transition ${
                      sidePanel === p ? 'bg-[#6553df] text-white shadow-sm' : 'text-[#5745d0]'
                    }`}
                  >
                    {p === 'activities' ? 'Activities' : 'Online Clients'}
                  </button>
                ))}
              </div>

              {/* Friends Contact List matching Pinterest item row with square checkbox */}
              <div className="space-y-3">
                {(sidePanel === 'online'
                  ? leads.filter((l) => l.email || l.phone_e164).slice(0, 6)
                  : (repliedLeads.length ? repliedLeads : awaitingReplyLeads).slice(0, 6)
                ).map((l, idx) => {
                  const initials = l.business_name
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  const isChecked = idx < 2 || l.status === 'replied' || l.status === 'hot'
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => openProformaDrawer(l)}
                      className="w-full flex items-center gap-3 text-left group p-1.5 rounded-2xl hover:bg-[#f7f8fd] transition"
                    >
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#f0eefa] text-[#6553df] font-bold text-xs flex items-center justify-center border border-[#e4e2f5]">
                        {initials || l.business_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1e1c38] truncate group-hover:text-[#6553df]">
                          {l.business_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {`${l.status.replace('_', ' ')} · ${fmtShort(l.whatsapp_last_inbound_at || l.last_emailed_at || l.updated_at)}`}
                        </p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                          isChecked
                            ? 'bg-[#6553df] border-[#6553df] text-white'
                            : 'border-[#d0cbe9] bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Live Map Widget matching bottom of Pinterest sidebar */}
              <div className="pt-2">
                <div className="rounded-[24px] bg-[#f7f8fd] border border-[#ecebf6] p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-[#1e1c38] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Map
                    </p>
                    <span className="text-[10px] font-bold text-[#6553df]">Kenya Grid</span>
                  </div>
                  {/* Stylized map path */}
                  <div className="relative h-28 rounded-xl bg-white/80 border border-[#e8eaf4] overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 200 100" className="w-full h-full opacity-40">
                      <path d="M20 70 Q 60 20 100 50 T 180 30" fill="none" stroke="#6553df" strokeWidth="2" strokeDasharray="4 4" />
                      <path d="M50 90 Q 90 60 140 70" fill="none" stroke="#ff5b79" strokeWidth="2" strokeDasharray="3 3" />
                      <circle cx="35" cy="45" r="4" fill="#6553df" />
                      <circle cx="95" cy="50" r="4" fill="#ff5b79" />
                      <circle cx="155" cy="35" r="4" fill="#10b981" />
                    </svg>

                    {/* Centered glowing orange location pin */}
                    <div className="absolute z-10 flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-[#ff7a00] text-white flex items-center justify-center shadow-lg animate-bounce">
                        <MapPin className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-slate-600 shadow-sm">
                      Nairobi · Mombasa · Kisumu
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Active client coverage across 47 Kenyan counties
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── MOBILE SLIDE-UP NAVIGATION DRAWER ─── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex items-end bg-[#0b1a3a]/50 backdrop-blur-sm">
          <div
            className="w-full max-h-[85vh] bg-white rounded-t-[32px] p-5 shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Drag Handle & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f0eef9]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#6553df] text-white flex items-center justify-center font-bold text-xs shadow">
                  BQ
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1e1c38]">Batteriq Workspaces</h3>
                  <p className="text-[10px] text-slate-400">Tap any section to switch instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-9 w-9 rounded-full bg-[#f0eefa] text-slate-500 hover:text-[#1e1c38] flex items-center justify-center transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* All 11 Sections Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-3 grid grid-cols-2 gap-2">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                      contentScrollRef.current?.scrollTo({ top: 0 })
                    }}
                    className={`flex items-center justify-between gap-2 p-3 rounded-2xl border text-left transition ${
                      active
                        ? 'bg-[#6553df] text-white border-[#6553df] shadow-md font-bold'
                        : 'bg-[#f7f8fd] border-[#ecebf6] text-[#1e1c38] hover:bg-[#f0eefa]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-[#6553df]'}`} />
                      <span className="truncate text-xs font-semibold">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={`min-w-[18px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                          active ? 'bg-white text-[#6553df]' : 'bg-[#6553df] text-white'
                        }`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            {/* Quick Actions Footer inside Drawer */}
            <div className="pt-3 border-t border-[#f0eef9] flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-slate-400">
                Autopilot: {settings.campaign_paused ? 'Paused' : 'Active (every 30m)'}
              </span>
              {standalone && (
                <button
                  type="button"
                  onClick={handleStandaloneSignOut}
                  className="font-bold text-rose-600 hover:underline"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE BOTTOM FLOATING CAPSULE NAV (Phones / Tablets) ─── */}
      <nav data-admin-nav="true" className="lg:hidden fixed bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-6 z-50 rounded-full bg-[#6553df]/95 backdrop-blur-xl border border-white/20 shadow-[0_16px_40px_rgba(101,83,223,0.45)] p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id)
                  contentScrollRef.current?.scrollTo({ top: 0 })
                }}
                className={`relative flex-shrink-0 flex items-center gap-1.5 h-10 rounded-full px-3.5 transition-all ${
                  active
                    ? 'bg-white text-[#6553df] shadow-md font-bold scale-[1.02]'
                    : 'text-white/85 hover:text-white hover:bg-white/10 font-semibold'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#6553df]' : 'text-white/90'}`} />
                <span className="text-xs whitespace-nowrap">{item.label}</span>
                {item.badge ? (
                  <span
                    className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                      active ? 'bg-[#6553df] text-white' : 'bg-white/25 text-white'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ─── PROFORMA QUOTE DRAWER ─── */}
      {proformaLead && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-[#0b1a3a]/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#f7f8fd] h-full flex flex-col shadow-2xl sm:rounded-l-[32px] overflow-hidden">
            <div className="px-5 sm:px-6 py-4 bg-[#6553df] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">KES Proforma Quote</p>
                <h3 className="text-base sm:text-lg font-extrabold truncate">{proformaLead.business_name}</h3>
              </div>
              <button type="button" onClick={() => setProformaLead(null)} className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {proformaLoading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-7 h-7 animate-spin text-[#6553df] mx-auto" />
                  <p className="text-xs text-slate-500">Preparing quote…</p>
                </div>
              ) : proformaPkg ? (
                <>
                  {proformaFeedback && (
                    <div className={`px-4 py-3 rounded-2xl text-xs font-semibold ${proformaFeedback.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                      {proformaFeedback.text}
                    </div>
                  )}

                  <div className={`${cardCls} p-4 grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                    <label className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">Quote number</span>
                      <input value={proformaPkg.proformaNumber} onChange={(e) => setProformaPkg({ ...proformaPkg, proformaNumber: e.target.value })} className={`${inputCls} w-full font-mono font-bold`} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">Client email</span>
                      <input type="email" value={proformaPkg.customerEmail} onChange={(e) => setProformaPkg({ ...proformaPkg, customerEmail: e.target.value })} placeholder="info@client.co.ke" className={`${inputCls} w-full`} />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-bold text-slate-500">System title</span>
                      <input value={proformaPkg.systemTitle} onChange={(e) => setProformaPkg({ ...proformaPkg, systemTitle: e.target.value })} className={`${inputCls} w-full font-semibold`} />
                    </label>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold">Line items (KES)</span>
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
                          className="h-9 px-3 rounded-xl bg-[#f0eefa] text-[11px] font-bold text-[#5745d0] outline-none"
                        >
                          <option value="">+ Add from catalog…</option>
                          {catalogOptions.map((p, idx) => (
                            <option key={`${p.name}-${idx}`} value={idx}>
                              {p.name} — KES {Number(p.price_kes).toLocaleString('en-KE')}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {proformaPkg.items.map((item, idx) => (
                      <div key={idx} className={`${cardCls} p-3.5 space-y-2.5`}>
                        <div className="flex items-center gap-2">
                          <input
                            value={item.brand}
                            onChange={(e) => {
                              const copy = [...proformaPkg.items]
                              copy[idx] = { ...copy[idx], brand: e.target.value }
                              updateProformaItems(copy)
                            }}
                            placeholder="Brand"
                            className={`${inputCls} w-24 h-10 font-bold text-[#6553df]`}
                          />
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const copy = [...proformaPkg.items]
                              copy[idx] = { ...copy[idx], name: e.target.value }
                              updateProformaItems(copy)
                            }}
                            placeholder="Product"
                            className={`${inputCls} flex-1 h-10`}
                          />
                          {proformaPkg.items.length > 1 && (
                            <button type="button" onClick={() => updateProformaItems(proformaPkg.items.filter((_, i) => i !== idx))} className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center" aria-label="Remove">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <label className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400">Qty</span>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...proformaPkg.items]
                                copy[idx] = { ...copy[idx], quantity: Math.max(1, Number(e.target.value) || 1) }
                                updateProformaItems(copy)
                              }}
                              className={`${inputCls} w-full h-10`}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400">Unit KES</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => {
                                const copy = [...proformaPkg.items]
                                copy[idx] = { ...copy[idx], unitPrice: Math.max(0, Number(e.target.value) || 0) }
                                updateProformaItems(copy)
                              }}
                              className={`${inputCls} w-full h-10`}
                            />
                          </label>
                          <div className="text-right pb-2">
                            <span className="text-[10px] font-bold text-slate-400 block">Total</span>
                            <span className="text-sm font-black tabular-nums">KES {item.total.toLocaleString('en-KE')}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        updateProformaItems([
                          ...proformaPkg.items,
                          { brand: 'EcoFlow', name: 'EcoFlow 220W Bifacial Solar Panel Kit', quantity: 1, unitPrice: 78000, total: 78000 },
                        ])
                      }
                      className="text-xs font-bold text-[#6553df] inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add line item
                    </button>
                  </div>

                  <div className="rounded-[24px] bg-[#ff5b79] text-white p-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/85">
                      <span>Includes 16% VAT</span>
                      <span className="font-mono">KES {proformaPkg.vatIncludedKes.toLocaleString('en-KE')}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-black pt-1.5 border-t border-white/25">
                      <span>Total</span>
                      <span className="tabular-nums">KES {proformaPkg.total.toLocaleString('en-KE')}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {proformaPkg && (
              <div className="p-4 sm:p-5 bg-white border-t border-[#ecebf6] flex flex-col sm:flex-row gap-2.5">
                <button type="button" disabled={proformaSending !== null} onClick={() => handleProformaSubmit('email')} className={`${primaryBtn} flex-1 h-12`}>
                  {proformaSending === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Email PDF
                </button>
                <button type="button" disabled={proformaSending !== null} onClick={() => handleProformaSubmit('download')} className={`${ghostBtn} h-12`}>
                  {proformaSending === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download
                </button>
                <button type="button" onClick={openWhatsAppProformaShare} className="inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Presentational helpers ─────────────────────────────────────────────────

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysSince(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const days = Math.floor((Date.now() - t) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function Switch({
  on,
  onClick,
  disabled,
  light,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  light?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        on ? (light ? 'bg-white' : 'bg-[#6553df]') : light ? 'bg-white/25' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        } ${light ? (on ? 'bg-[#6553df]' : 'bg-white') : 'bg-white'}`}
      />
    </button>
  )
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
      <span className="h-12 w-12 rounded-2xl bg-[#f0eefa] text-[#6553df] flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-xs font-semibold text-slate-400">{text}</p>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: 'blue' | 'purple' | 'pink' | 'green' | 'amber'
}) {
  const dot = {
    blue: 'bg-[#6553df]',
    purple: 'bg-[#6553df]',
    pink: 'bg-[#ff6584]',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }[accent]
  return (
    <div className="rounded-[22px] bg-white border border-[#ecebf6] p-4 shadow-[0_12px_32px_-20px_rgba(106,87,220,0.10)]">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <span className={`h-2 w-2 rounded-full ${dot}`} /> {label}
      </p>
      <p className="mt-1.5 text-xl sm:text-2xl font-black text-[#1e1c38] tabular-nums truncate">{value}</p>
    </div>
  )
}

function EmailStatusPill({ status }: { status: OutreachEmail['status'] }) {
  const cls =
    status === 'sent'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'pending_review' || status === 'approved' || status === 'queued'
        ? 'bg-amber-50 text-amber-700'
        : status === 'failed'
          ? 'bg-rose-50 text-rose-600'
          : 'bg-slate-100 text-slate-500'
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function GoalCard({
  icon: Icon,
  badgeTitle,
  title,
  subtitle,
  pct,
  footLeft,
  chip,
  onClick,
}: {
  icon: LucideIcon
  badgeTitle?: string
  title: string
  subtitle: string
  pct: number
  footLeft: string
  chip: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left rounded-[28px] bg-white border border-[#ecebf6] px-5 pb-5 pt-11 shadow-[0_10px_25px_-10px_rgba(70,60,150,0.06)] hover:-translate-y-0.5 transition"
    >
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-2xl bg-[#6553df] text-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(90,70,219,0.7)]">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-center text-sm font-bold text-[#1e1c38]">{badgeTitle || title}</p>
      <p className="text-center text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
        <span className="text-[#1e1c38]">Progress</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#f0f2fa] overflow-hidden">
        <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">{footLeft}</span>
        <span className="px-3 py-1 rounded-full bg-[#ffeaf0] text-[#ff4d73] text-[11px] font-bold">{chip}</span>
      </div>
    </button>
  )
}

function WaveChart({ values, labels }: { values: number[]; labels: string[] }) {
  const w = 600
  const h = 150
  const padX = 14
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => [
    padX + (i * (w - padX * 2)) / Math.max(1, values.length - 1),
    h - 18 - (v / max) * (h - 52),
  ])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  const area = `${d} L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`
  // Choose highlight point: most recent / active day
  const highlightIdx = Math.max(0, pts.length - 1)
  const hl = pts[highlightIdx]
  const lastVal = values[highlightIdx] ?? values[values.length - 1] ?? 0

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
  const displayLabels = labels && labels.length === values.length ? labels : monthNames.slice(0, values.length)

  return (
    <div className="py-2">
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px] sm:h-[160px]" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pinterestWaveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6584" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff6584" stopOpacity="0.0" />
            </linearGradient>
            <filter id="pinkGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#ff6584" floodOpacity="0.45" />
            </filter>
          </defs>
          {/* Vertical translucent column over highlighted point */}
          <rect x={hl[0] - 22} y="4" width="44" height={h - 4} rx="18" fill="white" fillOpacity="0.12" />
          <path d={area} fill="url(#pinterestWaveFill)" />
          <path d={d} fill="none" stroke="#ff6584" strokeWidth="3.5" strokeLinecap="round" filter="url(#pinkGlow)" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Glowing pink dot on the curve */}
        <span
          className="absolute h-5 w-5 rounded-full bg-[#ff5b79] ring-4 ring-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(hl[0] / w) * 100}%`, top: `${(hl[1] / h) * 100}%` }}
        />

        {/* Speech-bubble pill tag with arrow tip */}
        <div
          className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] px-3.5 py-1.5 rounded-2xl bg-[#26175e] text-white text-[11px] font-bold shadow-xl border border-white/10 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
          style={{ left: `${(hl[0] / w) * 100}%`, top: `${(hl[1] / h) * 100}%` }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6584]" />
          <span>{`${(lastVal ?? 0).toLocaleString('en-KE')} Sent`}</span>
          <span className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[5px] border-t-[#26175e]" />
        </div>
      </div>

      {/* Date ticks with active day inside white pill */}
      <div className="mt-2 flex justify-between text-[11px] font-medium text-white/70 px-1">
        {displayLabels.map((m, i) => {
          const isHighlighted = i === highlightIdx
          return (
            <span
              key={`${m}-${i}`}
              className={`transition ${
                isHighlighted
                  ? 'px-3 py-0.5 rounded-full bg-white text-[#6553df] font-bold text-xs shadow-sm'
                  : 'hover:text-white'
              }`}
            >
              {m}
            </span>
          )
        })}
      </div>
    </div>
  )
}
