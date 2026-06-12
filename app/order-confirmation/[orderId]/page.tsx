import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package, ArrowRight, Truck, Clock, MapPin, Search } from 'lucide-react'
import { WhatsAppIcon, EmailIcon } from '@/components/ui/ContactIcons'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { formatKES } from '@/lib/utils'
import { ReviewForm } from '@/components/reviews/ReviewForm'

type PageProps = {
  params: { orderId: string }
}

const ORDER_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, desc: 'We have received your order' },
  { key: 'processing', label: 'Processing', icon: Package, desc: 'Your order is being prepared' },
  { key: 'dispatched', label: 'Dispatched', icon: Truck, desc: 'Your order is on its way' },
  { key: 'delivered', label: 'Delivered', icon: MapPin, desc: 'Order delivered successfully' },
]

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    confirmed: 0,
    pending: 0,
    processing: 1,
    dispatched: 2,
    delivered: 3,
  }
  return map[status] ?? 0
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const items = order.items as Array<{ name: string; quantity: number; price_kes: number }>
  const currentStep = getStepIndex(order.fulfillment_status || 'confirmed')

  return (
    <>
      <Header />
      <div className="pt-[72px] min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Success header */}
          <div className="text-center mb-10">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-green-500/10" style={{ transform: 'scale(1.35)' }} />
              <div className="absolute inset-0 rounded-full bg-green-500/15" style={{ transform: 'scale(1.18)' }} />
              <div className="relative w-24 h-24 rounded-[28px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00A651 0%, #00C853 100%)', boxShadow: '0 16px 48px rgba(0,166,81,0.32)' }}>
                <CheckCircle size={44} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600 mb-2.5">Order Received</p>
            <h1 className="font-black text-gray-900 tracking-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 4.5vw, 2.4rem)' }}>Order Confirmed</h1>
            <p className="text-gray-500 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
              Thank you{order.guest_name ? `, ${order.guest_name}` : ''}. Your order has been received and a receipt has been sent to your email.
            </p>
          </div>

          {/* Prominent tracking box — customer must save this */}
          <div className="bg-white rounded-3xl border-2 border-blue-600 shadow-lg p-7 mb-6"
            style={{ boxShadow: '0 8px 40px rgba(0,0,255,0.12)' }}>
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Save These to Track Your Order
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Order Number</p>
                <p className="text-2xl font-black font-mono text-blue-600 select-all">{order.order_number}</p>
                <p className="text-[10px] text-gray-400 mt-1">Click to select and copy</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Used</p>
                <p className="text-sm font-bold text-gray-900 select-all break-all">{order.guest_email}</p>
                <p className="text-[10px] text-gray-400 mt-1">Use this email to track your order</p>
              </div>
            </div>
            <Link
              href="/track-order"
              className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-blue-600 transition-all hover:bg-blue-50"
              style={{ background: 'white', border: '1.5px solid #bfdbfe' }}
            >
              <Search size={14} />
              Track this order now
            </Link>
          </div>

          {/* Order number card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Order Number</p>
                <p className="font-mono font-bold text-2xl text-bq-blue">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Payment</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  order.payment_status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${order.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                  <span className="text-gray-600 font-mono">{formatKES(Number(item.price_kes) * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-3 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-bq-blue font-mono text-lg">{formatKES(order.total_kes)}</span>
              </div>
            </div>
          </div>

          {/* Status tracker */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-widest">Order Progress</h2>
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-0" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-bq-blue transition-all duration-700"
                style={{ width: `${(currentStep / (ORDER_STEPS.length - 1)) * 100}%`, right: 'auto' }}
              />

              <div className="relative flex justify-between">
                {ORDER_STEPS.map((step, i) => {
                  const done = i <= currentStep
                  const active = i === currentStep
                  const Icon = step.icon
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 w-20">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                        done
                          ? 'bg-bq-blue border-bq-blue text-white shadow-[0_0_0_4px_rgba(37,99,235,0.1)]'
                          : 'bg-white border-gray-200 text-gray-300'
                      } ${active ? 'scale-110' : ''}`}>
                        <Icon size={18} />
                      </div>
                      <p className={`text-xs font-semibold text-center leading-tight ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <Clock size={20} className="text-bq-blue mb-3" />
              <p className="text-sm font-bold text-gray-900 mb-1">What&apos;s next?</p>
              <p className="text-xs text-gray-500 leading-relaxed">Our team will contact you within a few hours to confirm your delivery details and estimated arrival time.</p>
            </div>
            {order.guest_email ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <EmailIcon size={20} />
                <p className="text-sm font-bold text-gray-900 mb-3 mt-2">Confirmation email sent</p>
                <p className="text-xs text-gray-500 leading-relaxed">Check <span className="font-medium text-gray-700">{order.guest_email}</span> for your order confirmation.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <WhatsAppIcon size={20} />
                <p className="text-sm font-bold text-gray-900 mb-1 mt-2">Need help?</p>
                <p className="text-xs text-gray-500 leading-relaxed">WhatsApp us for instant order updates and delivery coordination.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/track-order"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-gray-900 font-semibold text-sm rounded-xl border-2 border-gray-200 hover:border-bq-blue hover:text-bq-blue transition-colors"
            >
              Track My Order
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-bq-blue text-white font-bold text-sm rounded-xl hover:bg-bq-blue-dim hover:shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all"
            >
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>

          {/* Review section — shown once order is confirmed */}
          {(order.payment_status === 'paid' || order.fulfillment_status !== 'unfulfilled') && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mt-6">
              <div className="text-center mb-6">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">
                  Your Experience
                </p>
                <h3 className="text-xl font-black text-gray-900">How did we do?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Your review helps other Kenyan customers make the right choice.
                </p>
              </div>

              <ReviewForm
                orderId={order.id}
                orderNumber={order.order_number}
                guestName={order.guest_name ?? 'Customer'}
                productNames={items.map(i => i.name).join(', ')}
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
