'use client'

/**
 * VisitorTracker — invisible presence heartbeat for the storefront.
 *
 * Every browser session POSTs a heartbeat to /api/track:
 *   - immediately on load
 *   - on every page navigation
 *   - every 12s while the tab stays open
 *   - a final "leave" beacon when the tab closes / is hidden
 *
 * The admin "Live Visitors" page polls /api/admin/visitors and shows every
 * session seen in the last 60s. Admin pages are NOT tracked as visitors.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_MS = 12000

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
    // Same-origin navigations shouldn't count as external referrals
    if (r.includes(window.location.host)) return 'Direct'
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
  if (path.startsWith('/track-order')) return 'Track Order'
  if (path.startsWith('/about')) return 'About'
  return 'Other'
}

export function VisitorTracker() {
  const pathname = usePathname()
  const visitorIdRef = useRef('')
  const enteredAtRef = useRef('')
  const referrerRef = useRef('')
  const pathRef = useRef(pathname)

  // Keep latest path available to the heartbeat interval without re-subscribing
  pathRef.current = pathname

  // Never track admins as storefront visitors
  const isAdmin = pathname?.startsWith('/admin')

  // Heartbeat lifecycle
  useEffect(() => {
    if (isAdmin) return
    if (!visitorIdRef.current) {
      visitorIdRef.current = getOrCreateVisitorId()
      referrerRef.current = getReferrer()
      enteredAtRef.current = new Date().toISOString()
    }

    function beat() {
      const path = pathRef.current || '/'
      const payload = JSON.stringify({
        visitorId: visitorIdRef.current,
        page: path,
        pageLabel: getPageLabel(path),
        device: getDevice(),
        referrer: referrerRef.current || 'Direct',
        enteredAt: enteredAtRef.current,
      })
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => { /* tracking must never break browsing */ })
    }

    function leave() {
      const body = JSON.stringify({ visitorId: visitorIdRef.current, leave: true })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
          return
        }
      } catch { /* fall through */ }
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }

    // Fire immediately, then on an interval
    beat()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') beat()
    }, HEARTBEAT_MS)

    // Re-beat when the tab becomes visible again
    function onVisible() { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', leave)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', leave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  // Beat on navigation (page label changes)
  useEffect(() => {
    if (isAdmin || !visitorIdRef.current) return
    const path = pathname || '/'
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: visitorIdRef.current,
        page: path,
        pageLabel: getPageLabel(path),
        device: getDevice(),
        referrer: referrerRef.current || 'Direct',
        enteredAt: enteredAtRef.current,
      }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname, isAdmin])

  return null
}
