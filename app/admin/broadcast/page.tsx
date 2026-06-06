'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Search, CheckCircle, Users, MessageSquare, Phone, ChevronDown, ChevronUp, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Customer {
  name: string
  phone: string
  email: string | null
  orderCount: number
  totalSpent: number
  lastOrder: string
}

const QUICK_TEMPLATES = [
  {
    label: '🎉 Promotion',
    text: `Hi {name}! 👋 We have an exclusive offer just for you at Batteriq. Check out our latest deals on EcoFlow power stations: https://batteriq.com 🔋`,
  },
  {
    label: '📦 Order Ready',
    text: `Hi {name}! Your Batteriq order is ready and being processed. We'll update you once it ships. Questions? Reply here or call 0716 822 014.`,
  },
  {
    label: '⚡ New Arrival',
    text: `Hi {name}! We just got new EcoFlow products in stock at Batteriq. Be the first to grab yours: https://batteriq.com 🔋✨`,
  },
  {
    label: '🙏 Follow Up',
    text: `Hi {name}! Thank you for shopping with Batteriq. We hope you're enjoying your product. Feel free to reach out if you need any support — we're always here!`,
  },
]

export default function BroadcastPage() {
  const supabase = useMemo(() => createClient(), [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('orders') as any)
        .select('guest_name, guest_phone, guest_email, total_kes, created_at')
        .not('guest_phone', 'is', null)
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      // Group by phone number
      const map = new Map<string, Customer>()
      for (const o of data) {
        const phone = (o.guest_phone || '').replace(/\s/g, '')
        if (!phone) continue
        if (map.has(phone)) {
          const c = map.get(phone)!
          c.orderCount++
          c.totalSpent += Number(o.total_kes || 0)
        } else {
          map.set(phone, {
            name: o.guest_name || 'Customer',
            phone,
            email: o.guest_email,
            orderCount: 1,
            totalSpent: Number(o.total_kes || 0),
            lastOrder: o.created_at,
          })
        }
      }
      setCustomers(Array.from(map.values()))
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(phone: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(phone) ? next.delete(phone) : next.add(phone)
      return next
    })
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.phone)))
    }
  }

  function buildWhatsAppLink(phone: string, name: string) {
    const normalized = phone.startsWith('254') ? phone : phone.replace(/^0/, '254')
    const text = message.replace('{name}', name.split(' ')[0])
    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
  }

  function sendToOne(customer: Customer) {
    if (!message.trim()) { setToast('Please write a message first'); setTimeout(() => setToast(''), 3000); return }
    window.open(buildWhatsAppLink(customer.phone, customer.name), '_blank')
    setSent(prev => [...prev, customer.phone])
  }

  async function sendToAll() {
    if (!message.trim()) { setToast('Please write a message first'); setTimeout(() => setToast(''), 3000); return }
    if (selected.size === 0) { setToast('Select at least one customer'); setTimeout(() => setToast(''), 3000); return }
    setSending(true)
    const toSend = customers.filter(c => selected.has(c.phone))
    for (const c of toSend) {
      window.open(buildWhatsAppLink(c.phone, c.name), '_blank')
      setSent(prev => [...prev, c.phone])
      await new Promise(r => setTimeout(r, 800)) // small delay between tabs
    }
    setSending(false)
    setToast(`✅ Opened ${toSend.length} WhatsApp chats!`)
    setTimeout(() => setToast(''), 4000)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-16 bg-[#f8f9fa] min-h-screen">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#00004d] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">WhatsApp Broadcast</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {customers.length} customers from order history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm text-green-600 font-black text-[11px] uppercase tracking-widest">
            <MessageSquare size={16} />
            WHATSAPP
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* LEFT — Message Composer */}
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <MessageSquare size={20} className="text-green-500" /> Compose Message
            </h2>

            {/* Quick Templates */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-[#f0fdf4] border border-green-100 text-green-700 font-black text-sm mb-4 hover:bg-green-50 transition-colors"
            >
              <span>⚡ Quick Templates</span>
              {showTemplates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-3 mb-6 overflow-hidden">
                  {QUICK_TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => { setMessage(t.text); setShowTemplates(false) }}
                      className="text-left px-4 py-3 rounded-2xl bg-[#f8f9fa] border border-gray-100 hover:border-green-300 hover:bg-[#f0fdf4] transition-all">
                      <p className="font-black text-sm text-gray-800">{t.label}</p>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{t.text.slice(0, 60)}...</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message here... Use {name} to personalise e.g. Hi {name}!"
              rows={7}
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-800 resize-none bg-[#fafafa] placeholder-gray-400"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] text-gray-400 font-bold">{message.length} characters · Use {'{name}'} for personalisation</p>
              {message && (
                <button onClick={() => setMessage('')} className="text-[11px] text-red-400 font-black flex items-center gap-1 hover:text-red-600">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Send All Button */}
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={sendToAll}
                disabled={sending}
                className="w-full h-16 rounded-[20px] bg-[#25D366] text-white font-black text-lg shadow-xl shadow-green-200 hover:translate-y-[-2px] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                <Send size={20} />
                {sending ? 'Opening chats...' : `Send to ${selected.size} customer${selected.size > 1 ? 's' : ''} on WhatsApp`}
              </button>
              <p className="text-center text-[11px] text-gray-400 font-bold mt-3">
                This opens each WhatsApp chat in a new tab with your message pre-filled
              </p>
            </motion.div>
          )}
        </div>

        {/* RIGHT — Customer List */}
        <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
          {/* Search + Select All */}
          <div className="p-4 sm:p-6 border-b border-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-3 bg-[#f8f9fa] rounded-2xl px-4 py-3">
                <Search size={16} className="text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, phone or email..."
                  className="flex-1 bg-transparent text-sm font-medium text-gray-700 placeholder-gray-400 outline-none" />
              </div>
              <button onClick={selectAll}
                className="h-12 px-5 rounded-2xl bg-[#00004d] text-white font-black text-xs flex items-center gap-2 hover:bg-[#000080] transition-colors whitespace-nowrap">
                <Users size={14} />
                {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <span>{filtered.length} customers</span>
              {selected.size > 0 && <span className="text-green-600">{selected.size} selected</span>}
              {sent.length > 0 && <span className="text-blue-600">{sent.length} sent</span>}
            </div>
          </div>

          {/* Customer List */}
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-bold">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-bold">No customers found</div>
            ) : (
              filtered.map(c => {
                const isSelected = selected.has(c.phone)
                const isSent = sent.includes(c.phone)
                return (
                  <div key={c.phone}
                    onClick={() => toggleSelect(c.phone)}
                    className={`flex items-center gap-4 px-6 py-4 border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-[#f0fdf4]' : 'hover:bg-gray-50'}`}>
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-[#00004d] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-sm">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                        <Phone size={10} /> {c.phone}
                      </p>
                    </div>
                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black text-gray-700">KES {c.totalSpent.toLocaleString('en-KE')}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{c.orderCount} order{c.orderCount > 1 ? 's' : ''}</p>
                    </div>
                    {/* Send single */}
                    <button
                      onClick={e => { e.stopPropagation(); sendToOne(c) }}
                      className={`ml-2 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSent ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'}`}
                      title="Send WhatsApp"
                    >
                      {isSent ? <CheckCircle size={16} /> : <Send size={14} />}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
