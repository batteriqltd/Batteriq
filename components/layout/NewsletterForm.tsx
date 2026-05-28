'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newsletterSchema } from '@/lib/validators'
import { showToast } from '@/components/ui/Toast'
import type { z } from 'zod'

type FormData = z.infer<typeof newsletterSchema>

export function NewsletterForm() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(newsletterSchema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        showToast('Subscribed! Check your inbox.', 'success')
        reset()
      } else {
        const body = await res.json()
        showToast(body.error ?? 'Subscription failed. Try again.', 'error')
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="flex gap-2">
        <input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
          className="flex-1 px-3 py-2.5 bg-bq-gray-800 border border-bq-gray-600 text-white text-sm rounded-[6px] placeholder:text-bq-gray-400 focus:outline-none focus:border-bq-blue transition-colors"
          aria-label="Email address for newsletter"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 bg-bq-blue text-white text-sm font-bold rounded-[6px] hover:bg-bq-blue-dim transition-colors disabled:opacity-50 min-w-[80px]"
        >
          {loading ? '…' : 'Subscribe'}
        </button>
      </div>
      {errors.email && (
        <p className="text-xs text-red-400">{errors.email.message}</p>
      )}
    </form>
  )
}
