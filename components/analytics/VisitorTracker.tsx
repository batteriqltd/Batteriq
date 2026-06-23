'use client'

/**
 * VisitorTracker — mounts silently on the storefront layout.
 * Uses Supabase Realtime Presence to broadcast anonymous visitor info.
 * No database writes. No cookies. No PII stored.
 * Admin sees live count + page paths in real time.
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

function generateVisitorId(): string {
  try {
    let id = sessionStorage.getItem('bq_vid')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('bq_vid', id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

function getDeviceType(): string {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  if (w < 768) return 'Mobile'
  if (w < 1024) return 'Tablet'
  return 'Desktop'
}

function getReferrer(): string {
  try {
    const ref = document.referrer
    if (!ref) return 'Direct'
    if (ref.includes('google')) return 'Google'
    if (ref.includes('facebook') || ref.includes('fb.com')) return 'Facebook'
    if (ref.includes('instagram')) return 'Instagram'
    if (ref.includes('tiktok')) return 'TikTok'
    if (ref.includes('whatsapp')) return 'WhatsApp'
    return 'Referral'
  } catch {
    return 'Direct'
  }
}

export function VisitorTracker() {
  const pathname = usePathname()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const visitorId = useRef<string>('')

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (!visitorId.current) {
      visitorId.current = generateVisitorId()
    }

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase.channel('bq_visitors', {
      config: { presence: { key: visitorId.current } },
    })

    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          visitorId: visitorId.current,
          page: pathname,
          pageLabel: getPageLabel(pathname),
          device: getDeviceType(),
          referrer: getReferrer(),
          enteredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pathname])

  return null
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
  if (path.startsWith('/compare')) return 'Compare Products'
  if (path.startsWith('/contact')) return 'Contact'
  if (path.startsWith('/support')) return 'Support'
  if (path.startsWith('/about')) return 'About'
  return path
}
