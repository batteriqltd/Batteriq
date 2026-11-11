'use client'

import { Mic, MicOff, Pause, Phone, PhoneOff, Play } from 'lucide-react'
import { useVoice } from './VoiceProvider'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Persistent across every tab while a call is active or ringing out. */
export function MiniCallBar() {
  const { phase, activeNumber, elapsedSeconds, muted, onHold, toggleMute, toggleHold, hangup } = useVoice()

  if (phase !== 'active' && phase !== 'outgoing') return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-[150] flex items-center justify-between gap-3 px-4 sm:px-6 h-12"
      style={{ background: '#001435' }}
      role="status"
    >
      <div className="flex items-center gap-2.5 min-w-0 text-white">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${phase === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
        <span className="font-mono text-[13px] truncate">{activeNumber || 'Unknown'}</span>
        <span className="text-white/50 text-[12px] font-mono tabular-nums">
          {phase === 'active' ? formatElapsed(elapsedSeconds) : 'Ringing…'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {phase === 'active' && (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white text-[#001435]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleHold}
              aria-label={onHold ? 'Resume' : 'Hold'}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${onHold ? 'bg-white text-[#001435]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              {onHold ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={hangup}
          aria-label="Hang up"
          className="h-8 w-8 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Small status pill for places that just need to show "on a call" without full controls. */
export function CallBadge() {
  const { phase } = useVoice()
  if (phase === 'idle') return null
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
      <Phone className="w-3 h-3" /> On call
    </span>
  )
}
