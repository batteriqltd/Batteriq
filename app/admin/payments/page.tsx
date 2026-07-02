import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle, XCircle, Clock, Smartphone, Banknote, Truck, Receipt, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(n: number | string) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

export default async function AdminPaymentsPage() {
  const adminDb = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawOrders } = await (adminDb.from('orders') as any)
    .select('id, order_number, guest_name, guest_phone, total_kes, payment_method, payment_status, mpesa_transaction_code, mpesa_checkout_request_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = rawOrders ?? []
  const paid = all.filter(o => o.payment_status === 'paid')
  const pending = all.filter(o => o.payment_status === 'pending')
  const failed = all.filter(o => o.payment_status === 'failed')
  const totalPaid = paid.reduce((s: number, o) => s + Number(o.total_kes), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2">Payments & Reconciliation</p>
          <h1 className="text-[24px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Financial Console</h1>
          <p className="text-gray-400 text-[11px] sm:text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live monitoring — {all.length} transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm">
            <ShieldCheck size={16} className="text-blue-600" />
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Secure Settlements</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Settled Revenue', value: fmt(totalPaid), sub: `${paid.length} transactions`, color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', icon: Receipt },
          { label: 'Pending Flow', value: String(pending.length), sub: 'Awaiting clearance', color: '#d97706', bg: 'rgba(217, 119, 6, 0.05)', icon: Clock },
          { label: 'Declined/Failed', value: String(failed.length), sub: 'Verification errors', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', icon: XCircle },
          { label: 'Cash Provisions', value: String(all.filter(o => o.payment_method === 'cod_cash').length), sub: 'Expected on delivery', color: '#0000ff', bg: 'rgba(0, 0, 255, 0.05)', icon: Banknote },
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

      {/* Table (desktop) */}
      <div className="hidden lg:block bg-white rounded-[32px] overflow-hidden"
        style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Transaction Audit Log</h2>
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">LATEST 200 ENTRIES</span>
        </div>
        <div className="overflow-x-auto w-full" style={{WebkitOverflowScrolling:"touch"}}>
          <table style={{minWidth:"800px"}} className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                {['Reference', 'Customer Entity', 'Amount', 'Payment Mode', 'Auth Status', 'Clearing Code', 'Timestamp'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 px-8 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {all.map(order => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-all cursor-default">
                  <td className="px-8 py-5">
                    <p className="text-[14px] font-black font-mono text-blue-600 leading-none">{order.order_number}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1">{order.guest_name ?? '—'}</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider font-mono">{order.guest_phone ?? '—'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[14px] font-black font-mono text-gray-900">{fmt(order.total_kes)}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shadow-sm border border-gray-100">
                        {order.payment_method === 'mpesa_now' && <Smartphone size={14} className="text-green-600" />}
                        {order.payment_method === 'cod_cash' && <Banknote size={14} className="text-blue-600" />}
                        {order.payment_method === 'cod_mpesa' && <Truck size={14} className="text-purple-600" />}
                      </div>
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                        {order.payment_method === 'mpesa_now' ? 'M-PESA INSTANT'
                          : order.payment_method === 'cod_cash' ? 'CASH ON DELIVERY'
                          : 'M-PESA AT DOOR'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest inline-flex border shadow-sm ${
                      order.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-100'
                      : order.payment_status === 'failed' ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {order.payment_status === 'paid' ? 'SETTLED'
                        : order.payment_status === 'failed' ? 'DECLINED'
                        : 'PENDING'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {order.mpesa_transaction_code
                      ? (
                        <span className="text-[11px] font-mono font-black text-blue-600 bg-blue-50/50 px-3 py-1 rounded-lg uppercase tracking-wider border border-blue-100/50 shadow-sm">
                          {order.mpesa_transaction_code}
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-gray-200 uppercase tracking-widest">AWAITING CODE</span>
                      )}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[13px] font-black text-gray-900 leading-none mb-1 uppercase">
                      {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {new Date(order.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                        <Receipt size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[16px] font-black text-gray-900 tracking-tight">No transactions logged</p>
                      <p className="text-sm font-medium text-gray-400 mt-1">Transaction data will stream here in real-time.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards (mobile / tablet) */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <h2 className="text-sm font-black text-gray-900">Transaction Audit Log</h2>
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Latest 200</span>
        </div>
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3"><Receipt size={22} className="text-gray-300" /></div>
            <p className="text-sm font-black text-gray-900">No transactions logged</p>
          </div>
        ) : all.map(order => {
          const statusLabel = order.payment_status === 'paid' ? 'Settled' : order.payment_status === 'failed' ? 'Declined' : 'Pending'
          const statusCls = order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          const modeLabel = order.payment_method === 'mpesa_now' ? 'M-Pesa Instant' : order.payment_method === 'cod_cash' ? 'Cash on Delivery' : 'M-Pesa at Door'
          return (
            <div key={order.id} className="bg-white rounded-[22px] p-4 border border-gray-100" style={{ boxShadow: '0 2px 16px rgba(0,0,50,0.05)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black font-mono text-blue-600 leading-none">{order.order_number}</p>
                  <p className="text-[15px] font-black text-gray-900 mt-1.5 truncate">{order.guest_name ?? '—'}</p>
                  <p className="text-[11px] text-gray-400 font-bold font-mono mt-0.5">{order.guest_phone ?? '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest inline-flex ${statusCls}`}>{statusLabel}</span>
                  <p className="text-[10px] text-gray-400 font-bold mt-1.5">
                    {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} · {new Date(order.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                    {order.payment_method === 'mpesa_now' && <Smartphone size={14} className="text-green-600" />}
                    {order.payment_method === 'cod_cash' && <Banknote size={14} className="text-blue-600" />}
                    {order.payment_method === 'cod_mpesa' && <Truck size={14} className="text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{modeLabel}</p>
                    {order.mpesa_transaction_code
                      ? <p className="text-[11px] font-mono font-black text-blue-600 mt-1">{order.mpesa_transaction_code}</p>
                      : <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">Awaiting code</p>}
                  </div>
                </div>
                <p className="text-[20px] font-black font-mono text-gray-900 whitespace-nowrap">{fmt(order.total_kes)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}