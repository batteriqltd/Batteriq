'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, MinimizeIcon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
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
      content: "Hi! I'm **Batteriq AI** — your expert energy consultant. Ask me anything about EcoFlow or Bluetti products, and I'll help you find the perfect power solution for your needs in Kenya. 🇰🇪",
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

  async function sendMessage() {
    const msg = input.trim()
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
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-bq-blue text-white font-bold rounded-full shadow-blue-glow hover:bg-bq-blue-dim hover:shadow-blue-glow-lg transition-all"
            aria-label="Open AI sales assistant"
          >
            <Bot size={20} />
            <span className="text-sm">Ask AI</span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
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
              aria-label="Batteriq AI Sales Assistant"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-bq-navy border-b border-bq-gray-600 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-bq-blue rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Batteriq AI</p>
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
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="p-2.5 bg-bq-blue text-white rounded-[8px] hover:bg-bq-blue-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <p className="text-xs text-bq-gray-400 text-center mt-2">Powered by Just Codes</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function MarkdownText({ text }: { text: string }) {
  // Basic markdown: bold, bullet points, line breaks
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const boldLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5 my-0.5">
              <span className="text-bq-blue mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: boldLine.replace(/^[-•]\s/, '') }} />
            </div>
          )
        }
        return (
          <span key={i}>
            <span dangerouslySetInnerHTML={{ __html: boldLine }} />
            {i < lines.length - 1 && line && <br />}
          </span>
        )
      })}
    </>
  )
}
