'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, MinimizeIcon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'
import { usePathname } from 'next/navigation'
import { generateSessionToken } from '@/lib/utils'
import type { ChatMessage } from '@/lib/supabase/types'
import type { GeminiMessage } from '@/lib/gemini'

type DisplayMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function GeminiChatWidget() {
  const { chatOpen, openChat, closeChat, cartOpen, mobileNavOpen } = useUIStore()
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm the **Batteriq assistant** — ask me anything about EcoFlow or Bluetti products, prices, M-Pesa, delivery, or warranty, and I'll help you find the perfect power solution for your needs in Kenya. 🇰🇪",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionToken] = useState(() => generateSessionToken())
  const [history, setHistory] = useState<GeminiMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const quickReplies = [
    'Where is my order?',
    'How do I pay with M-Pesa?',
    'Do you offer bulk pricing?',
  ]

  async function sendMessage(preset?: string) {
    const msg = (preset ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    const controller = new AbortController()
    const clientTimeout = setTimeout(() => controller.abort(), 20000)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          message: msg,
          sessionHistory: history,
        }),
        signal: controller.signal,
      })

      clearTimeout(clientTimeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const reply = data.reply || "I didn't catch that — please try again."

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])

      setHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text: msg }] },
        { role: 'model', parts: [{ text: reply }] },
      ])
    } catch (error: unknown) {
      clearTimeout(clientTimeout)
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'That took too long. Please try again.' },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Try again or contact us on WhatsApp.' },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const pathname = usePathname()
  // Never show on admin routes; hide while cart drawer or mobile nav is open
  if (pathname?.startsWith('/admin')) return null
  if (cartOpen || mobileNavOpen) return null

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={openChat}
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: '#25D366', boxShadow: '0 8px 32px rgba(37,211,102,0.5)' }}
            aria-label="Chat with us"
          >
            <svg width="26" height="26" fill="white" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
              <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.11 1.51 5.842L0 24l6.335-1.628A11.944 11.944 0 0012 24c6.626 0 12-5.373 12-12S18.626 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.726.978.993-3.63-.235-.374A9.793 9.793 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden bg-black/60"
              onClick={closeChat}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-[380px] h-[85vh] md:h-[600px] flex flex-col bg-bq-gray-900 border border-bq-gray-600 md:rounded-[12px] shadow-2xl overflow-hidden"
              role="dialog"
              aria-label="Batteriq Chat Assistant"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-bq-navy border-b border-bq-gray-600 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-bq-blue rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Batteriq Chat</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span className="text-xs text-green-400">Your Energy Expert — Online</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeChat}
                  className="p-1.5 text-bq-gray-400 hover:text-white hover:bg-white/8 rounded-[6px] transition-colors"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 bg-bq-blue rounded-full flex items-center justify-center shrink-0 mt-0.5 mr-2">
                        <Bot size={14} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-[8px] text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-bq-blue text-white'
                          : 'bg-bq-gray-800 text-white border border-bq-gray-600'
                      }`}
                    >
                      <MarkdownText text={msg.content} />
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 bg-bq-blue rounded-full flex items-center justify-center shrink-0 mt-0.5 mr-2">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="bg-bq-gray-800 border border-bq-gray-600 px-4 py-3 rounded-[8px] flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-bq-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-bq-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-bq-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick replies */}
              {messages.length <= 1 && !loading && (
                <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3 shrink-0">
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="shrink-0 rounded-full border border-bq-blue/50 bg-bq-blue/10 px-3 py-1.5 text-xs font-bold text-blue-200 transition-colors hover:bg-bq-blue/25 hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-bq-gray-600 shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about power stations, solar panels…"
                    className="flex-1 px-3.5 py-2.5 bg-bq-gray-800 border border-bq-gray-600 text-white text-sm rounded-[8px] placeholder:text-bq-gray-400 focus:outline-none focus:border-bq-blue transition-colors"
                    aria-label="Chat message input"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="p-2.5 bg-bq-blue text-white rounded-[8px] hover:bg-bq-blue-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <a
                  href="https://wa.me/254716822014?text=Hi%20Batteriq!%20I%20was%20chatting%20on%20your%20website%20and%20need%20help."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                >
                  <WhatsAppIcon size={14} /> Prefer WhatsApp? Continue there
                </a>
                <p className="text-xs text-bq-gray-400 text-center mt-2">Powered by Just Codes</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function linkify(html: string) {
  return html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-blue-300 hover:text-white">$1</a>'
  )
}

function MarkdownText({ text }: { text: string }) {
  // Basic markdown: bold, bullet points, line breaks, links
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const richLine = linkify(line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5 my-0.5">
              <span className="text-bq-blue mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: richLine.replace(/^[-•]\s/, '') }} />
            </div>
          )
        }
        return (
          <span key={i}>
            <span dangerouslySetInnerHTML={{ __html: richLine }} />
            {i < lines.length - 1 && line && <br />}
          </span>
        )
      })}
    </>
  )
}
