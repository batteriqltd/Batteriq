'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Singleton Supabase client for realtime — created once for the browser session
let _realtimeClient: ReturnType<typeof createClient> | null = null
function getRealtimeClient() {
  if (!_realtimeClient) {
    _realtimeClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: { params: { eventsPerSecond: 2 } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
  }
  return _realtimeClient
}

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
    return 'Referral'
  } catch { return 'Direct' }
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
  if (path.startsWith('/admin')) return 'Admin'
  return 'Other'
}

export function VisitorTracker() {
  const pathname = usePathname()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const subscribedRef = useRef(false)
  const visitorIdRef = useRef('')
  const enteredAtRef = useRef(new Date().toISOString())
  const referrerRef = useRef('')

  // Mount once — create channel and subscribe
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId()
    referrerRef.current = getReferrer()
    enteredAtRef.current = new Date().toISOString()

    const supabase = getRealtimeClient()

    const channel = supabase.channel('bq_visitors', {
      config: {
        presence: { key: visitorIdRef.current },
      },
    })

    channelRef.current = channel

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true
        channel.track({
          visitorId: visitorIdRef.current,
          page: pathname,
          pageLabel: getPageLabel(pathname),
          device: getDevice(),
          referrer: referrerRef.current,
          enteredAt: enteredAtRef.current,
          updatedAt: new Date().toISOString(),
        })
      }
    })

    return () => {
      subscribedRef.current = false
      try { supabase.removeChannel(channel) } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update presence on page navigation
  useEffect(() => {
    if (!subscribedRef.current || !channelRef.current) return
    try {
      channelRef.current.track({
        visitorId: visitorIdRef.current,
        page: pathname,
        pageLabel: getPageLabel(pathname),
        device: getDevice(),
        referrer: referrerRef.current,
        enteredAt: enteredAtRef.current,
        updatedAt: new Date().toISOString(),
      })
    } catch { /* ignore */ }
  }, [pathname])

  return null
}
