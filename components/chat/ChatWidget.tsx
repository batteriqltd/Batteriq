'use client'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'

const WHATSAPP_NUMBER = '254716822014'

const QUICK_MESSAGES = [
  { label: '🔋 Help me choose a power station', msg: 'Hi Batteriq! I need help choosing the right power station for my needs.' },
  { label: '☀️ Solar panel enquiry', msg: 'Hi Batteriq! I have a question about your solar panels.' },
  { label: '📦 Check order status', msg: 'Hi Batteriq! I would like to check the status of my order.' },
  { label: '💰 Get a quote', msg: 'Hi Batteriq! I would like to get a quote for a power backup system.' },
]

export function ChatWidget() {
  const { cartOpen, mobileNavOpen } = useUIStore()
  const [open, setOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Show tooltip after 4 seconds to grab attention
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // Hide tooltip when panel opens
  useEffect(() => {
    if (open) setShowTooltip(false)
  }, [open])

  function waLink(msg: string) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
  }

  // Hide the widget entirely while the cart drawer or mobile nav is open
  if (cartOpen || mobileNavOpen) return null

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-80 bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          {/* Header */}
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #00004d 0%, #0000ff 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.11 1.51 5.842L0 24l6.335-1.628A11.944 11.944 0 0012 24c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.726.978.993-3.63-.235-.374A9.793 9.793 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm">Batteriq Support</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-blue-200 text-xs">Online · Replies in minutes</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick messages */}
          <div className="p-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">
              What can we help you with?
            </p>
            <div className="space-y-2 mb-4">
              {QUICK_MESSAGES.map(({ label, msg }) => (
                <a
                  key={label}
                  href={waLink(msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-[#f0fdf4] border border-green-100 hover:bg-[#25D366] hover:border-[#25D366] group transition-all duration-200"
                >
                  <span className="text-sm font-bold text-gray-800 group-hover:text-white transition-colors flex-1">{label}</span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-green-500 group-hover:text-white transition-colors flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <a
                href={waLink('Hi Batteriq! I would like to chat with your team.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 transition-all duration-200 group"
                style={{ borderColor: '#25D366', background: '#f0fdf4' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#25D366' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4' }}
              >
                <WhatsAppIcon size={20} />
                <div className="flex-1">
                  <p className="font-black text-sm text-gray-900 group-hover:text-white transition-colors">Open WhatsApp</p>
                  <p className="text-xs text-gray-500 group-hover:text-green-100 transition-colors">+254 716 822 014</p>
                </div>
              </a>

              <a href="tel:+254716822014"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-gray-50"
                style={{ background: '#f8f9ff', border: '1px solid #e0e7ff' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#0000ff" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="text-xs font-black text-gray-900">Call us directly</p>
                  <p className="text-xs text-gray-500">0716 822 014 · Mon–Sat 8AM–6PM</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip bubble */}
      {showTooltip && !open && (
        <div className="fixed bottom-24 right-20 z-50">
          <div className="bg-white rounded-2xl px-4 py-3 shadow-xl border border-gray-100 max-w-[200px]"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <p className="text-xs font-black text-gray-900 leading-snug">👋 Need help choosing?</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Chat with us on WhatsApp</p>
            {/* Tail */}
            <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid white' }} />
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setShowTooltip(false) }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: open ? 'linear-gradient(135deg, #00004d, #0000ff)' : '#25D366',
          boxShadow: open ? '0 8px 32px rgba(0,0,255,0.4)' : '0 8px 32px rgba(37,211,102,0.5)',
          transform: open ? 'scale(0.95) rotate(0deg)' : 'scale(1)',
        }}
        aria-label="Chat with us"
      >
        {open ? (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="26" height="26" fill="white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
            <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.11 1.51 5.842L0 24l6.335-1.628A11.944 11.944 0 0012 24c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.726.978.993-3.63-.235-.374A9.793 9.793 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
          </svg>
        )}
      </button>
    </>
  )
}
