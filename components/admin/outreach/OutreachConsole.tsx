'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bot,
  Mail,
  MessageSquare,
  Flame,
  ShieldOff,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  PhoneCall,
  Settings,
  Plus,
  Sparkles,
  Clock,
  LogOut,
} from 'lucide-react'
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

type TabKey = 'overview' | 'whatsapp' | 'leads' | 'emails' | 'calling' | 'settings'

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
}

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  replied: 'bg-indigo-100 text-indigo-700',
  interested: 'bg-emerald-100 text-emerald-700',
  hot: 'bg-orange-100 text-orange-800',
  customer: 'bg-green-100 text-green-800',
  opted_out: 'bg-red-100 text-red-700',
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
  })
  const [leads, setLeads] = useState<OutreachLead[]>([])
  const [emails, setEmails] = useState<OutreachEmail[]>([])
  const [logs, setLogs] = useState<OutreachLogEntry[]>([])
  const [calls, setCalls] = useState<OutreachCallLog[]>([])

  // Lead filters & discovery inputs
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [customDiscoveryQuery, setCustomDiscoveryQuery] = useState('')

  // Manual lead modal state
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({
    business_name: '',
    category: 'hotel' as LeadCategory,
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
  }, [fetchOverview])

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
        setBanner({ type: 'ok', text: label || 'Settings saved.' })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function triggerJob(
    endpoint: string,
    actionKey: string,
    payload: Record<string, unknown> = {}
  ) {
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
        setBanner({ type: 'err', text: data.error || 'Job failed' })
      } else {
        if (actionKey === 'leads') {
          setBanner({
            type: 'ok',
            text: `Lead Finder finished: ${data.leadsSaved ?? 0} new Kenyan business leads saved (${data.placesFound ?? 0} places scanned, ${data.duplicatesSkipped ?? 0} duplicates skipped).`,
          })
        } else if (actionKey === 'emails') {
          setBanner({
            type: 'ok',
            text: data.paused
              ? 'Campaign is currently PAUSED. Resume it first to send emails.'
              : `Email Campaign finished: ${data.sentNow ?? 0} sent, ${data.draftedForReview ?? 0} queued for review (${(data.alreadySentToday ?? 0) + (data.sentNow ?? 0)}/${data.dailyLimit ?? 50} today).`,
          })
        } else if (actionKey === 'followups') {
          setBanner({
            type: 'ok',
            text: `Follow-up check complete: ${data.sentCount ?? 0} consented website leads messaged via WhatsApp.`,
          })
        }
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
          category: 'hotel',
          city: 'Nairobi',
          email: '',
          phone: '',
          website_url: '',
          business_summary: '',
        })
        setBanner({ type: 'ok', text: 'Lead added.' })
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
              ? 'Email draft rejected.'
              : action === 'approve_all_pending'
                ? `Approved & sent ${data.sentNow ?? 0} pending outreach emails.`
                : 'Email approved and sent via Resend.',
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
        setBanner({ type: 'err', text: data.error || 'Voice call blocked by compliance rules' })
      } else {
        setBanner({
          type: 'ok',
          text: `Africa's Talking Voice (Phase 2 Stub) queued for ${data.callLog?.phone_e164} with mandatory AI disclosure.`,
        })
        await fetchOverview()
      }
    } finally {
      setBusyAction(null)
    }
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

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Standalone Top Header when accessed via /outreach-admin */}
      {standalone && (
        <header
          className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/10"
          style={{
            background: 'linear-gradient(135deg, #000033 0%, #00004d 55%, #0f1f7a 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-black text-[#00004d]">
              B
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tight leading-none">
                BATTERIQ<sup className="text-[9px] text-blue-300">™</sup> OUTREACH AGENT
              </p>
              <p className="text-[11px] text-blue-200/70 font-medium mt-0.5">
                Autonomous B2B Sales &amp; WhatsApp Console · Kenya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {adminEmail && (
              <span className="hidden sm:inline-block text-xs font-bold text-blue-100 bg-white/10 px-3 py-1.5 rounded-full">
                {adminEmail}
              </span>
            )}
            <button
              onClick={handleStandaloneSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </header>
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6">
        {/* Page Header + Campaign Quick Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600 mb-1.5">
              Claude AI · Google Places · Resend · WhatsApp Cloud API
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-blue-600" />
              Outreach Agent
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pause / Resume Toggle */}
            <button
              type="button"
              disabled={busyAction === 'settings'}
              onClick={() =>
                patchSettings(
                  { campaign_paused: !settings.campaign_paused },
                  settings.campaign_paused
                    ? 'Daily email campaign RESUMED.'
                    : 'Daily email campaign PAUSED.'
                )
              }
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                settings.campaign_paused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
              }`}
            >
              {settings.campaign_paused ? (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume Campaign
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Campaign
                </>
              )}
            </button>

            {/* Review Before Send Toggle */}
            <button
              type="button"
              disabled={busyAction === 'settings'}
              onClick={() =>
                patchSettings(
                  { review_before_send: !settings.review_before_send },
                  !settings.review_before_send
                    ? 'Review-before-send ENABLED: Claude will queue drafts for your approval.'
                    : 'Review-before-send DISABLED: Claude will send personalized emails automatically.'
                )
              }
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                settings.review_before_send
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Review Before Send: {settings.review_before_send ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
              banner.type === 'ok'
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{banner.text}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Today&apos;s Emails
              </span>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-gray-900">{metrics.emailsSentToday}</span>
              <span className="text-xs font-bold text-gray-400">/ {metrics.dailyTarget} target</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Replies &amp; Engaged
              </span>
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">{metrics.repliesCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {metrics.totalLeads} total leads discovered
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Hot Leads
              </span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-600">{metrics.hotLeadsCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {metrics.pendingHumanCount} awaiting human takeover
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Opt-Outs (DPA)
              </span>
              <ShieldOff className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">{metrics.optOutsCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">Permanently suppressed</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Errors Today
              </span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p
              className={`text-2xl font-black ${
                metrics.errorsTodayCount > 0 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {metrics.errorsTodayCount}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {settings.campaign_paused ? 'Status: Paused' : 'Status: Active'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {(
            [
              { id: 'overview', label: 'Overview & Jobs', icon: Sparkles },
              {
                id: 'whatsapp',
                label: `WhatsApp Inbox${metrics.pendingHumanCount > 0 ? ` (${metrics.pendingHumanCount})` : ''}`,
                icon: MessageSquare,
              },
              { id: 'leads', label: `Leads (${metrics.totalLeads})`, icon: Search },
              {
                id: 'emails',
                label: `Emails${metrics.pendingReviewEmails > 0 ? ` (${metrics.pendingReviewEmails} Review)` : ''}`,
                icon: Mail,
              },
              { id: 'calling', label: 'Voice Calling (Phase 2)', icon: PhoneCall },
              { id: 'settings', label: 'Logs & Settings', icon: Settings },
            ] as const
          ).map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  active
                    ? 'bg-[#00004d] text-white shadow-md shadow-blue-950/15'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW & MANUAL JOB RUNNERS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Action Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-base font-black text-gray-900 mb-1">
                  Autonomous Agent Pipelines
                </h2>
                <p className="text-xs text-gray-500 mb-5">
                  Scheduled daily via Vercel Cron, or trigger any pipeline immediately below.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-900">1. Kenyan Lead Finder</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Google Places + corporate website scraper (Hotels, Schools, Orgs, Shops). No
                        Facebook or personal numbers.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-leads', 'leads')}
                      className="mt-4 w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-50"
                    >
                      {busyAction === 'leads' ? 'Discovering Leads…' : 'Run Lead Finder Now'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-900">2. Claude Email Campaign</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Writes bespoke EcoFlow/BLUETTI pitches via Claude &amp; sends up to{' '}
                        {settings.daily_email_limit}/day via Resend.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-emails', 'emails')}
                      className="mt-4 w-full h-10 rounded-xl bg-[#00004d] hover:bg-blue-900 text-white text-xs font-black disabled:opacity-50"
                    >
                      {busyAction === 'emails'
                        ? 'Running Campaign…'
                        : settings.review_before_send
                          ? 'Generate Review Drafts'
                          : 'Run Email Campaign'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        3. {settings.followup_days}-Day Website Follow-ups
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Sends WhatsApp template follow-up ONLY to website inquiries who ticked
                        consent &amp; had no human contact.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => triggerJob('/api/cron/outreach-followups', 'followups')}
                      className="mt-4 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-50"
                    >
                      {busyAction === 'followups' ? 'Checking Follow-ups…' : 'Run Follow-ups Now'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Emails Snapshot */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-gray-900">Recent Outreach Emails</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('emails')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View all ({emails.length}) →
                  </button>
                </div>
                {emails.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">
                    No outreach emails generated yet. Run Lead Finder then Email Campaign above.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {emails.slice(0, 6).map((em) => (
                      <div key={em.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{em.subject}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {em.outreach_leads?.business_name || em.to_email} · {em.to_email}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                            em.status === 'sent'
                              ? 'bg-green-100 text-green-700'
                              : em.status === 'pending_review'
                                ? 'bg-amber-100 text-amber-800'
                                : em.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
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

            {/* Recent Activity & Error Logs */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900">Live Agent Logs</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Full logs →
                </button>
              </div>
              {logs.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No agent logs recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                  {logs.slice(0, 14).map((l) => (
                    <div
                      key={l.id}
                      className={`p-3 rounded-xl border text-xs ${
                        l.level === 'error'
                          ? 'bg-red-50/70 border-red-100 text-red-900'
                          : l.level === 'warn'
                            ? 'bg-amber-50/70 border-amber-100 text-amber-900'
                            : 'bg-gray-50 border-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-70 mb-1">
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
                      <p className="leading-snug font-medium">{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP INBOX & AI TAKEOVER */}
        {activeTab === 'whatsapp' && (
          <WhatsAppInboxTab
            defaultTemplateName={settings.whatsapp_default_template}
            onStatsChange={fetchOverview}
          />
        )}

        {/* TAB 3: LEADS DIRECTORY */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Targeted Discovery + Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search business, email, city…"
                    className="h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-xs font-medium w-full"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-gray-50"
                >
                  <option value="all">All Statuses</option>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-gray-50"
                >
                  <option value="all">All Categories</option>
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={customDiscoveryQuery}
                  onChange={(e) => setCustomDiscoveryQuery(e.target.value)}
                  placeholder="e.g. hotels in Naivasha, Kenya"
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium w-56"
                />
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    triggerJob(
                      '/api/cron/outreach-leads',
                      'leads',
                      customDiscoveryQuery.trim()
                        ? { query: customDiscoveryQuery.trim() }
                        : {}
                    )
                  }
                  className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-50"
                >
                  {busyAction === 'leads' ? 'Scanning…' : 'Discover Leads'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLead((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Lead
                </button>
              </div>
            </div>

            {showAddLead && (
              <form
                onSubmit={handleAddManualLead}
                className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  required
                  placeholder="Business Name *"
                  value={newLead.business_name}
                  onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <select
                  value={newLead.category}
                  onChange={(e) =>
                    setNewLead({ ...newLead, category: e.target.value as LeadCategory })
                  }
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold"
                >
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="City (e.g. Nairobi)"
                  value={newLead.city}
                  onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <input
                  type="email"
                  placeholder="Public Business Email (info@company.co.ke)"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <input
                  placeholder="Business Phone (+254...)"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <input
                  placeholder="Website URL (https://...)"
                  value={newLead.website_url}
                  onChange={(e) => setNewLead({ ...newLead, website_url: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <input
                  placeholder="Short business description for Claude personalization"
                  value={newLead.business_summary}
                  onChange={(e) => setNewLead({ ...newLead, business_summary: e.target.value })}
                  className="sm:col-span-2 h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={busyAction === 'add-lead'}
                  className="h-10 rounded-xl bg-blue-600 text-white text-xs font-black"
                >
                  Save Business Lead
                </button>
              </form>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-5">Business</th>
                    <th className="py-3.5 px-4">Category &amp; City</th>
                    <th className="py-3.5 px-4">Public Contacts</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No leads match the current filter.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/70">
                        <td className="py-3.5 px-5">
                          <p className="font-bold text-gray-900">{lead.business_name}</p>
                          {lead.website_url && (
                            <a
                              href={lead.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline truncate block max-w-[220px]"
                            >
                              {lead.domain || lead.website_url}
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold uppercase text-[10px] text-gray-700">
                            {lead.category}
                          </span>
                          <p className="text-[11px] text-gray-400">{lead.city || 'Kenya'}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800">{lead.email || '—'}</p>
                          <p className="font-mono text-[11px] text-gray-500">
                            {lead.phone_e164 || '—'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                            {lead.source}
                          </span>
                          {lead.whatsapp_opted_in && (
                            <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              WA Consent
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border-0 cursor-pointer ${
                              STATUS_BADGE[lead.status]
                            }`}
                          >
                            {LEAD_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {lead.status !== 'opted_out' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateLeadStatus(lead.id, 'opted_out')}
                              className="text-[11px] font-bold text-red-600 hover:underline"
                            >
                              Opt Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EMAIL REVIEW QUEUE & SENT LOG */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            {pendingReviewList.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      Review Queue ({pendingReviewList.length} Drafts Awaiting Approval)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Inspect or edit Claude&apos;s personalized emails before sending through
                      Resend.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleEmailAction('approve_all_pending')}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-50"
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
                        className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-black text-gray-900">
                              To: {em.outreach_leads?.business_name || em.to_email} ({em.to_email})
                            </p>
                            <p className="text-[11px] text-gray-500">From: {em.from_identity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmailId(em.id)
                                  setEditSubject(em.subject)
                                  setEditBodyText(em.body_text.split('\n---\n')[0])
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700"
                              >
                                Edit Draft
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleEmailAction('approve_and_send', em)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve &amp; Send
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleEmailAction('reject', em)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold bg-white"
                            />
                            <textarea
                              rows={6}
                              value={editBodyText}
                              onChange={(e) => setEditBodyText(e.target.value)}
                              className="w-full p-3 rounded-xl border border-gray-200 text-xs bg-white leading-relaxed"
                            />
                          </div>
                        ) : (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                            <p className="text-xs font-black text-gray-900 mb-1.5">
                              Subject: {em.subject}
                            </p>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
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

            {/* Sent / Historical Email Log */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-base font-black text-gray-900 mb-4">Outreach Email History</h3>
              {emails.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No emails logged yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {emails.map((em) => (
                    <div
                      key={em.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900">{em.subject}</p>
                        <p className="text-[11px] text-gray-500">
                          {em.outreach_leads?.business_name || 'Business'} · {em.to_email}
                          {em.sent_at
                            ? ` · Sent ${new Date(em.sent_at).toLocaleString('en-KE')}`
                            : ''}
                        </p>
                        {em.error_message && (
                          <p className="text-[11px] text-red-600 font-medium mt-0.5">
                            {em.error_message}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase self-start sm:self-center ${
                          em.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : em.status === 'pending_review'
                              ? 'bg-amber-100 text-amber-800'
                              : em.status === 'suppressed'
                                ? 'bg-gray-200 text-gray-700'
                                : em.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
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

        {/* TAB 5: CALLING (PHASE 2, STUBBED — AFRICA'S TALKING VOICE) */}
        {activeTab === 'calling' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5" /> Phase 2 Stub · Africa&apos;s Talking Voice
              </div>
              <h3 className="text-lg font-black text-gray-900">
                Eligible Warm Leads for AI Voice Follow-Up
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>Compliance Gate:</strong> Cold calling is blocked. Calls can ONLY be queued
                for leads who have <strong>replied</strong> (`replied`, `interested`, `hot`) or{' '}
                <strong>explicitly requested contact</strong>, and the voice script always discloses
                upfront that the caller is an AI assistant from Batteriq Kenya.
              </p>

              {eligibleCallLeads.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center bg-gray-50 rounded-2xl">
                  No leads currently meet the warm-reply / contact-request eligibility gate.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {eligibleCallLeads.slice(0, 12).map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{lead.business_name}</p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          {lead.phone_e164} · Status: {lead.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleTriggerStubCall(lead.id)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                      >
                        Queue Stub AI Call
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-gray-900">Voice Call Audit Log</h3>
              {calls.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">
                  No stubbed voice calls queued yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {calls.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900">
                          {c.outreach_leads?.business_name || c.phone_e164} ({c.phone_e164})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Eligibility: <strong>{c.eligibility_reason}</strong> ·{' '}
                        {new Date(c.created_at).toLocaleString('en-KE')}
                      </p>
                      <p className="text-[11px] text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-100">
                        &ldquo;{c.ai_disclosure_script}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS & FULL OPERATIONAL LOGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-gray-900">Outreach Configuration</h3>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                  Daily Email Limit (Default 50)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.daily_email_limit}
                  onChange={(e) =>
                    setSettings({ ...settings, daily_email_limit: Number(e.target.value) || 50 })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={settings.sender_name}
                  onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                    Verified Sender Email
                  </label>
                  <input
                    type="email"
                    value={settings.sender_email}
                    onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                    Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={settings.reply_to_email}
                    onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                    Website Follow-up After N Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.followup_days}
                    onChange={(e) =>
                      setSettings({ ...settings, followup_days: Number(e.target.value) || 7 })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                    WhatsApp Follow-up Template
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_followup_template}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_followup_template: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busyAction === 'settings'}
                onClick={() =>
                  patchSettings(
                    {
                      daily_email_limit: settings.daily_email_limit,
                      sender_name: settings.sender_name,
                      sender_email: settings.sender_email,
                      reply_to_email: settings.reply_to_email,
                      followup_days: settings.followup_days,
                      whatsapp_followup_template: settings.whatsapp_followup_template,
                      whatsapp_default_template: settings.whatsapp_default_template,
                    },
                    'Outreach configuration saved.'
                  )
                }
                className="w-full h-11 rounded-xl bg-[#00004d] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider"
              >
                Save Outreach Settings
              </button>
            </div>

            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-gray-900">
                  System, Compliance &amp; Error Logs
                </h3>
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> Latest {logs.length} events
                </span>
              </div>
              {logs.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center">No logs recorded yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        l.level === 'error'
                          ? 'bg-red-50/70 border-red-200 text-red-900'
                          : l.level === 'warn'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-gray-50 border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-75 mb-1">
                        <span>
                          [{l.level}] {l.module} → {l.event}
                        </span>
                        <span>{new Date(l.created_at).toLocaleString('en-KE')}</span>
                      </div>
                      <p className="font-medium leading-relaxed">{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
