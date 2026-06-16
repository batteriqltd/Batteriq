'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminNotify } from '@/components/admin/AdminNotify'
import {
  Send, Search, CheckCircle, Users, MessageSquare,
  Phone, ChevronDown, ChevronUp, X, Plus, Trash2,
  UserPlus, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Customer {
  name: string
  phone: string
  email: string | null
  orderCount: number
  totalSpent: number
  source: 'orders' | 'manual'
}

const QUICK_TEMPLATES = [
  {
    label: 'Promotion',
    icon: '🎁',
    description: 'Exclusive deal offer',
    text: `Hi {name}! We have an exclusive offer just for you at Batteriq. Check out our latest deals on EcoFlow power stations and solar panels. Visit batteriq.com to see all current prices. Reply to this message or call 0716 822 014 for assistance.`,
  },
  {
    label: 'Order Ready',
    icon: '📦',
    description: 'Order processed',
    text: `Hi {name}! Your Batteriq order is ready and being processed for delivery. We will update you once it ships. For any questions, reply here or call us on 0716 822 014. Thank you for choosing Batteriq!`,
  },
  {
    label: 'New Arrival',
    icon: '✨',
    description: 'New stock alert',
    text: `Hi {name}! Great news — we have new EcoFlow and BLUETTI products just arrived in stock at Batteriq. Be among the first to get yours. Pay with M-Pesa, same-day Nairobi delivery. Visit batteriq.com to order now.`,
  },
  {
    label: 'Follow Up',
    icon: '🤝',
    description: 'After-sale check-in',
    text: `Hi {name}! Thank you for shopping with Batteriq. We hope you are enjoying your product. If you need any support or have questions, we are always available. Just reply here or call 0716 822 014.`,
  },
  {
    label: 'Payment Reminder',
    icon: '💳',
    description: 'Pending payment nudge',
    text: `Hi {name}! This is a reminder that your Batteriq order has a pending payment. You can pay via M-Pesa Paybill 303030, Account 3753#. Once paid, please send your confirmation to this number. Call 0716 822 014 for help.`,
  },
  {
    label: 'Restock Alert',
    icon: '🔔',
    description: 'Back in stock',
    text: `Hi {name}! Good news — the EcoFlow product you were interested in is back in stock at Batteriq. Limited units available. Pay with M-Pesa and get same-day delivery in Nairobi. Visit batteriq.com or call 0716 822 014 to order.`,
  },
]

export default function BroadcastPage() {
  const supabase = useMemo(() => createClient(), [])
  const { notify } = useAdminNotify()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  // Manual number entry
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('orders') as any)
        .select('guest_name, guest_phone, guest_email, total_kes, created_at')
        .not('guest_phone', 'is', null)
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const map = new Map<string, Customer>()
      for (const o of data) {
        const raw = (o.guest_phone || '').replace(/\s/g, '')
        if (!raw) continue
        const phone = normalizePhone(raw)
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
            source: 'orders',
          })
        }
      }
      setCustomers(Array.from(map.values()))
      setLoading(false)
    }
    load()
  }, [supabase])

  function normalizePhone(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('254')) return digits
    if (digits.startsWith('0')) return '254' + digits.slice(1)
    if (digits.startsWith('7') || digits.startsWith('1')) return '254' + digits
    return digits
  }

  function buildLink(phone: string, name: string) {
    const text = message.replace(/\{name\}/g, name.split(' ')[0] || 'there')
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }

  function addManual() {
    const phone = normalizePhone(manualPhone.trim())
    const name = manualName.trim() || 'Customer'
    if (!phone || phone.length < 9) {
      notify('error', 'Invalid number', 'Enter a valid Kenyan phone number')
      return
    }
    if (customers.some(c => c.phone === phone)) {
      notify('warning', 'Already exists', `${phone} is already in the list`)
      return
    }
    setCustomers(prev => [{ name, phone, email: null, orderCount: 0, totalSpent: 0, source: 'manual' }, ...prev])
    setSelected(prev => new Set([...prev, phone]))
    setManualName('')
    setManualPhone('')
    setShowManual(false)
    notify('success', 'Contact added', `${name} (${phone}) added and selected`)
  }

  function removeManual(phone: string) {
    setCustomers(prev => prev.filter(c => c.phone !== phone || c.source !== 'manual'))
    setSelected(prev => { const n = new Set(prev); n.delete(phone); return n })
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search.replace(/\D/g, '')) ||
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

  function sendToOne(customer: Customer, e: React.MouseEvent) {
    e.stopPropagation()
    if (!message.trim()) { notify('warning', 'No message', 'Write a message first'); return }
    window.open(buildLink(customer.phone, customer.name), '_blank', 'noopener')
    setSent(prev => new Set([...prev, customer.phone]))
    notify('success', 'WhatsApp opened', `Chat opened for ${customer.name}`)
  }

  async function sendToAll() {
    if (!message.trim()) { notify('warning', 'No message', 'Write your message first'); return }
    if (selected.size === 0) { notify('warning', 'No selection', 'Select at least one customer'); return }
    setSending(true)
    const toSend = customers.filter(c => selected.has(c.phone))
    let count = 0
    for (const c of toSend) {
      window.open(buildLink(c.phone, c.name), '_blank', 'noopener')
      setSent(prev => new Set([...prev, c.phone]))
      count++
      if (count < toSend.length) await new Promise(r => setTimeout(r, 700))
    }
    setSending(false)
    notify('success', `Sent to ${toSend.length} customer${toSend.length !== 1 ? 's' : ''}`,
      'WhatsApp chats opened — click Send in each tab to deliver')
  }

  const allFiltered = filtered.length > 0 && selected.size === filtered.length

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-16 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Customer Outreach</p>
          <h1 className="text-[26px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">WhatsApp Broadcast</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {customers.length} contacts · {selected.size} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 px-4 rounded-2xl bg-[#f0fdf4] border border-green-100 flex items-center gap-2 text-green-700 font-black text-[11px] uppercase tracking-widest">
            <MessageSquare size={14} />
            via WhatsApp
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT: COMPOSER ── */}
        <div className="space-y-5">

          {/* Templates */}
          <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center">
                  <Zap size={15} className="text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">Quick Templates</p>
                  <p className="text-[11px] text-gray-400 font-medium">6 message templates ready to use</p>
                </div>
              </div>
              {showTemplates
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-gray-50 overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
                    {QUICK_TEMPLATES.map(t => (
                      <button key={t.label}
                        onClick={() => { setMessage(t.text); setShowTemplates(false) }}
                        className="text-left p-3 rounded-2xl bg-[#f8f9fa] border border-gray-100 hover:border-green-300 hover:bg-[#f0fdf4] transition-all group"
                      >
                        <p className="text-base mb-1">{t.icon}</p>
                        <p className="font-black text-xs text-gray-800">{t.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message textarea */}
          <div className="bg-white rounded-[24px] p-6 border border-gray-100"
            style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-green-500" /> Message
              </h2>
              {message && (
                <button onClick={() => setMessage('')}
                  className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 hover:text-red-500 transition-colors">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Write your message here...\n\nUse {name} to personalise — it replaces with the customer's first name automatically.\n\nExample: Hi {name}! We have a great offer for you...`}
              rows={8}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-green-400 focus:ring-4 focus:ring-green-50 focus:outline-none text-sm font-medium text-gray-800 resize-none bg-[#fafafa] placeholder-gray-300 transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] text-gray-400 font-medium">
                {message.length} chars · <span className="font-bold text-gray-500">{'{name}'}</span> = customer first name
              </p>
              {message && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <CheckCircle size={10} /> Ready
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {message && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] p-6 border border-gray-100"
              style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Message Preview</p>
              <div className="bg-[#f0fdf4] rounded-2xl p-4">
                <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-line">
                  {message.replace(/\{name\}/g, 'David')}
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-2 text-right">via WhatsApp · Batteriq</p>
              </div>
            </motion.div>
          )}

          {/* Send All CTA */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                <button
                  onClick={sendToAll}
                  disabled={sending || !message.trim()}
                  className="w-full h-16 rounded-[20px] text-white font-black text-base shadow-xl shadow-green-200 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  <Send size={20} />
                  {sending
                    ? `Opening ${selected.size} chats...`
                    : `Send to ${selected.size} contact${selected.size !== 1 ? 's' : ''} on WhatsApp`}
                </button>
                <p className="text-center text-[11px] text-gray-400 font-medium mt-2.5">
                  Opens WhatsApp — click Send in each chat to deliver the message
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: CONTACTS ── */}
        <div className="bg-white rounded-[24px] border border-gray-100 flex flex-col overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(0,0,40,0.05)' }}>

          {/* Search + controls */}
          <div className="p-5 border-b border-gray-50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 bg-[#f8f9fa] rounded-2xl px-4 h-11 border border-gray-100">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, phone or email..."
                  className="flex-1 bg-transparent text-sm font-medium text-gray-700 placeholder-gray-300 outline-none" />
                {search && (
                  <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button onClick={selectAll}
                className={`h-11 px-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-colors whitespace-nowrap ${
                  allFiltered
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-[#00004d] text-white hover:bg-[#000080]'
                }`}>
                <Users size={13} />
                {allFiltered ? 'Deselect All' : 'All'}
              </button>
              <button onClick={() => setShowManual(!showManual)}
                className="h-11 w-11 rounded-2xl bg-[#f0f2ff] text-[#0000ff] flex items-center justify-center hover:bg-[#e0e4ff] transition-colors shrink-0"
                title="Add a contact manually">
                <UserPlus size={16} />
              </button>
            </div>

            {/* Manual contact entry */}
            <AnimatePresence>
              {showManual && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#f0f2ff] rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000ff]">
                      Add Contact Manually
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        placeholder="Name (optional)"
                        className="flex-1 h-10 px-3 rounded-xl text-sm font-medium bg-white border border-blue-100 outline-none focus:border-[#0000ff] placeholder-gray-300"
                      />
                      <input
                        value={manualPhone}
                        onChange={e => setManualPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        type="tel"
                        onKeyDown={e => e.key === 'Enter' && addManual()}
                        className="flex-1 h-10 px-3 rounded-xl text-sm font-medium bg-white border border-blue-100 outline-none focus:border-[#0000ff] placeholder-gray-300"
                      />
                      <button onClick={addManual}
                        className="h-10 w-10 rounded-xl bg-[#0000ff] text-white flex items-center justify-center hover:bg-[#0000cc] transition-colors shrink-0">
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-400 font-medium">
                      Accepts 07XX, 01XX, +254XX, or 254XX format. Press Enter or + to add.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
              <span className="flex items-center gap-1.5">
                <Users size={11} /> {filtered.length} contacts
              </span>
              {selected.size > 0 && (
                <span className="text-green-600 flex items-center gap-1.5">
                  <CheckCircle size={11} /> {selected.size} selected
                </span>
              )}
              {sent.size > 0 && (
                <span className="text-[#0000ff] flex items-center gap-1.5">
                  <Send size={11} /> {sent.size} sent
                </span>
              )}
            </div>
          </div>

          {/* Contact list */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: '520px' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-[#0000ff] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400">Loading contacts...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Users size={20} className="text-gray-200" />
                </div>
                <p className="text-sm font-bold text-gray-400">No contacts found</p>
                <button onClick={() => setShowManual(true)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#0000ff] hover:underline">
                  <Plus size={12} /> Add one manually
                </button>
              </div>
            ) : (
              filtered.map((c, i) => {
                const isSelected = selected.has(c.phone)
                const isSent = sent.has(c.phone)
                const initial = c.name.charAt(0).toUpperCase()
                const bgColors = ['#00004d', '#065F46', '#7C3AED', '#B45309', '#DC2626']
                const bgColor = bgColors[c.name.charCodeAt(0) % bgColors.length]

                return (
                  <div key={c.phone}
                    onClick={() => toggleSelect(c.phone)}
                    className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-gray-50 cursor-pointer transition-all ${
                      isSelected ? 'bg-[#f0fdf4]' : 'hover:bg-gray-50'
                    } ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-green-500 border-green-500' : 'border-gray-200'
                    }`}>
                      {isSelected && <CheckCircle size={11} className="text-white" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: bgColor }}>
                      <span className="text-white font-black text-sm">{initial}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-gray-900 truncate">{c.name}</p>
                        {c.source === 'manual' && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#0000ff] bg-[#f0f2ff] px-1.5 py-0.5 rounded-md shrink-0">
                            Manual
                          </span>
                        )}
                        {isSent && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md shrink-0">
                            Sent
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                        <Phone size={9} /> {c.phone}
                      </p>
                    </div>

                    {/* Order stats — only for order customers */}
                    {c.source === 'orders' && (
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-[11px] font-black text-gray-700">
                          KES {c.totalSpent.toLocaleString('en-KE')}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {c.orderCount} order{c.orderCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Send single */}
                      <button
                        onClick={e => sendToOne(c, e)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSent
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                        title={`Send WhatsApp to ${c.name}`}
                      >
                        {isSent ? <CheckCircle size={15} /> : <Send size={14} />}
                      </button>
                      {/* Remove manual contact */}
                      {c.source === 'manual' && (
                        <button
                          onClick={e => { e.stopPropagation(); removeManual(c.phone) }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove this contact"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
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
