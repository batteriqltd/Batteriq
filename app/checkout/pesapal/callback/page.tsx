// Where Pesapal sends the customer's browser back after they finish (or abandon)
// the card payment.
//
// The URL query is only a hint about WHICH transaction to look at — the status
// shown here is re-fetched from Pesapal server-side, exactly like the IPN does,
// so a customer cannot reach a "paid" screen by editing the address bar.

import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'
import { formatKesExact } from '@/lib/cardFee'
import { syncPesapalTransaction } from '@/lib/pesapalSync'
import { createAdminClient } from '@/lib/supabase/admin'
import { PesapalCallbackClient } from './_PesapalCallbackClient'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: {
    OrderTrackingId?: string
    OrderMerchantReference?: string
  }
}

type Resolved = {
  status: 'paid' | 'failed' | 'refunded' | 'pending' | 'unknown'
  orderId: string | null
  orderNumber: string | null
  reference: string | null
  reason: string | null
}

async function resolve(searchParams: PageProps['searchParams']): Promise<Resolved> {
  const empty: Resolved = {
    status: 'unknown', orderId: null, orderNumber: null, reference: null, reason: null,
  }

  const orderTrackingId = searchParams.OrderTrackingId?.trim()
  if (!orderTrackingId) return empty

  try {
    const result = await syncPesapalTransaction({
      orderTrackingId,
      merchantReference: searchParams.OrderMerchantReference ?? null,
    })
    return {
      status: result.status,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      reference: result.confirmationCode,
      reason: result.statusDescription,
    }
  } catch (err) {
    // Never show a hard error here — the IPN is the source of truth and may
    // simply not have landed yet. Keep the customer on a calm "checking" state.
    console.error('[PESAPAL] Callback page could not resolve payment:', err instanceof Error ? err.message : err)
    return { ...empty, status: 'pending' }
  }
}

export default async function PesapalCallbackPage({ searchParams }: PageProps) {
  const result = await resolve(searchParams)

  // The order row carries the authoritative amounts for the receipt line.
  let charged: number | null = null
  let fee: number | null = null
  let subtotal: number | null = null
  let email: string | null = null

  if (result.orderId) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('orders')
      .select('guest_email, total_kes, card_fee_kes, total_charged_kes')
      .eq('id', result.orderId)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any
    if (row) {
      email = row.guest_email ?? null
      subtotal = Number(row.total_kes) || 0
      fee = Number(row.card_fee_kes) || 0
      charged = Number(row.total_charged_kes) || subtotal
    }
  }

  const isPaid = result.status === 'paid'
  const isFailed = result.status === 'failed' || result.status === 'refunded'

  return (
    <>
      <Header />
      <main className="checkout-bg min-h-screen flex items-center justify-center px-4 py-24">
        <div className="bg-white rounded-[32px] p-8 sm:p-12 max-w-md w-full text-center shadow-2xl border border-[#f0f0f0]">

          {isPaid && (
            <>
              <div
                className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00A651 0%, #00C853 100%)', boxShadow: '0 16px 48px rgba(0,166,81,0.35)' }}
              >
                <CheckCircle size={44} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">Payment Successful</h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                Your card payment has been confirmed. A receipt is on its way to your email.
              </p>
            </>
          )}

          {isFailed && (
            <>
              <div className="w-24 h-24 rounded-[32px] bg-red-50 flex items-center justify-center mx-auto mb-8 border border-red-100">
                <AlertCircle className="text-red-500 w-12 h-12" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#00004d] tracking-tight mb-3">Payment Not Completed</h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                {result.reason
                  ? `Pesapal reported: ${result.reason}.`
                  : 'Your card payment was not completed.'}{' '}
                No money has been taken. You can try again or pay with M-Pesa.
              </p>
            </>
          )}

          {!isPaid && !isFailed && (
            <>
              <div className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center bg-blue-50 border border-blue-100">
                <Loader2 size={40} className="text-[#0000ff] animate-spin" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#00004d] tracking-tight mb-3">Checking Your Payment</h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                We are confirming this with Pesapal. This page updates on its own — please do not close it.
              </p>
            </>
          )}

          {result.orderNumber && (
            <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-5 mb-6 text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Order</span>
                <span className="font-mono font-black text-gray-900 text-sm select-all">{result.orderNumber}</span>
              </div>
              {subtotal !== null && fee !== null && charged !== null && fee > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                    <span className="font-mono text-gray-700 text-sm">{formatKesExact(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Card fee</span>
                    <span className="font-mono text-gray-700 text-sm">{formatKesExact(fee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
                      {isPaid ? 'Total paid' : 'Total'}
                    </span>
                    <span className="font-mono font-black text-[#00004d] text-base">{formatKesExact(charged)}</span>
                  </div>
                </>
              )}
              {result.reference && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Card ref</span>
                  <span className="font-mono text-gray-700 text-xs select-all">{result.reference}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {isPaid && result.orderId && (
              <Link
                href={`/order-confirmation/${result.orderId}${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                className="w-full h-[56px] rounded-[20px] bg-[#00004d] text-white font-black text-[15px] flex items-center justify-center transition-all hover:brightness-110"
              >
                View My Order
              </Link>
            )}
            {isFailed && (
              <Link
                href="/checkout"
                className="w-full h-[56px] rounded-[20px] bg-[#00004d] text-white font-black text-[15px] flex items-center justify-center transition-all hover:brightness-110"
              >
                Back to Checkout
              </Link>
            )}
            {result.status === 'unknown' && (
              <Link
                href="/track-order"
                className="w-full h-[56px] rounded-[20px] bg-[#00004d] text-white font-black text-[15px] flex items-center justify-center transition-all hover:brightness-110"
              >
                Track My Order
              </Link>
            )}
            <a
              href="https://wa.me/254716822014"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[56px] rounded-[20px] bg-white border-2 border-[#e5e7eb] text-gray-700 font-black text-[15px] flex items-center justify-center gap-2 transition-all hover:border-[#00A651] hover:text-[#00A651]"
            >
              <WhatsAppIcon size={18} /> Need help? WhatsApp us
            </a>
          </div>

          <PesapalCallbackClient status={result.status} />
        </div>
      </main>
      <Footer />
    </>
  )
}
