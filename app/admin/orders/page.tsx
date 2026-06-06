'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Bell, Eye, Search, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Order {
  id: string
  order_number: string
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  total_kes: number
  payment_method: string
  payment_status: string
  fulfillment_status: string
  created_at: string
  mpesa_transaction_code?: string | null
  mpesa_failure_reason?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
}

function fmt(n: number | string) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

const FULFILLMENT_OPTIONS = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [newAlert, setNewAlert] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/orders/list')
      const data = await res.json()
      setOrders((data.orders ?? []) as Order[])
      setLoading(false)
      setLastRefresh(new Date())
    }
    load()

    const channel = supabase
      .channel('admin-orders-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const newOrder = payload.new as Order
        setOrders(prev => [newOrder, ...prev])
        setNewAlert(`New order from ${newOrder.guest_name ?? 'Customer'} — ${fmt(newOrder.total_kes)}`)
        setTimeout(() => setNewAlert(''), 6000)
        try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = payload.new as Order
        const previous = payload.old as Partial<Order>
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))

        if (previous.payment_status !== 'paid' && updated.payment_status === 'paid') {
          const amount = `KES ${Number(updated.total_kes).toLocaleString('en-KE')}`
          setToast(`💰 PAYMENT RECEIVED — ${updated.guest_name} paid ${amount} via M-Pesa (Ref: ${updated.mpesa_transaction_code || 'N/A'})`)
          setTimeout(() => setToast(''), 8000)
          try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
        }

        if (previous.payment_status !== 'failed' && updated.payment_status === 'failed') {
          setToast(`❌ Payment failed — ${updated.guest_name}: ${updated.mpesa_failure_reason || 'PIN error or cancelled'}`)
          setTimeout(() => setToast(''), 6000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/admin/orders/list')
      const data = await res.json()
      setOrders((data.orders ?? []) as Order[])
      setLastRefresh(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function updateFulfillment(orderId: string, value: string) {
    const res = await fetch(`/api/admin/orders/${orderId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fulfillment_status: value }),
    })
    const data = await res.json()
    if (data.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, fulfillment_status: value } : o))
      const needsEmail = ['processing', 'shipped', 'delivered'].includes(value)
      setToast(`Order updated to "${value}"${needsEmail ? ' — customer notified by email' : ''}`)
      setTimeout(() => setToast(''), 4000)
    }
  }

  async function markCashPaid(order: Order) {
    const res = await fetch('/api/admin/orders/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        payment_status: 'paid',
        fulfillment_status: 'processing',
      }),
    })

    if (res.ok) {
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, payment_status: 'paid', fulfillment_status: 'processing' } : o
      ))
      fetch(`/api/admin/orders/${order.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', fulfillment_status: 'processing' }),
      }).catch(console.error)
      setToast(`Cash payment confirmed for ${order.guest_name ?? 'customer'} — email sent to customer`)
      setTimeout(() => setToast(''), 5000)
    }
  }

  async function sendStkPush(order: Order) {
    setToast(`📱 Sending STK push to ${order.guest_phone}...`)
    try {
      const res = await fetch('/api/admin/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (data.success) {
        setToast(`✅ STK Push sent to ${order.guest_phone} — waiting for customer PIN`)
      } else {
        setToast(`❌ Push failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error'
      setToast(`❌ Network error: ${message}`)
    }
    setTimeout(() => setToast(''), 6000)
  }

  const filtered = orders.filter(o => {
    const matchFilter =
      filter === 'all' ? true
      : filter === 'paid' ? o.payment_status === 'paid'
      : filter === 'pending' ? o.payment_status === 'pending'
      : filter === 'cod' ? o.payment_method.startsWith('cod')
      : filter === 'today' ? new Date(o.created_at).toDateString() === new Date().toDateString()
      : true
    const q = search.toLowerCase()
    const matchSearch = !search
      || o.order_number?.toLowerCase().includes(q)
      || (o.guest_name ?? '').toLowerCase().includes(q)
      || (o.guest_phone ?? '').includes(q)
    return matchFilter && matchSearch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 bg-[#f8f9fa] min-h-screen">

      {/* New order alert */}
      <AnimatePresence>
        {newAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 flex items-center gap-4 px-8 py-4 rounded-[24px] shadow-2xl border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)', color: 'white' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">NEW ORDER RECEIVED</p>
              <p className="text-sm font-black tracking-tight">{newAlert}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-8 right-8 z-50 px-6 py-4 rounded-[20px] shadow-2xl text-white text-[13px] font-black border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Order Management</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Monitoring — {orders.length} orders tracked
            </p>
            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Live · Auto-refreshes every 30s
              {lastRefresh && <span className="text-gray-300 font-normal ml-1">· Last: {lastRefresh.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/admin/export?type=orders"
            className="h-11 px-6 rounded-2xl bg-white border border-gray-100 text-sm font-black text-gray-900 flex items-center gap-2 transition-all hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5"
            style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
          >
            <Download size={16} />
            EXPORT TO CSV
          </a>
          <div
            className="h-11 px-6 rounded-2xl bg-[#0000ff] text-white flex items-center shadow-lg shadow-blue-200"
          >
            <p className="text-sm font-black tracking-widest uppercase">{filtered.length} ACTIVE VIEW</p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px] max-w-md group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID, name, or phone…"
            className="w-full pl-12 pr-6 h-12 rounded-[16px] border border-gray-100 text-[14px] font-medium outline-none bg-white shadow-sm transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5"
          />
        </div>
        <div className="flex p-1.5 bg-white rounded-[20px] border border-gray-100 shadow-sm gap-1">
          {(['all', 'today', 'pending', 'paid', 'cod'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-[14px] text-[11px] font-black transition-all uppercase tracking-widest ${filter === f ? 'bg-[#0000ff] text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'All' : f === 'cod' ? 'C.O.D' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-[32px] overflow-hidden"
        style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
      >
        <div className="overflow-x-auto w-full">
          <table style={{minWidth:"600px"}} className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['Reference', 'Customer', 'Items', 'Amount', 'Payment', 'Fulfillment', 'Timestamp', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-6 py-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filtered.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={i === 0 && !loading ? { backgroundColor: 'rgba(0, 0, 255, 0.05)' } : false}
                    animate={{ backgroundColor: '#ffffff' }}
                    transition={{ duration: 1.5 }}
                    className="group hover:bg-blue-50/30 transition-all cursor-default"
                  >
                    <td className="px-6 py-5">
                      <p className="text-[14px] font-black font-mono text-blue-600 leading-none">{order.order_number}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1">{order.guest_name ?? '—'}</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{order.guest_phone ?? '—'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-bold text-gray-700 leading-none mb-1">{order.items?.length ?? 0} ITEMS</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[150px]">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {order.items?.slice(0, 2).map((it: any) => it.name).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[14px] font-black font-mono text-gray-900">{fmt(order.total_kes)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest inline-flex w-fit ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 
                            order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{order.payment_method?.replace(/_/g, ' ')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select
                        value={order.fulfillment_status}
                        onChange={e => updateFulfillment(order.id, e.target.value)}
                        className="text-[11px] font-black uppercase tracking-widest border-2 border-gray-50 rounded-xl px-3 py-1.5 bg-white outline-none cursor-pointer text-gray-600 transition-all hover:border-blue-500 hover:text-blue-600"
                        style={{ minWidth: '140px' }}
                      >
                        {FULFILLMENT_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-black text-gray-900 leading-none mb-1">
                        {new Date(order.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-gray-50 text-gray-400 hover:bg-[#0000ff] hover:text-white hover:shadow-lg hover:shadow-blue-200"
                        >
                          <Eye size={16} />
                        </Link>
                        {(order.payment_status === 'pending' || order.payment_status === 'failed') && (
                          <button
                            onClick={() => sendStkPush(order)}
                            className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black hover:bg-green-600 transition-colors"
                          >
                            Send STK Push
                          </button>
                        )}
                        {order.payment_method === 'cod_cash' && order.payment_status === 'pending' && (
                          <button
                            onClick={() => markCashPaid(order)}
                            className="h-9 px-4 rounded-xl text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap transition-all shadow-lg shadow-emerald-100 hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #059669, #065f46)' }}
                          >
                            CONFIRM CASH
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                        <Search size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[16px] font-black text-gray-900 tracking-tight">No records found</p>
                      <p className="text-sm font-medium text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Data…</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
