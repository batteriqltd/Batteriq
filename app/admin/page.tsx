import { createAdminClient } from '@/lib/supabase/admin'
import { TrendingUp, ShoppingBag, ArrowUpRight, CheckCircle, Clock, AlertCircle, AlertTriangle, Users, CreditCard } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmt(n: number) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

async function getData() {
  const supabase = createAdminClient()

  const [ordersRes, productsRes, messagesRes] = await Promise.allSettled([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('products').select('*').order('sort_order', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('contact_submissions') as any).select('*').order('submitted_at', { ascending: false }).limit(50),
  ])

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders: (ordersRes.status === 'fulfilled' ? ordersRes.value.data ?? [] : []) as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products: (productsRes.status === 'fulfilled' ? productsRes.value.data ?? [] : []) as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: (messagesRes.status === 'fulfilled' ? messagesRes.value.data ?? [] : []) as any[],
  }
}

export default async function AdminDashboardPage() {
  const { orders, products, messages } = await getData()

  const today = new Date().toDateString()
  const thisWeekStart = new Date(); thisWeekStart.setDate(thisWeekStart.getDate() - 7)
  const thisMonthStart = new Date(); thisMonthStart.setDate(1)

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
  const weekOrders = orders.filter(o => new Date(o.created_at) >= thisWeekStart)
  const monthOrders = orders.filter(o => new Date(o.created_at) >= thisMonthStart)

  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const pendingOrders = orders.filter(o => o.payment_status === 'pending')
  const failedOrders = orders.filter(o => o.payment_status === 'failed')

  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total_kes), 0)
  const weekRevenue = weekOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_kes), 0)
  const monthRevenue = monthOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_kes), 0)
  const todayRevenue = todayOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_kes), 0)
  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0

  // Top selling products
  const productSales: Record<string, { name: string; brand: string; count: number; revenue: number }> = {}
  paidOrders.forEach(order => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(order.items ?? []).forEach((item: any) => {
      const key = item.id ?? item.name
      if (!productSales[key]) {
        productSales[key] = { name: item.name, brand: item.brand ?? '', count: 0, revenue: 0 }
      }
      productSales[key].count += item.quantity ?? 1
      productSales[key].revenue += Number(item.price_kes ?? 0) * (item.quantity ?? 1)
    })
  })
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Last 30 days revenue chart
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toDateString()
    const dayPaid = orders.filter(o => new Date(o.created_at).toDateString() === dateStr && o.payment_status === 'paid')
    return {
      label: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
      revenue: dayPaid.reduce((s, o) => s + Number(o.total_kes), 0),
      count: dayPaid.length,
    }
  })
  const maxRevenue = Math.max(...last30.map(d => d.revenue), 1)

  // Stock alerts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lowStock = products.filter((p: any) => p.in_stock && Number(p.stock_qty) <= Number(p.low_stock_threshold ?? 3) && Number(p.stock_qty) > 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outOfStock = products.filter((p: any) => !p.in_stock || Number(p.stock_qty) === 0)

  // Payment method breakdown
  const paymentBreakdown = {
    mpesa: orders.filter(o => o.payment_method === 'mpesa_now' && o.payment_status === 'paid').length,
    cod_cash: orders.filter(o => o.payment_method === 'cod_cash').length,
    cod_mpesa: orders.filter(o => o.payment_method === 'cod_mpesa').length,
  }

  const uniqueCustomers = new Set(orders.map(o => o.guest_email?.toLowerCase()).filter(Boolean)).size

  // Trend indicators
  const lastWeekStart = new Date(); lastWeekStart.setDate(lastWeekStart.getDate() - 14)
  const lastWeekEnd = new Date(); lastWeekEnd.setDate(lastWeekEnd.getDate() - 7)
  const lastWeekRevenue = orders
    .filter(o => { const d = new Date(o.created_at); return d >= lastWeekStart && d < lastWeekEnd && o.payment_status === 'paid' })
    .reduce((s, o) => s + Number(o.total_kes), 0)
  const weekGrowth = lastWeekRevenue > 0 ? Math.round(((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100) : (weekRevenue > 0 ? 100 : 0)

  const hoursToday = Math.max(1, new Date().getHours() + 1)
  const orderVelocity = (todayOrders.length / hoursToday).toFixed(1)

  const customerOrderCounts: Record<string, number> = {}
  orders.forEach(o => {
    if (o.guest_email) customerOrderCounts[o.guest_email.toLowerCase()] = (customerOrderCounts[o.guest_email.toLowerCase()] ?? 0) + 1
  })
  const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length
  const clvAvg = uniqueCustomers > 0 ? Math.round(totalRevenue / uniqueCustomers) : 0

  const countyCounts: Record<string, number> = {}
  orders.forEach(o => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const county = (o as any).delivery_address?.county
    if (county) countyCounts[county] = (countyCounts[county] ?? 0) + 1
  })
  const topCounty = Object.entries(countyCounts).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined

  return (
    <div className="min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 pb-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Batteriq Operations</p>
            <h1 className="text-[28px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Command Center</h1>
            <p className="text-gray-400 text-sm font-medium mt-2">
              Welcome back. Here's what's happening with Batteriq today.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {(lowStock.length > 0 || outOfStock.length > 0) && (
              <Link href="/admin/stock"
                className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-orange-100 bg-white shadow-sm text-xs font-black text-orange-600 transition-transform hover:scale-105">
                <AlertTriangle size={14} />
                {outOfStock.length + lowStock.length} STOCK ALERTS
              </Link>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-gray-900 tracking-wider">SYSTEMS ONLINE</span>
            </div>
            <button className="h-11 px-6 rounded-2xl font-black text-white text-sm tracking-wide transition-all hover:shadow-[0_8px_32px_rgba(0,0,255,0.25)] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
              GENERATE REPORT
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: `${fmt(todayRevenue)} today`, icon: TrendingUp, color: '#0000ff', bg: 'rgba(0, 0, 255, 0.05)', href: '/admin/payments' },
            { label: 'Total Orders', value: String(orders.length), sub: `${todayOrders.length} today`, icon: ShoppingBag, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.05)', href: '/admin/orders' },
            { label: 'Unique Customers', value: String(uniqueCustomers), sub: 'lifetime buyers', icon: Users, color: '#0369a1', bg: 'rgba(3, 105, 161, 0.05)', href: '/admin/orders' },
            { label: 'Avg Order Value', value: fmt(avgOrderValue), sub: 'per paid order', icon: CreditCard, color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', href: '/admin/payments' },
          ].map(s => (
            <Link key={s.label} href={s.href}
              className="bg-white rounded-[24px] p-6 transition-all duration-300 group hover:-translate-y-1"
              style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300" style={{ background: s.bg }}>
                  <s.icon size={22} style={{ color: s.color }} />
                </div>
                <ArrowUpRight size={18} className="text-gray-200 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-[32px] font-black text-gray-900 mb-1 leading-none tracking-tight font-mono">{s.value}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">{s.label}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-blue-500" />
                <p className="text-xs font-bold text-gray-500">{s.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Analytics + Chart row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* 30-day revenue chart */}
          <div className="xl:col-span-2 bg-white rounded-[32px] p-8"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-gray-900">Revenue Performance</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">LAST 30 DAYS ANALYTICS</p>
              </div>
              <div className="flex gap-2">
                {['D', 'W', 'M', 'Y'].map(t => (
                  <button key={t} className={`w-8 h-8 rounded-full text-[10px] font-black transition-all ${t === 'M' ? 'bg-[#0000ff] text-white shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-48 mb-4">
              {last30.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full rounded-t-lg transition-all duration-500 cursor-pointer hover:opacity-100 group-hover:shadow-[0_0_20px_rgba(0,0,255,0.2)]"
                    style={{
                      height: `${Math.max(4, (day.revenue / maxRevenue) * 180)}px`,
                      background: day.revenue > 0 ? 'linear-gradient(180deg, #0000ff, #000080)' : '#f3f4f6',
                      opacity: i >= last30.length - 7 ? 1 : 0.4,
                    }} />
                  {i % 6 === 0 && <span className="text-[9px] font-black text-gray-400 whitespace-nowrap">{day.label.toUpperCase()}</span>}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 scale-90 group-hover:scale-100">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-center shadow-xl">
                      <p className="text-[10px] font-black opacity-60 mb-0.5">{day.label}</p>
                      <p className="text-xs font-black font-mono">{fmt(day.revenue)}</p>
                    </div>
                    <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">Week Growth</p>
                <TrendingUp size={16} className={weekGrowth >= 0 ? 'text-green-500' : 'text-red-500'} />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-[32px] font-black text-gray-900 leading-none">{weekGrowth >= 0 ? '+' : ''}{weekGrowth}%</p>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black mb-1 ${weekGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {weekGrowth >= 0 ? 'GROWTH' : 'DECLINE'}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 mb-4">Order Velocity</p>
              <div className="flex items-end gap-3">
                <p className="text-[32px] font-black text-gray-900 leading-none">{orderVelocity}</p>
                <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">ORDERS/HOUR</p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6" style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 mb-4">Delivery Hotspot</p>
              <div className="flex items-end gap-3">
                <p className="text-[28px] font-black text-gray-900 leading-none truncate">{topCounty?.[0] ?? 'N/A'}</p>
                <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest shrink-0">{topCounty?.[1] ?? 0} SALES</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Order status */}
          <div className="bg-white rounded-[24px] p-7"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <h3 className="text-lg font-black text-gray-900 mb-6">Order Fulfillment</h3>
            {[
              { label: 'Paid & Ready', count: paidOrders.length, color: '#059669', bg: '#dcfce7' },
              { label: 'Pending Payment', count: pendingOrders.length, color: '#d97706', bg: '#fef3c7' },
              { label: 'Failed / Cancelled', count: failedOrders.length, color: '#dc2626', bg: '#fee2e2' },
            ].map(item => (
              <div key={item.label} className="mb-6 last:mb-0">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs font-black px-3 py-1 rounded-xl" style={{ background: item.bg, color: item.color }}>
                    {item.count}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-50 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${orders.length ? (item.count / orders.length) * 100 : 0}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top products */}
          <div className="bg-white rounded-[24px] p-7"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900">Performance Ranking</h3>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">BY REVENUE</span>
            </div>
            <div className="space-y-1">
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 group transition-colors hover:bg-gray-50 px-2 rounded-xl -mx-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-black text-white shadow-lg"
                    style={{ background: i === 0 ? '#0000ff' : i === 1 ? '#7c3aed' : '#94a3b8' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-gray-900 truncate tracking-tight">{p.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.count} UNITS · {p.brand}</p>
                  </div>
                  <p className="text-[13px] font-black font-mono text-blue-600 flex-shrink-0">{fmt(p.revenue)}</p>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No transaction data</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-[24px] p-7"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900">Live Stream</h3>
              <Link href="/admin/orders" className="text-[11px] font-black text-blue-600 hover:underline uppercase tracking-widest">Activity Log</Link>
            </div>
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {orders.slice(0, 10).map(order => (
                <div key={order.id} className="flex items-start gap-4 p-3 rounded-2xl border border-gray-50 transition-all hover:border-blue-100 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                    style={{ background: order.payment_status === 'paid' ? '#dcfce7' : order.payment_status === 'failed' ? '#fee2e2' : '#fef3c7' }}>
                    {order.payment_status === 'paid'
                      ? <CheckCircle size={18} className="text-green-600" />
                      : order.payment_status === 'failed'
                      ? <AlertCircle size={18} className="text-red-500" />
                      : <Clock size={18} className="text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[13px] font-black text-gray-900 truncate tracking-tight">{order.guest_name}</p>
                      <p className="text-[13px] font-black font-mono text-gray-900">{fmt(Number(order.total_kes))}</p>
                    </div>
                    <p className="text-[11px] font-bold text-blue-600 font-mono mb-1">{order.order_number}</p>
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                      {new Date(order.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock alerts */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <div className="bg-white rounded-[32px] p-8 mb-8 mt-8 border border-orange-100"
            style={{ background: 'linear-gradient(135deg, #fffcf5, #ffffff)', boxShadow: '0 2px 20px rgba(251,146,60,0.06)' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <AlertTriangle size={24} className="text-orange-500" />
                Critical Stock Alerts
              </h3>
              <Link href="/admin/stock"
                className="h-10 px-6 rounded-xl font-black text-white text-xs tracking-widest flex items-center shadow-lg shadow-blue-200"
                style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
                MANAGE INVENTORY
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {outOfStock.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 bg-white border border-red-50 rounded-2xl p-4 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-gray-900 truncate tracking-tight">{p.name}</p>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5">OUT OF STOCK</p>
                  </div>
                </div>
              ))}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {lowStock.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 bg-white border border-orange-50 rounded-2xl p-4 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-gray-900 truncate tracking-tight">{p.name}</p>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-0.5">LOW STOCK: {p.stock_qty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent messages */}
        {messages.length > 0 && (
          <div className="bg-white rounded-[32px] p-8 mt-8"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-900">Communication Center</h3>
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-1">LATEST CUSTOMER INQUIRIES</p>
              </div>
              <Link href="/admin/messages" className="h-10 px-6 rounded-xl border-2 border-gray-50 flex items-center text-xs font-black text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-all">VIEW ALL MESSAGES</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {messages.slice(0, 3).map(m => (
                <div key={m.id} className="flex flex-col bg-gray-50 rounded-[24px] p-6 border border-gray-100 transition-all hover:bg-white hover:shadow-xl group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white flex-shrink-0 shadow-lg transition-transform group-hover:scale-110"
                      style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
                      {m.first_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-black text-gray-900 tracking-tight">{m.first_name} {m.last_name}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{m.inquiry_type}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3 italic">"{m.message}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {new Date(m.submitted_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </span>
                    {m.status === 'new' && <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-blue-100 uppercase tracking-tighter">NEW</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
