'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'

type Props = {
  status: 'paid' | 'failed' | 'refunded' | 'pending' | 'unknown'
}

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 15 // ~60s, then stop nagging Pesapal and let the IPN finish the job

/**
 * The cart is deliberately NOT cleared before redirecting to Pesapal — if the
 * payment fails the customer would otherwise come back to an empty basket. It
 * is cleared here, once the payment is actually confirmed.
 *
 * While the payment is still pending this re-runs the server component, which
 * re-checks the status with Pesapal.
 */
export function PesapalCallbackClient({ status }: Props) {
  const router = useRouter()
  const clearCart = useCartStore(s => s.clearCart)
  const [polls, setPolls] = useState(0)

  useEffect(() => {
    if (status === 'paid') clearCart()
  }, [status, clearCart])

  useEffect(() => {
    if (status !== 'pending' || polls >= MAX_POLLS) return
    const timer = setTimeout(() => {
      setPolls(p => p + 1)
      router.refresh()
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [status, polls, router])

  if (status !== 'pending') return null

  return (
    <p className="mt-6 text-[11px] font-bold text-gray-400 leading-relaxed">
      {polls >= MAX_POLLS
        ? 'This is taking longer than usual. Your payment is safe — we will email you the moment it is confirmed. Message us on WhatsApp if you need it sooner.'
        : 'Checking with Pesapal…'}
    </p>
  )
}
