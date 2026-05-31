'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatKES, getProductImageUrl } from '@/lib/utils'
import type { Product } from '@/lib/supabase/types'
import { Send, Users, Mail, CheckCircle, Search, X, Eye, Loader, Upload, ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface Subscriber { id: string; email: string; name: string | null; created_at: string; status: string }
interface Broadcast { id: string; subject: string; sent_count: number; created_at: string }

export default function NewsletterPage() {
  const supabase = useMemo(() => createClient(), [])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [customImages, setCustomImages] = useState<Record<string, string>>({}) // productId → dataUrl
  const [subject, setSubject] = useState('')
  const [introText, setIntroText] = useState('We have just added new products to our store. Be the first to get yours — M-Pesa accepted, same-day Nairobi delivery.')
  const [footerNote, setFooterNote] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'compose'|'subscribers'|'history'>('compose')
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/newsletter')
      const data = await res.json()
      setSubscribers(data.subscribers ?? [])
      setBroadcasts(data.broadcasts ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prods } = await (supabase.from('products') as any)
        .select('*').order('created_at', { ascending: false })
      setProducts(prods ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function handleImageUpload(productId: string, file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result as string
      setCustomImages(prev => ({ ...prev, [productId]: result }))
    }
    reader.readAsDataURL(file)
  }

  async function sendBroadcast(isTest: boolean) {
    if (!subject.trim()) { showToast('Please enter a subject line'); return }
    if (!introText.trim()) { showToast('Please enter an intro message'); return }
    if (!selectedProducts.length) { showToast('Select at least one product'); return }
    if (isTest && !testEmail.trim()) { showToast('Enter a test email address'); return }

    setSending(true)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, introText, footerNote,
          productIds: selectedProducts.map(p => p.id),
          customImages,
          testEmail: isTest ? testEmail : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(isTest ? `Test email sent to ${testEmail}` : `Broadcast sent to ${data.sent} subscribers`)
      if (!isTest) {
        setSubject(''); setSelectedProducts([]); setCustomImages({})
        const r2 = await fetch('/api/admin/newsletter')
        const d2 = await r2.json()
        setBroadcasts(d2.broadcasts ?? [])
      }
    } catch (e) { showToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`) }
    setSending(false)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(productSearch.toLowerCase())
  )
  const filteredSubs = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const activeCount = subscribers.filter(s => s.status === 'active').length

  return (
    <div className="p-6 lg:p-8 bg-[#f8f9fa] min-h-screen">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#00004d] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Newsletter</h1>
        <p className="text-gray-400 text-sm mt-1">Send professional product announcements to your subscribers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Subscribers', value: subscribers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Broadcasts Sent', value: broadcasts.length, icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 font-bold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['compose', 'subscribers', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl font-black text-sm capitalize transition-all ${tab === t ? 'bg-[#00004d] text-white' : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-300'}`}>
            {t === 'compose' ? 'Compose' : t === 'subscribers' ? `Subscribers (${subscribers.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* COMPOSE */}
      {tab === 'compose' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* LEFT */}
          <div className="space-y-5">

            {/* Email content */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2 text-base">
                <Mail size={16} className="text-blue-500" /> Email Content
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Subject Line</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="New EcoFlow Products Now Available at Batteriq"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Intro Message</label>
                  <textarea value={introText} onChange={e => setIntroText(e.target.value)} rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-800 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Footer Note <span className="text-gray-300 font-medium normal-case">(optional)</span></label>
                  <input value={footerNote} onChange={e => setFooterNote(e.target.value)}
                    placeholder="Limited stock available. Order today for same-day delivery."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-800" />
                </div>
              </div>
            </div>

            {/* Selected products with image upload */}
            {selectedProducts.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-900 mb-4 text-sm">Product Images</h3>
                <p className="text-xs text-gray-400 mb-4">Upload a custom photo for each product. If none uploaded, the product image from the store will be used.</p>
                <div className="space-y-4">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      {/* Current image preview */}
                      <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0 relative">
                        {customImages[p.id] ? (
                          <img src={customImages[p.id]} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <Image src={getProductImageUrl(p)} alt={p.name} fill className="object-contain p-1" sizes="64px" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{customImages[p.id] ? 'Custom photo uploaded' : 'Using store image'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(p.id, f) }} />
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-blue-400 text-xs font-black text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                            <Upload size={12} /> Upload
                          </span>
                        </label>
                        {customImages[p.id] && (
                          <button onClick={() => setCustomImages(prev => { const n = {...prev}; delete n[p.id]; return n })}
                            className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-colors">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test send */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 mb-1 text-sm">Send Test Email</h3>
              <p className="text-xs text-gray-400 mb-4">Preview the email in your inbox before sending to all subscribers.</p>
              <div className="flex gap-3">
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  placeholder="your@email.com" type="email"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm" />
                <button onClick={() => sendBroadcast(true)} disabled={sending}
                  className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                  <Eye size={14} /> Send Test
                </button>
              </div>
            </div>

            {/* Send all */}
            <button onClick={() => sendBroadcast(false)}
              disabled={sending || !selectedProducts.length || !subject.trim()}
              className="w-full h-16 rounded-2xl bg-[#00004d] text-white font-black text-base shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-3">
              {sending
                ? <><Loader size={18} className="animate-spin" /> Sending...</>
                : <><Send size={18} /> Send to {activeCount} Subscribers</>}
            </button>
            {(!selectedProducts.length || !subject.trim()) && (
              <p className="text-xs text-center text-gray-400 -mt-2">
                {!subject.trim() ? 'Add a subject line to enable sending' : 'Select at least one product to enable sending'}
              </p>
            )}
          </div>

          {/* RIGHT — product picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-50 flex-shrink-0">
              <h2 className="font-black text-gray-900 mb-3 text-base flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-500" /> Select Products to Feature
              </h2>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
                <Search size={14} className="text-gray-400" />
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search by name or brand..."
                  className="flex-1 bg-transparent text-sm font-medium outline-none text-gray-700 placeholder-gray-400" />
              </div>
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(p => (
                    <span key={p.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00004d] text-white text-xs font-black">
                      {p.name.split(' ').slice(0, 3).join(' ')}
                      <button onClick={() => {
                        setSelectedProducts(prev => prev.filter(x => x.id !== p.id))
                        setCustomImages(prev => { const n = {...prev}; delete n[p.id]; return n })
                      }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-1 max-h-[600px]">
              {loading ? (
                <div className="p-12 text-center text-gray-400 font-bold text-sm">Loading products...</div>
              ) : filteredProducts.map(p => {
                const isSelected = !!selectedProducts.find(s => s.id === p.id)
                return (
                  <div key={p.id} onClick={() => {
                    if (isSelected) {
                      setSelectedProducts(prev => prev.filter(x => x.id !== p.id))
                      setCustomImages(prev => { const n = {...prev}; delete n[p.id]; return n })
                    } else {
                      setSelectedProducts(prev => [...prev, p])
                    }
                  }}
                    className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 cursor-pointer transition-colors select-none ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-[#00004d] border-[#00004d]' : 'border-gray-300'}`}>
                      {isSelected && <CheckCircle size={11} className="text-white" />}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex-shrink-0 relative overflow-hidden border border-gray-100">
                      <Image src={getProductImageUrl(p)} alt={p.name} fill className="object-contain p-1" sizes="48px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{p.brand}</p>
                      <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
                    </div>
                    <p className="text-sm font-black text-[#0000ff] font-mono flex-shrink-0">{formatKES(p.price_kes)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIBERS */}
      {tab === 'subscribers' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
              <Search size={14} className="text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search subscribers..."
                className="flex-1 bg-transparent text-sm font-medium outline-none text-gray-700 placeholder-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? <div className="p-12 text-center text-gray-400 text-sm font-bold">Loading...</div>
            : filteredSubs.length === 0 ? <div className="p-12 text-center text-gray-400 text-sm font-bold">No subscribers yet</div>
            : filteredSubs.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                <div className="w-9 h-9 rounded-xl bg-[#00004d] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-sm">{(s.name || s.email).charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900">{s.name || '—'}</p>
                  <p className="text-xs text-gray-400 font-bold truncate">{s.email}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.status || 'active'}
                </span>
                <p className="text-xs text-gray-400 font-bold flex-shrink-0">
                  {new Date(s.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {broadcasts.length === 0
            ? <div className="p-12 text-center text-gray-400 text-sm font-bold">No broadcasts sent yet</div>
            : broadcasts.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-6 py-5 border-b border-gray-50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Send size={15} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{b.subject}</p>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {new Date(b.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex-shrink-0 border border-green-100">
                  {b.sent_count} sent
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
