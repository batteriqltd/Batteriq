'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000      // warn 2 minutes before logout

export function useAdminAutoLogout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  const logout = useCallback(async (reason: string) => {
    console.log(`[ADMIN] Auto-logout: ${reason}`)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = `/admin/login?reason=${reason}`
  }, [])

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    warningShownRef.current = false

    // Remove any existing warning banner
    const existing = document.getElementById('admin-inactivity-warning')
    if (existing) existing.remove()

    // Set warning timer
    warningRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true

      // Show warning banner
      const banner = document.createElement('div')
      banner.id = 'admin-inactivity-warning'
      banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        background: linear-gradient(135deg, #ff6b00, #cc4400);
        color: white;
        padding: 14px 24px;
        border-radius: 16px;
        font-family: system-ui, sans-serif;
        font-weight: 800;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(255,107,0,0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideDown 0.3s ease forwards;
      `

      let secondsLeft = 120
      const updateBanner = () => {
        banner.innerHTML = `
          <span style="font-size:18px">⚠️</span>
          <span>Session expiring in <strong>${secondsLeft}s</strong> due to inactivity</span>
          <button onclick="document.getElementById('admin-inactivity-warning').remove(); window.__resetAdminTimer && window.__resetAdminTimer()"
            style="background:white;color:#cc4400;border:none;padding:6px 14px;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;margin-left:8px">
            Stay logged in
          </button>
        `
      }

      updateBanner()
      document.body.appendChild(banner)

      const countdown = setInterval(() => {
        secondsLeft -= 1
        if (secondsLeft <= 0) {
          clearInterval(countdown)
        } else if (document.getElementById('admin-inactivity-warning')) {
          updateBanner()
        } else {
          clearInterval(countdown)
        }
      }, 1000)

    }, INACTIVITY_TIMEOUT - WARNING_BEFORE)

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout('inactivity')
    }, INACTIVITY_TIMEOUT)
  }, [logout])

  useEffect(() => {
    // Expose reset function for the "Stay logged in" button
    ;(window as any).__resetAdminTimer = resetTimer

    // Activity events to listen for
    const events = [
      'mousedown', 'mousemove', 'keydown',
      'scroll', 'touchstart', 'click', 'wheel'
    ]

    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    // Start the timer
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      const banner = document.getElementById('admin-inactivity-warning')
      if (banner) banner.remove()
    }
  }, [resetTimer])
}
