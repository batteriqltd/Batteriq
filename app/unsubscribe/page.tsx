'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ShieldCheck, MailX, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ToastContainer } from '@/components/ui/Toast'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const alreadyDone = searchParams.get('done') === '1'
  const maskedFromQuery = searchParams.get('email')

  const [emailInput, setEmailInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>(
    alreadyDone ? 'done' : token ? 'processing' : 'idle'
  )
  const [maskedEmail, setMaskedEmail] = useState<string | null>(maskedFromQuery)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token || alreadyDone) return

    let cancelled = false
    fetch('/api/outreach/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) {
          setMaskedEmail(data.maskedEmail || null)
          setStatus('done')
        } else {
          setErrorMsg(data.error || 'Could not verify unsubscribe link. Enter your email below.')
          setStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg('Network error. Please enter your email below to unsubscribe.')
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, alreadyDone])

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput.trim()) return
    setStatus('processing')
    setErrorMsg('')

    try {
      const res = await fetch('/api/outreach/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMaskedEmail(data.maskedEmail || emailInput.trim())
        setStatus('done')
      } else {
        setErrorMsg(data.error || 'Unable to process request')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Connection error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-[75vh] bg-[#f8f9fc] flex items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-xl shadow-blue-950/5">
        <div className="text-center mb-6">
          <span className="text-xl font-black text-[#00004d] tracking-tight">
            BATTERIQ<sup className="text-[10px] text-blue-600">™</sup>
          </span>
        </div>

        {status === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900">Processing your opt-out…</h1>
            <p className="text-sm text-gray-500 mt-2">
              Adding your address to our permanent suppression registry.
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              You&apos;re Unsubscribed
            </h1>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              {maskedEmail ? (
                <>
                  <strong>{maskedEmail}</strong> has been permanently added to our suppression list.
                </>
              ) : (
                <>Your email address has been permanently added to our suppression list.</>
              )}{' '}
              You will not receive further outreach emails from Batteriq Kenya.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Honored permanently in compliance with Kenya&apos;s Data Protection Act (2019).
              </p>
            </div>
            <Link
              href="/"
              className="inline-block mt-8 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
            >
              Return to batteriq.com →
            </Link>
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <MailX className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
              Unsubscribe from Outreach
            </h1>
            <p className="text-sm text-gray-500 text-center mt-2 mb-6">
              Enter your business email below to permanently opt out of Batteriq outreach messages.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="info@yourcompany.co.ke"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#00004d] hover:bg-blue-700 text-white font-bold text-sm transition-colors"
              >
                Unsubscribe Permanently
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <>
      <Header />
      <ToastContainer />
      <Suspense fallback={<div className="min-h-[75vh] bg-[#f8f9fc]" />}>
        <UnsubscribeContent />
      </Suspense>
      <Footer />
    </>
  )
}
