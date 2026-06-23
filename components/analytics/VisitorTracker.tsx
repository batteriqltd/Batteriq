'use client'

/**
 * VisitorTracker — silent storefront component.
 * Uses Supabase Realtime Presence so the admin sees live visitor count,
 * current page, device type, time on site, and traffic source.
 * No database writes. No cookies. No personal data stored.
 * Never renders anything visible.
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

function getOrCreateVisitorId(): string {
  try {
    let id = sessionStorage.getItem('bq_vid')
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      sessionStorage.setItem('bq_vid', id)
    }
    return id
  } catch {
    return `v_${Math.random().toString(36).slice(2)}`
  }
}

function getDevice(): string {
  if (typeof window === 'undefined') return 'Desktop'
  if (window.innerWidth < 768) return 'Mobile'
  if (window.innerWidth < 1024) return 'Tablet'
  return 'Desktop'
}

function getReferrer(): string {
  try {
    const r = document.referrer
    if (!r) return 'Direct'
    if (r.includes('google')) return 'Google'
    if (r.includes('facebook') || r.includes('fb.com')) return 'Facebook'
    if (r.includes('instagram')) return 'Instagram'
    if (r.includes('tiktok')) return 'TikTok'
    if (r.includes('whatsapp')) return 'WhatsApp'
    if (r.includes('twitter') || r.includes('x.com')) return 'Twitter/X'
    if (r.includes('youtube')) return 'YouTube'
    if (r.includes('linkedin')) return 'LinkedIn'
    return 'Referral'
  } catch {
    return 'Direct'
  }
}

function getPageLabel(path: string): string {
  if (path === '/') return 'Homepage'
  if (path.startsWith('/ecoflow-kenya')) return 'EcoFlow Kenya'
  if (path.startsWith('/ecoflow/')) return 'Product — EcoFlow'
  if (path.startsWith('/ecoflow')) return 'EcoFlow Collection'
  if (path.startsWith('/bluetti/')) return 'Product — BLUETTI'
  if (path.startsWith('/bluetti')) return 'BLUETTI Collection'
  if (path.startsWith('/power-stations')) return 'Power Stations'
  if (path.startsWith('/solar')) return 'Solar Panels'
  if (path.startsWith('/accessories')) return 'Accessories'
  if (path.startsWith('/cart')) return 'Cart'
  if (path.startsWith('/checkout')) return 'Checkout'
  if (path.startsWith('/order-confirmation')) return 'Order Confirmed'
  if (path.startsWith('/compare')) return 'Compare'
  if (path.startsWith('/contact')) return 'Contact'
  if (path.startsWith('/support')) return 'Support'
  if (path.startsWith('/about')) return 'About'
  return 'Other'
}

export function VisitorTracker() {
  const pathname = usePathname()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const enteredAtRef = useRef<string>(new Date().toISOString())
  const visitorId = useRef<string>('')
  const referrer = useRef<string>('')

  // One-time setup
  useEffect(() => {
    visitorId.current = getOrCreateVisitorId()
    referrer.current = getReferrer()
    enteredAtRef.current = new Date().toISOString()
  }, [])

  // Track page changes
  useEffect(() => {
    if (!visitorId.current) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Reuse the same channel — just update the presence state on page change
    if (!channelRef.current) {
      const ch = supabase.channel('bq_visitors', {
        config: { presence: { key: visitorId.current } },
      })
      channelRef.current = ch

      ch.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({
            visitorId: visitorId.current,
            page: pathname,
            pageLabel: getPageLabel(pathname),
            device: getDevice(),
            referrer: referrer.current,
            enteredAt: enteredAtRef.current,
            updatedAt: new Date().toISOString(),
          })
        }
      })
    } else {
      // Already subscribed — just update the presence payload
      channelRef.current.track({
        visitorId: visitorId.current,
        page: pathname,
        pageLabel: getPageLabel(pathname),
        device: getDevice(),
        referrer: referrer.current,
        enteredAt: enteredAtRef.current,
        updatedAt: new Date().toISOString(),
      }).catch(() => {})
    }

    return () => {
      // Only fully unsubscribe when the component unmounts (tab close / navigate away)
      // On route changes we keep the channel alive and just update the payload
    }
  }, [pathname])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  return null // renders nothing visible
}
