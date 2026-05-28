'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, CheckCircle, XCircle } from 'lucide-react'

type MpesaWaitingProps = {
  phone: string
  orderId: string
  onSuccess: () => void
  onFailure: () => void
}

export function MpesaWaiting({ phone, orderId, onSuccess, onFailure }: MpesaWaitingProps) {
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [status, setStatus] = useState<'waiting' | 'paid' | 'failed'>('waiting')

  // Countdown timer
  useEffect(() => {
    if (status !== 'waiting') return
    if (secondsLeft <= 0) {
      onFailure()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, status, onFailure])

  // Poll order payment status
  useEffect(() => {
    if (status !== 'waiting') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.payment_status === 'paid') {
            setStatus('paid')
            setTimeout(onSuccess, 1200)
          } else if (data.payment_status === 'failed') {
            setStatus('failed')
            setTimeout(onFailure, 1200)
          }
        }
      } catch {
        // Network error — keep polling
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [orderId, status, onSuccess, onFailure])

  const displayPhone = phone.replace(/^254/, '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
  const progress = ((120 - secondsLeft) / 120) * 100

  return (
    <div className="flex flex-col items-center text-center py-10 px-6 space-y-8 bg-white rounded-3xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.01),0_12px_32px_-4px_rgba(15,23,42,0.03)] max-w-sm mx-auto">
      {status === 'waiting' && (
        <>
          {/* Animated phone with pulsing ring */}
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-24 h-24 bg-blue-600 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              className="absolute w-24 h-24 bg-blue-600 rounded-full"
            />
            <div className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
              <Smartphone size={32} className="text-blue-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Check your phone</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              An M-Pesa STK Push has been sent to
            </p>
            <p className="font-mono text-lg font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100 inline-block">{displayPhone}</p>
            <p className="text-slate-400 text-xs font-medium">Enter your M-Pesa PIN to complete payment.</p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs pt-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              <span>Waiting for PIN…</span>
              <span className="font-mono text-blue-600">{secondsLeft}s</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-medium max-w-[200px] leading-normal">
            Didn&apos;t receive the prompt? Check your M-Pesa balance or contact support.
          </p>
        </>
      )}

      {status === 'paid' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 text-green-600">
            <CheckCircle size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Payment Confirmed</h3>
            <p className="text-slate-400 text-sm font-medium">Redirecting to your secure confirmation…</p>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-green-600 animate-spin" />
        </motion.div>
      )}

      {status === 'failed' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 text-red-600">
            <XCircle size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Payment Failed</h3>
            <p className="text-slate-400 text-sm font-medium">The transaction could not be completed.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all"
          >
            Try Again
          </button>
        </motion.div>
      )}
    </div>
  )
}
