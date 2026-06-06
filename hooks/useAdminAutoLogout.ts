'use client'
import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000
const WARNING_BEFORE = 2 * 60 * 1000
const ACTIVITY_KEY = 'batteriq_admin_last_activity'

export function useAdminAutoLogout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  const logout = useCallback(async (reason: string) => {
    sessionStorage.removeItem(ACTIVITY_KEY)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = `/admin/secure-bq9x2026?reason=${reason}`
  }, [])

  const resetTimer = useCallback(() => {
    sessionStorage.setItem(ACTIVITY_KEY, Date.now().toString())

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    warningShownRef.current = false

    const existing = document.getElementById('admin-inactivity-warning')
    if (existing) existing.remove()

    warningRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true

      const banner = document.createElement('div')
      banner.id = 'admin-inactivity-warning'
      banner.style.cssText = `
        position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;
        background:linear-gradient(135deg,#ff6b00,#cc4400);color:white;
        padding:14px 24px;border-radius:16px;font-family:system-ui,sans-serif;
        font-weight:800;font-size:14px;box-shadow:0 8px 32px rgba(255,107,0,0.4);
        display:flex;align-items:center;gap:12px;
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
        if (secondsLeft <= 0) clearInterval(countdown)
        else if (document.getElementById('admin-inactivity-warning')) updateBanner()
        else clearInterval(countdown)
      }, 1000)

    }, INACTIVITY_TIMEOUT - WARNING_BEFORE)

    timeoutRef.current = setTimeout(() => {
      logout('inactivity')
    }, INACTIVITY_TIMEOUT)
  }, [logout])

  useEffect(() => {
    // On page load/refresh: check if prior activity exists in sessionStorage
    const lastActivity = sessionStorage.getItem(ACTIVITY_KEY)
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10)
      if (elapsed >= INACTIVITY_TIMEOUT) {
        // Was idle too long — log out immediately without restarting timers
        logout('inactivity')
        return
      }
      // Was active recently — resume from where we left off (sessionStorage survives refresh)
    }

    ;(window as unknown as Record<string, unknown>).__resetAdminTimer = resetTimer

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      const banner = document.getElementById('admin-inactivity-warning')
      if (banner) banner.remove()
    }
  }, [resetTimer, logout])
}
