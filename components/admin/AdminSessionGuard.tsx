'use client'

import { useEffect, useState } from 'react'

/**
 * Forces the admin to re-enter the password every time the app is launched fresh.
 *
 * How it works: on a successful login we set sessionStorage['bq_admin_live'].
 * sessionStorage is per browsing session — Android wipes it when the installed
 * PWA is fully closed (swiped away). So on a cold launch the marker is gone:
 * we clear the session cookie and send the user to the login screen.
 *
 * Normal in-app navigation and background→resume keep the marker, so the admin
 * is NOT logged out while actively working.
 */
const MARKER = 'bq_admin_live'

export function AdminSessionGuard() {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let hasMarker = true
    try {
      hasMarker = !!sessionStorage.getItem(MARKER)
    } catch {
      hasMarker = true // storage blocked — don't lock the admin out in a loop
    }
    if (hasMarker) return

    // Fresh app launch with a lingering session → require the password again
    setLocked(true)
    fetch('/api/admin/auth', { method: 'DELETE' })
      .catch(() => {})
      .finally(() => {
        window.location.replace('/admin/secure-bq9x2026')
      })
  }, [])

  if (!locked) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#00002a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#4d9fff',
          animation: 'bqspin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 800, fontSize: 13, letterSpacing: '0.05em' }}>
        Locking — please sign in…
      </p>
      <style>{`@keyframes bqspin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
