import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// ── Client component — needs useState/fetch ──────────────────────────────────
import { SendInvoiceButton } from './_SendInvoiceButton'
import { PrintReceiptButton } from './_PrintReceiptButton'
import { DownloadReceiptButton } from './_DownloadReceiptButton'

import { ArrowLeft, CheckCircle, Clock, Truck, Package, CreditCard, MapPin, Phone, Mail, Printer, Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(n: number | string) { return `KES ${Number(n || 0).toLocaleString('en-KE')}` }

export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase.from('orders') as any)
    .select('*')
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const timeline = [
    { label: 'Order Placed', time: order.created_at, done: true, icon: Package },
    { label: 'Payment Confirmed', time: order.payment_status === 'paid' ? order.updated_at : null, done: order.payment_status === 'paid', icon: CreditCard },
    { label: 'Processing', time: ['processing', 'shipped', 'delivered'].includes(order.fulfillment_status) ? order.updated_at : null, done: ['processing', 'shipped', 'delivered'].includes(order.fulfillment_status), icon: Clock },
    { label: 'Shipped', time: ['shipped', 'delivered'].includes(order.fulfillment_status) ? order.updated_at : null, done: ['shipped', 'delivered'].includes(order.fulfillment_status), icon: Truck },
    { label: 'Delivered', time: order.fulfillment_status === 'delivered' ? order.updated_at : null, done: order.fulfillment_status === 'delivered', icon: CheckCircle },
  ]

  const total = Number(order.total_kes) || 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = order.items ?? []
  const delivery = order.delivery_address ?? {}

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 hover:border-blue-400 transition-all">
            <ArrowLeft size={16} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>
              Order {order.order_number}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date(order.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DownloadReceiptButton orderId={order.id} orderNumber={order.order_number} />
          <PrintReceiptButton orderId={order.id} orderNumber={order.order_number} />
          <SendInvoiceButton orderId={order.id} email={order.guest_email} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 space-y-5">

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <h2 className="font-black text-gray-900 mb-6">Order Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
              <div className="space-y-6">
                {timeline.map((step, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      step.done ? 'text-white' : 'bg-gray-100 text-gray-300'
                    }`}
                    style={step.done ? { background: 'linear-gradient(135deg, #0000ff, #00004d)' } : {}}>
                      <step.icon size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-sm font-bold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                      {step.time && <p className="text-xs text-gray-400 mt-0.5">{new Date(step.time).toLocaleString('en-KE')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-900">Items Ordered ({items.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
                    {item.brand === 'EcoFlow' ? 'EF' : 'BT'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#0000ff' }}>{item.brand}</p>
                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 font-mono">{fmt(Number(item.price_kes) * item.quantity)}</p>
                    <p className="text-xs text-gray-400 font-mono">{fmt(item.price_kes)} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-900">Total</span>
                <span className="text-xl font-black font-mono" style={{ color: '#0000ff' }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-black text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {order.payment_status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                </span>
                {order.mpesa_transaction_code && (
                  <p className="text-xs font-mono text-green-700 mt-1">Ref: {order.mpesa_transaction_code}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Fulfillment</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                  {order.fulfillment_status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Method</p>
                <p className="text-sm font-bold text-gray-900">
                  {order.payment_method === 'mpesa_now' ? 'M-Pesa (Pay Now)'
                    : order.payment_method === 'cod_cash' ? 'Cash on Delivery'
                    : 'M-Pesa at Doorstep'}
                </p>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-black text-gray-900 mb-4">Customer</h3>
            <div className="space-y-3">
              <p className="font-bold text-gray-900">{order.guest_name}</p>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Phone size={13} style={{ color: '#0000ff' }} />
                <a href={`tel:${order.guest_phone}`} className="hover:text-blue-600">{order.guest_phone}</a>
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Mail size={13} style={{ color: '#0000ff' }} />
                <a href={`mailto:${order.guest_email}`} className="hover:text-blue-600 break-all">{order.guest_email}</a>
              </p>
              {delivery.street && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>
                      {delivery.street}<br />
                      {delivery.city}{delivery.county ? `, ${delivery.county}` : ''}
                      {delivery.instructions && (
                        <><br /><em className="text-gray-400">&ldquo;{delivery.instructions}&rdquo;</em></>
                      )}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-black text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {order.guest_phone && (
                <a href={`https://wa.me/${(order.guest_phone as string).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: '#25D366' }}>
                  WhatsApp Customer
                </a>
              )}
              {order.guest_email && (
                <a href={`mailto:${order.guest_email}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}>
                  Email Customer
                </a>
              )}
              <Link href="/admin/orders"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                Back to Orders
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
