'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Africastalking, { type VoiceClient } from 'africastalking-client'

type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'active'

export interface IncomingCallInfo {
  from: string
  sessionId: string | null
}

interface VoiceContextValue {
  /** false until a capability token has been fetched and the client connects. */
  ready: boolean
  /** false if Africa's Talking isn't configured at all (no env vars) — the
   *  dialer/presence UI should show a clear "not connected" state instead
   *  of silently doing nothing. */
  configured: boolean
  phase: CallPhase
  incomingCall: IncomingCallInfo | null
  activeNumber: string | null
  elapsedSeconds: number
  muted: boolean
  onHold: boolean
  call: (number: string, leadId?: string) => void
  answer: () => void
  decline: () => void
  hangup: () => void
  toggleMute: () => void
  toggleHold: () => void
  dtmf: (digit: string) => void
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

export function useVoice() {
  const ctx = useContext(VoiceContext)
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider')
  return ctx
}

function genLocalSessionId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState(true) // optimistic until the token call tells us otherwise
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<CallPhase>('idle')
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null)
  const [activeNumber, setActiveNumber] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [onHold, setOnHold] = useState(false)

  const clientRef = useRef<VoiceClient | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reportEvent = useCallback((event: string, extra: Record<string, unknown> = {}) => {
    if (!sessionIdRef.current) return
    fetch('/api/outreach/voice/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current, event, ...extra }),
    }).catch(() => {})
  }, [])

  const startTimer = useCallback(() => {
    setElapsedSeconds(0)
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const resetCallState = useCallback(() => {
    stopTimer()
    setPhase('idle')
    setIncomingCall(null)
    setActiveNumber(null)
    setMuted(false)
    setOnHold(false)
    sessionIdRef.current = null
  }, [stopTimer])

  useEffect(() => {
    let cancelled = false

    async function connect() {
      try {
        const res = await fetch('/api/outreach/voice/token', { method: 'POST' })
        if (res.status === 503) {
          if (!cancelled) setConfigured(false)
          return
        }
        if (!res.ok) return
        const { token } = await res.json()
        if (cancelled || !token) return

        const client = new Africastalking.Client(token)
        clientRef.current = client

        client.on('ready', () => { if (!cancelled) setReady(true) })
        client.on('notready', () => { if (!cancelled) setReady(false) })
        client.on('offline', () => { if (!cancelled) setReady(false) })
        client.on('closed', () => { if (!cancelled) setReady(false) })

        client.on('incomingcall', (params) => {
          if (cancelled) return
          const from = String(params.from || 'Unknown')
          // Africa's Talking's own sessionId, when the client exposes it —
          // falls back to null (the events endpoint then correlates by
          // caller number + most-recent-ringing-call instead).
          const sid = typeof params.sessionId === 'string' ? params.sessionId : null
          sessionIdRef.current = sid
          setIncomingCall({ from, sessionId: sid })
          setPhase('incoming')
        })

        client.on('callaccepted', () => {
          if (cancelled) return
          setPhase('active')
          setIncomingCall((prev) => {
            if (prev) setActiveNumber(prev.from)
            return null
          })
          startTimer()
          reportEvent('answered')
        })

        client.on('hangup', () => {
          if (cancelled) return
          reportEvent('ended')
          resetCallState()
        })
      } catch {
        /* token fetch failed — stays not-ready, UI shows disconnected state */
      }
    }

    connect()
    return () => {
      cancelled = true
      clientRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const call = useCallback((number: string, leadId?: string) => {
    if (!clientRef.current || !ready) return
    const sid = genLocalSessionId()
    sessionIdRef.current = sid
    setActiveNumber(number)
    setPhase('outgoing')
    clientRef.current.call(number)
    fetch('/api/outreach/voice/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, event: 'call_started', toNumber: number, leadId }),
    }).catch(() => {})
    startTimer() // optimistic — ring time still counts for an outbound attempt
  }, [ready, startTimer])

  const answer = useCallback(() => {
    clientRef.current?.answer()
  }, [])

  const decline = useCallback(() => {
    clientRef.current?.hangup()
    resetCallState()
  }, [resetCallState])

  const hangup = useCallback(() => {
    clientRef.current?.hangup()
    reportEvent('ended')
    resetCallState()
  }, [reportEvent, resetCallState])

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return
    if (muted) clientRef.current.unmute()
    else clientRef.current.mute()
    setMuted((m) => !m)
  }, [muted])

  const toggleHold = useCallback(() => {
    if (!clientRef.current) return
    if (onHold) clientRef.current.unhold()
    else clientRef.current.hold()
    setOnHold((h) => !h)
  }, [onHold])

  const dtmf = useCallback((digit: string) => {
    clientRef.current?.dtmf(digit)
  }, [])

  return (
    <VoiceContext.Provider
      value={{
        ready,
        configured,
        phase,
        incomingCall,
        activeNumber,
        elapsedSeconds,
        muted,
        onHold,
        call,
        answer,
        decline,
        hangup,
        toggleMute,
        toggleHold,
        dtmf,
      }}
    >
      {children}
    </VoiceContext.Provider>
  )
}
