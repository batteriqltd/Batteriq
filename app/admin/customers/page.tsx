import { createAdminClient } from '@/lib/supabase/admin'
import { Users, Phone, Mail, ShoppingBag, TrendingUp, MapPin, Star, UserCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(n: number) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

export default async function CustomersPage() {
  const supabase = createAdminClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('guest_name, guest_email, guest_phone, total_kes, payment_status, created_at, delivery_address, items')
    .order('created_at', { ascending: false })

  const customerMap: Record<string, {
    name: string; email: string; phone: string
    orderCount: number; totalSpent: number; lastOrder: string; county: string
  }> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(orders ?? []).forEach((o: any) => {
    const key = o.guest_email?.toLowerCase() ?? o.guest_phone
    if (!key) return
    if (!customerMap[key]) {
      customerMap[key] = {
        name: o.guest_name ?? 'Unknown',
        email: o.guest_email ?? '',
        phone: o.guest_phone ?? '',
        orderCount: 0,
        totalSpent: 0,
        lastOrder: o.created_at,
        county: o.delivery_address?.county ?? '',
      }
    }
    customerMap[key].orderCount++
    if (o.payment_status === 'paid') customerMap[key].totalSpent += Number(o.total_kes)
    if (new Date(o.created_at) > new Date(customerMap[key].lastOrder)) {
      customerMap[key].lastOrder = o.created_at
    }
  })

  const customers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent)
  const totalCustomers = customers.length
  const repeatBuyers = customers.filter(c => c.orderCount > 1).length
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const avgSpend = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Customer Database</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Analyzing {totalCustomers} unique buyer profiles
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm">
            <UserCheck size={16} className="text-green-500" />
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">{repeatBuyers} REPEAT CUSTOMERS</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Database', value: String(totalCustomers), sub: 'unique profiles', color: '#0000ff', bg: 'rgba(0, 0, 255, 0.05)', icon: Users },
          { label: 'Retention Rate', value: `${totalCustomers > 0 ? Math.round((repeatBuyers / totalCustomers) * 100) : 0}%`, sub: 'multi-order buyers', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.05)', icon: Star },
          { label: 'Total LTV', value: fmt(totalRevenue), sub: 'from all clients', color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', icon: ShoppingBag },
          { label: 'Avg Customer Value', value: fmt(avgSpend), sub: 'per unique buyer', color: '#0369a1', bg: 'rgba(3, 105, 161, 0.05)', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: s.bg }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <p className="text-[28px] font-black text-gray-900 leading-none tracking-tight font-mono mb-1">{s.value}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">{s.label}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              <p className="text-xs font-bold text-gray-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] overflow-hidden"
        style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Operator Directory</h2>
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{customers.length} RECORDS SYNCED</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table style={{minWidth:"600px"}} className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['Customer Identity', 'Contact Channels', 'Primary Location', 'Engagement', 'Lifetime Value', 'Last Seen', 'Category'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-8 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c, i) => (
                <tr key={c.email || c.phone} className="hover:bg-blue-50/30 transition-all cursor-default">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0 shadow-lg"
                        style={{ background: `linear-gradient(135deg, hsl(${(i * 47) % 360}, 70%, 50%), hsl(${(i * 47) % 360}, 70%, 30%))` }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1.5">
                      <p className="text-[12px] font-bold text-gray-600 flex items-center gap-2">
                        <Mail size={12} className="text-gray-300" /> {c.email || 'N/A'}
                      </p>
                      <p className="text-[12px] font-bold text-gray-600 flex items-center gap-2">
                        <Phone size={12} className="text-gray-300" /> {c.phone || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                      <MapPin size={12} className="text-gray-300" />
                      {c.county || 'UNKNOWN'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-end gap-1.5">
                      <span className="text-[15px] font-black text-blue-600 leading-none">{c.orderCount}</span>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">ORDERS</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[14px] font-black font-mono text-gray-900 leading-none">{fmt(c.totalSpent)}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[13px] font-black text-gray-900 leading-none mb-1 uppercase">
                      {new Date(c.lastOrder).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {new Date(c.lastOrder).toLocaleDateString('en-KE', { year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest inline-flex border ${
                      c.orderCount > 1 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-100' 
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      {c.orderCount > 1 ? '★ VIP REPEAT' : 'NEW BUYER'}
                    </span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                        <Users size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[16px] font-black text-gray-900 tracking-tight">No customers found</p>
                      <p className="text-sm font-medium text-gray-400 mt-1">They appear here once orders are placed.</p>
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