'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Power,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react'

const cardCls =
  'rounded-[28px] bg-white border border-[#e3e9f5] shadow-[0_12px_32px_-18px_rgba(0,0,77,0.12)]'
const inputCls =
  'h-11 px-3.5 rounded-2xl bg-[#f8faff] border border-[#e3e9f5] text-[13px] font-medium text-[#00004d] placeholder:text-slate-400 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition'
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition disabled:opacity-50'
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-2xl border border-[#e3e9f5] bg-white hover:bg-[#f8faff] text-[#00004d] text-xs font-bold transition disabled:opacity-50'

interface Campaign {
  waha_cold_enabled: boolean
  waha_cold_message: string | null
  waha_cold_daily_cap: number
  waha_cold_start_hour: number
  waha_cold_end_hour: number
  waha_cold_paused_until: string | null
  sentToday?: number
  lastSentAt?: string | null
  remainingLeads?: number | null
}

interface StatusResponse {
  configured: boolean
  webhookSecretSet?: boolean
  reachable?: boolean
  latencyMs?: number
  status?: string
  me?: { id: string | null; pushName: string | null } | null
  webhook?: { url: string; registered: boolean; lastEventAt: string | null }
  qr?: string | null
  campaign?: Campaign | null
  error?: string
}

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  WORKING: { label: 'Connected', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SCAN_QR_CODE: { label: 'Scan QR', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  STARTING: { label: 'Starting…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  STOPPED: { label: 'Not started', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  NOT_CREATED: { label: 'Not started', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  FAILED: { label: 'Failed', cls: 'bg-red-50 text-red-600 border-red-200' },
  UNREACHABLE: { label: 'Server unreachable', cls: 'bg-red-50 text-red-600 border-red-200' },
}

function phoneFromMe(id: string | null | undefined): string | null {
  if (!id) return null
  const digits = id.split('@')[0].split(':')[0]
  return /^\d{8,15}$/.test(digits) ? `+${digits}` : null
}

async function postJson(url: string, body: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export function WhatsAppConnectCard() {
  const [state, setState] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [wantQr, setWantQr] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [pairPhone, setPairPhone] = useState('')
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [testText, setTestText] = useState('Hello from Batteriq 👋 This is a test message.')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const campaignDirty = useRef(false)

  const status = state?.status || (state?.configured === false ? 'NOT_CONFIGURED' : 'UNKNOWN')
  const scanning = status === 'SCAN_QR_CODE' || status === 'STARTING'

  const load = useCallback(async (withQr: boolean) => {
    try {
      const res = await fetch(`/api/admin/outreach/whatsapp/waha/status${withQr ? '?qr=1' : ''}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as StatusResponse
      if (res.ok) {
        setState(data)
        if (data.campaign && !campaignDirty.current) setCampaign(data.campaign)
      } else {
        setNote({ type: 'err', text: (data as { error?: string }).error || 'Could not load WhatsApp status' })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll: every 5s while pairing (one request carries status + QR), else every 30s.
  useEffect(() => {
    const polling = wantQr || scanning
    load(polling)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(polling)
    }, polling ? 5_000 : 30_000)
    return () => clearInterval(t)
  }, [load, wantQr, scanning])

  useEffect(() => {
    if (status === 'WORKING' && wantQr) {
      setWantQr(false)
      setPairCode(null)
      setNote({ type: 'ok', text: 'WhatsApp connected.' })
    }
  }, [status, wantQr])

  async function connect(force = false) {
    setBusy('connect')
    setNote(null)
    const { ok, data } = await postJson('/api/admin/outreach/whatsapp/waha/connect', { force })
    setBusy(null)
    if (!ok) return setNote({ type: 'err', text: data.error || 'Could not start session' })
    setWantQr(true)
    setNote({ type: 'ok', text: force ? 'Webhook re-applied.' : 'Session starting — QR will appear below.' })
    load(true)
  }

  async function disconnect(action: 'stop' | 'logout') {
    setBusy(action)
    setNote(null)
    const { ok, data } = await postJson('/api/admin/outreach/whatsapp/waha/disconnect', { action })
    setBusy(null)
    setConfirmLogout(false)
    setWantQr(false)
    if (!ok) return setNote({ type: 'err', text: data.error || `Could not ${action}` })
    setNote({ type: 'ok', text: action === 'logout' ? 'Logged out — phone unlinked.' : 'Session stopped.' })
    load(false)
  }

  async function requestPairing() {
    setBusy('pair')
    setNote(null)
    setPairCode(null)
    const { ok, data } = await postJson('/api/admin/outreach/whatsapp/waha/pairing-code', { phone: pairPhone })
    setBusy(null)
    if (!ok) return setNote({ type: 'err', text: data.error || 'Could not get pairing code' })
    setPairCode(String(data.code))
  }

  async function sendTest(e: React.FormEvent) {
    e.preventDefault()
    setBusy('test')
    setNote(null)
    const { ok, data } = await postJson('/api/admin/outreach/whatsapp/waha/test', {
      phone: testPhone,
      text: testText,
    })
    setBusy(null)
    if (!ok) return setNote({ type: 'err', text: data.error || 'Test message failed' })
    setNote({ type: 'ok', text: 'Test message sent. Reply from that phone — it will show in WhatsApp Inbox.' })
  }

  async function saveCampaign(partial?: Partial<Campaign>) {
    if (!campaign) return
    const next = { ...campaign, ...(partial || {}) }
    setBusy('campaign')
    setNote(null)
    const { ok, data } = await postJson(
      '/api/admin/outreach/whatsapp/waha/campaign',
      {
        waha_cold_enabled: next.waha_cold_enabled,
        waha_cold_message: next.waha_cold_message || '',
        waha_cold_daily_cap: next.waha_cold_daily_cap,
        waha_cold_start_hour: next.waha_cold_start_hour,
        waha_cold_end_hour: next.waha_cold_end_hour,
      },
      'PATCH'
    )
    setBusy(null)
    if (!ok) return setNote({ type: 'err', text: data.error || 'Could not save campaign' })
    campaignDirty.current = false
    setCampaign({ ...next, ...data.campaign })
    setNote({ type: 'ok', text: next.waha_cold_enabled ? 'Cold campaign ON — 1 message per minute.' : 'Campaign saved.' })
  }

  async function sendNextNow() {
    setBusy('tick')
    setNote(null)
    const { ok, data } = await postJson('/api/cron/whatsapp-cold', {})
    setBusy(null)
    if (!ok) return setNote({ type: 'err', text: data.error || 'Queue tick failed' })
    setNote(
      data.sent
        ? { type: 'ok', text: `Sent to ${data.businessName}.` }
        : {
            type: 'err',
            text: `Not sent: ${String(data.reason || 'unknown').replace(/_/g, ' ')}${
              data.retryAfterSeconds ? ` (retry in ${data.retryAfterSeconds}s)` : ''
            }`,
          }
    )
    load(false)
  }

  const ui = STATUS_UI[status] || { label: status, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
  const myPhone = phoneFromMe(state?.me?.id)
  const editCampaign = (patch: Partial<Campaign>) => {
    campaignDirty.current = true
    setCampaign((c) => (c ? { ...c, ...patch } : c))
  }

  return (
    <div className={`${cardCls} p-5 space-y-4 xl:col-span-2`} id="whatsapp-connect">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-extrabold">WhatsApp</h3>
          {!loading && state?.configured && (
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${ui.cls}`}>
              {ui.label}
            </span>
          )}
        </div>
        {state?.configured && (
          <button type="button" className={ghostBtn} onClick={() => load(wantQr)} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      </div>

      {loading && !state ? (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking WhatsApp server…
        </p>
      ) : !state?.configured ? (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          WhatsApp server is not configured. Set WAHA_BASE_URL, WAHA_API_KEY and WHATSAPP_WEBHOOK_SECRET in Vercel,
          then redeploy.
        </p>
      ) : (
        <>
          {/* Connection row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-[#f8faff] border border-[#e3e9f5] px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Server</p>
              <p className="mt-1 font-bold flex items-center gap-1.5">
                {state.reachable ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Online · {state.latencyMs}ms
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-red-500" /> Unreachable
                  </>
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8faff] border border-[#e3e9f5] px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Linked number</p>
              <p className="mt-1 font-bold">
                {status === 'WORKING' ? `${myPhone || '—'}${state.me?.pushName ? ` · ${state.me.pushName}` : ''}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8faff] border border-[#e3e9f5] px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Webhook</p>
              <p className="mt-1 font-bold">
                {state.webhook?.registered ? 'Registered' : 'Not registered'}
                {state.webhook?.lastEventAt && (
                  <span className="font-medium text-slate-400">
                    {' '}
                    · last event {new Date(state.webhook.lastEventAt).toLocaleTimeString('en-KE')}
                  </span>
                )}
              </p>
            </div>
          </div>

          {state.error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {status !== 'WORKING' && (
              <button type="button" className={primaryBtn} disabled={busy !== null || !state.reachable} onClick={() => connect(false)}>
                {busy === 'connect' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                Connect
              </button>
            )}
            {status === 'WORKING' && !state.webhook?.registered && (
              <button type="button" className={primaryBtn} disabled={busy !== null} onClick={() => connect(true)}>
                <RefreshCw className="w-3.5 h-3.5" /> Register webhook
              </button>
            )}
            {(status === 'WORKING' || scanning) && (
              <button type="button" className={ghostBtn} disabled={busy !== null} onClick={() => disconnect('stop')}>
                {busy === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                Disconnect
              </button>
            )}
            {status !== 'NOT_CREATED' && status !== 'UNREACHABLE' && (
              <button
                type="button"
                className={`${ghostBtn} ${confirmLogout ? '!border-red-300 !text-red-600' : ''}`}
                disabled={busy !== null}
                onClick={() => (confirmLogout ? disconnect('logout') : setConfirmLogout(true))}
                onBlur={() => setConfirmLogout(false)}
              >
                {busy === 'logout' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                {confirmLogout ? 'Tap again to unlink phone' : 'Log out'}
              </button>
            )}
          </div>

          {/* Pairing */}
          {status === 'SCAN_QR_CODE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-[#e3e9f5] p-4">
              <div className="flex flex-col items-center gap-2">
                {state.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.qr} alt="WhatsApp QR code" className="w-56 h-56 rounded-xl border border-[#e3e9f5] bg-white" />
                ) : (
                  <div className="w-56 h-56 rounded-xl border border-dashed border-[#e3e9f5] flex items-center justify-center text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading QR…
                  </div>
                )}
                <p className="text-[11px] text-slate-500 text-center">
                  WhatsApp → Settings → Linked devices → Link a device. Refreshes every 5s.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#2563eb]" /> Or link with a code
                </p>
                <input
                  value={pairPhone}
                  onChange={(e) => setPairPhone(e.target.value)}
                  placeholder="Business WhatsApp number, e.g. 0712 345 678"
                  className={`${inputCls} w-full`}
                />
                <button type="button" className={`${ghostBtn} w-full`} disabled={busy !== null || !pairPhone.trim()} onClick={requestPairing}>
                  {busy === 'pair' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Get pairing code
                </button>
                {pairCode && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Enter on your phone</p>
                    <p className="font-mono text-2xl font-black tracking-[0.3em] text-emerald-800">{pairCode}</p>
                    <p className="text-[11px] text-emerald-700 mt-1">Linked devices → Link a device → Link with phone number instead</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test send */}
          {status === 'WORKING' && (
            <form onSubmit={sendTest} className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Test number, e.g. 0712 345 678"
                className={`${inputCls} md:col-span-3`}
              />
              <input
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Message"
                className={`${inputCls} md:col-span-7`}
              />
              <button type="submit" className={`${primaryBtn} md:col-span-2 h-11`} disabled={busy !== null || !testPhone.trim() || !testText.trim()}>
                {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send test
              </button>
            </form>
          )}

          {/* Cold campaign */}
          {campaign && (
            <div className="rounded-2xl border border-[#e3e9f5] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-[#2563eb]" /> Cold outreach · 1 message per minute
                </p>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => saveCampaign({ waha_cold_enabled: !campaign.waha_cold_enabled })}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-2xl text-xs font-black uppercase transition ${
                    campaign.waha_cold_enabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {campaign.waha_cold_enabled ? 'Running' : 'Off'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl bg-[#f8faff] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Sends today</p>
                  <p className="font-black text-base">
                    {campaign.sentToday ?? 0} / {campaign.waha_cold_daily_cap}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f8faff] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Leads in queue</p>
                  <p className="font-black text-base">{campaign.remainingLeads ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Last send</p>
                  <p className="font-bold">
                    {campaign.lastSentAt ? new Date(campaign.lastSentAt).toLocaleTimeString('en-KE') : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f8faff] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Auto-pause</p>
                  <p className="font-bold">
                    {campaign.waha_cold_paused_until && Date.parse(campaign.waha_cold_paused_until) > Date.now()
                      ? `until ${new Date(campaign.waha_cold_paused_until).toLocaleTimeString('en-KE')}`
                      : 'None'}
                  </p>
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">
                  Message — {'{business}'} {'{city}'} {'{sender}'} are filled in; {'{Hi|Hello}'} picks one at random
                </span>
                <textarea
                  rows={5}
                  value={campaign.waha_cold_message || ''}
                  onChange={(e) => editCampaign({ waha_cold_message: e.target.value })}
                  placeholder="Leave empty to use the default intro"
                  className={`${inputCls} w-full h-auto py-3`}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Daily cap</span>
                  <input type="number" min={1} max={1000} value={campaign.waha_cold_daily_cap}
                    onChange={(e) => editCampaign({ waha_cold_daily_cap: Number(e.target.value) || 1 })}
                    className={`${inputCls} w-full`} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">From (EAT hour)</span>
                  <input type="number" min={0} max={23} value={campaign.waha_cold_start_hour}
                    onChange={(e) => editCampaign({ waha_cold_start_hour: Number(e.target.value) })}
                    className={`${inputCls} w-full`} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Until (EAT hour)</span>
                  <input type="number" min={1} max={24} value={campaign.waha_cold_end_hour}
                    onChange={(e) => editCampaign({ waha_cold_end_hour: Number(e.target.value) })}
                    className={`${inputCls} w-full`} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryBtn} disabled={busy !== null} onClick={() => saveCampaign()}>
                  {busy === 'campaign' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Save campaign
                </button>
                <button type="button" className={ghostBtn} disabled={busy !== null || status !== 'WORKING'} onClick={sendNextNow}>
                  {busy === 'tick' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send next now
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Replies get an instant AI answer. Replying yourself (here or on the phone) switches that chat to Human.
                STOP always opts the contact out.
              </p>
            </div>
          )}
        </>
      )}

      {note && (
        <p
          className={`text-xs font-semibold rounded-2xl px-4 py-2.5 border ${
            note.type === 'ok' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  )
}

/**
 * Backup trigger for the cold queue while the console is open (the primary
 * trigger is Supabase pg_cron). Server-side DB slots keep it to 1/minute.
 */
export function WhatsAppColdTicker() {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      fetch('/api/cron/whatsapp-cold', { method: 'POST', cache: 'no-store' }).catch(() => {})
    }
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [])
  return null
}
