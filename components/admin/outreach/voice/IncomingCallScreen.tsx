'use client'

import { Building2, Phone, PhoneOff } from 'lucide-react'
import type { OutreachLead } from '@/lib/outreach/types'
import { useVoice } from './VoiceProvider'

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function IncomingCallScreen({ leads }: { leads: OutreachLead[] }) {
  const { phase, incomingCall, answer, decline } = useVoice()

  if (phase !== 'incoming' || !incomingCall) return null

  const matchedLead = leads.find((l) => l.phone_e164 && digitsOnly(l.phone_e164) === digitsOnly(incomingCall.from))

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-16 px-6"
      style={{ background: 'linear-gradient(160deg, #001435 0%, #000f2a 100%)' }}
      role="alertdialog"
      aria-label="Incoming call"
    >
      <div className="text-center">
        <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">Incoming call</p>
        <div className="mt-8 h-24 w-24 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-white/70" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">
          {matchedLead?.business_name || 'Unknown caller'}
        </h1>
        <p className="mt-1 text-white/70 font-mono">{incomingCall.from}</p>
        {matchedLead && (
          <p className="mt-2 text-white/50 text-sm">
            {[matchedLead.category, matchedLead.city].filter(Boolean).join(' · ')}
            {matchedLead.status ? ` · ${matchedLead.status.replace('_', ' ')}` : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-10">
        <button
          type="button"
          onClick={decline}
          aria-label="Decline"
          className="h-16 w-16 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(220,38,38,0.5)] transition-transform active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={answer}
          aria-label="Answer"
          className="h-16 w-16 rounded-full bg-[#15803d] hover:bg-[#166534] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(21,128,61,0.5)] transition-transform active:scale-95 animate-pulse"
        >
          <Phone className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
