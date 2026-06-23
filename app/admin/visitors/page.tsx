'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Smartphone, Tablet, Globe, ArrowUpRight,
  Users, Activity, Clock, Eye
} from 'lucide-react'

interface Visitor {
  visitorId: string
  page: string
  pageLabel: string
  device: string
  referrer: string
  enteredAt: string
  updatedAt: string
}

function timeOnSite(enteredAt: string): string {
  const secs = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function DeviceIcon({ device }: { device: string }) {
  const cls = 'text-gray-400'
  if (device === 'Mobile') return <Smartphone size={14} className={cls} />
  if (device === 'Tablet') return <Tablet size={14} className={cls} />
  return <Monitor size={14} className={cls} />
}

const PAGE_COLORS: Record<string, string> = {
  'Homepage': '#0000ff',
  'EcoFlow Kenya': '#00a651',
  'Cart': '#f59e0b',
  'Checkout': '#ef4444',
  'Order Confirmed': '#22c55e',
}

export default function VisitorsPage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [totalToday, setTotalToday] = useState(0)
  const [tick, setTick] = useState(0)
  const [, setIsConnected] = useState(false)

  // Update time-on-site every second
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Count unique visitors from orders today (real data)
  useEffect(() => {
    async function loadToday() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from('orders') as any)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
      setTotalToday(count ?? 0)
    }
    loadToday()
  }, [supabase])

  // Subscribe to presence channel
  useEffect(() => {
    const channel = supabase.channel('bq_visitors')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const all: Visitor[] = []
        Object.values(state).forEach((presences) => {
          const arr = presences as Visitor[]
          if (arr.length > 0) all.push(arr[arr.length - 1])
        })
        setVisitors(all)
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState()
        const all: Visitor[] = []
        Object.values(state).forEach((presences) => {
          const arr = presences as Visitor[]
          if (arr.length > 0) all.push(arr[arr.length - 1])
        })
        setVisitors(all)
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState()
        const all: Visitor[] = []
        Object.values(state).forEach((presences) => {
          const arr = presences as Visitor[]
          if (arr.length > 0) all.push(arr[arr.length - 1])
        })
        setVisitors(all)
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Page breakdown
  const pageBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    visitors.forEach(v => {
      const label = v.pageLabel || v.page
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [visitors])

  // Device breakdown
  const devices = useMemo(() => {
    const map = { Mobile: 0, Tablet: 0, Desktop: 0 }
    visitors.forEach(v => {
      const d = v.device as keyof typeof map
      if (d in map) map[d]++
    })
    return map
  }, [visitors])

  // Referrer breakdown
  const referrers = useMemo(() => {
    const map = new Map<string, number>()
    visitors.forEach(v => {
      const ref = v.referrer || 'Direct'
      map.set(ref, (map.get(ref) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [visitors])

  const liveCount = visitors.length
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void tick // force re-render for time-on-site

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-16 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Real-Time Analytics</p>
          <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">
            Live Visitors
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            Updating in real time · Supabase Presence
          </p>
        </div>
        <div className="h-11 px-5 rounded-2xl flex items-center gap-2 font-black text-[13px]"
          style={{ background: liveCount > 0 ? 'linear-gradient(135deg, #00004d, #0000cc)' : '#f3f4f6', color: liveCount > 0 ? 'white' : '#9ca3af' }}>
          <Activity size={15} />
          {liveCount === 0 ? 'No one online now' : `${liveCount} online right now`}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Live Right Now', value: liveCount, icon: Users, color: '#0000ff', bg: '#f0f2ff', pulse: liveCount > 0 },
          { label: 'Orders Today', value: totalToday, icon: ArrowUpRight, color: '#00a651', bg: '#f0fdf4', pulse: false },
          { label: 'On Mobile', value: devices.Mobile, icon: Smartphone, color: '#f59e0b', bg: '#fffbeb', pulse: false },
          { label: 'On Desktop', value: devices.Desktop, icon: Monitor, color: '#6366f1', bg: '#f5f3ff', pulse: false },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[20px] p-5 border border-gray-100"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{ background: s.bg }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              {s.pulse && liveCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Live visitor list */}
        <div className="xl:col-span-2 bg-white rounded-[24px] border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Eye size={15} className="text-[#0000ff]" /> Active Sessions
              </h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Each row is one browser session on batteriq.com
              </p>
            </div>
            <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
              style={{ background: liveCount > 0 ? '#f0f2ff' : '#f3f4f6', color: liveCount > 0 ? '#0000ff' : '#9ca3af' }}>
              {liveCount} active
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '440px' }}>
            <AnimatePresence>
              {visitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Users size={22} className="text-gray-200" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">No visitors online right now</p>
                  <p className="text-xs text-gray-300 font-medium">When someone visits batteriq.com, they will appear here</p>
                </div>
              ) : (
                visitors.map((v, i) => (
                  <motion.div
                    key={v.visitorId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* Live dot */}
                    <div className="relative flex h-3 w-3 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </div>

                    {/* Page badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full"
                          style={{
                            background: `${PAGE_COLORS[v.pageLabel] || '#6b7280'}15`,
                            color: PAGE_COLORS[v.pageLabel] || '#6b7280',
                          }}>
                          {v.pageLabel || v.page}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium truncate">{v.page}</p>
                    </div>

                    {/* Device */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <DeviceIcon device={v.device} />
                      <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">{v.device}</span>
                    </div>

                    {/* Referrer */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <Globe size={12} className="text-gray-300" />
                      <span className="text-[11px] text-gray-400 font-medium">{v.referrer || 'Direct'}</span>
                    </div>

                    {/* Time on site */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Clock size={12} className="text-gray-300" />
                      <span className="text-[11px] font-black text-gray-500 tabular-nums">
                        {timeOnSite(v.enteredAt)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column — breakdowns */}
        <div className="space-y-5">

          {/* Pages breakdown */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={14} className="text-[#0000ff]" /> Pages Right Now
            </h3>
            {pageBreakdown.length === 0 ? (
              <p className="text-xs text-gray-300 font-medium text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {pageBreakdown.map(([page, count]) => (
                  <div key={page}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[140px]">{page}</span>
                      <span className="text-xs font-black text-gray-900 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: PAGE_COLORS[page] || '#6b7280' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${liveCount > 0 ? (count / liveCount) * 100 : 0}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Traffic sources */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={14} className="text-[#0000ff]" /> Traffic Sources
            </h3>
            {referrers.length === 0 ? (
              <p className="text-xs text-gray-300 font-medium text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2.5">
                {referrers.map(([ref, count]) => (
                  <div key={ref} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0000ff]" />
                      <span className="text-xs font-bold text-gray-700">{ref}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#0000ff]"
                          style={{ width: `${liveCount > 0 ? (count / liveCount) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[11px] font-black text-gray-500 w-4 text-right tabular-nums">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device split */}
          <div className="bg-white rounded-[24px] border border-gray-100 p-6"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
              <Monitor size={14} className="text-[#0000ff]" /> Devices
            </h3>
            <div className="space-y-3">
              {([['Mobile', devices.Mobile, '#f59e0b'], ['Desktop', devices.Desktop, '#6366f1'], ['Tablet', devices.Tablet, '#22c55e']] as [string, number, string][]).map(([label, count, color]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15` }}>
                    {label === 'Mobile' ? <Smartphone size={13} style={{ color }} /> :
                     label === 'Tablet' ? <Tablet size={13} style={{ color }} /> :
                     <Monitor size={13} style={{ color }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{label}</span>
                      <span className="text-xs font-black text-gray-900 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${liveCount > 0 ? (count / liveCount) * 100 : 0}%`, background: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
