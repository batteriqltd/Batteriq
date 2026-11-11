'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileCheck2, Plus, Trash2, Download, Copy, Share2, RefreshCw,
  CheckCircle2, Clock, Wrench, FileText, ExternalLink, Package,
} from 'lucide-react'
import type { DeliveryNoteItem, DeliveryNoteRecord, NoteDocType } from '@/lib/delivery-note-pdf'
import { createQrVerificationStamp } from '@/lib/delivery-note-stamp'

interface AdminOrderSummary {
  id: string
  order_number: string
  guest_name: string | null
  guest_phone: string | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[]
}

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function cleanWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1)
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits
  return digits
}

export default function AdminDeliveryNotesPage() {
  const [notes, setNotes] = useState<DeliveryNoteRecord[]>([])
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'delivery' | 'installation'>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [quickWaPhone, setQuickWaPhone] = useState('')

  // Form state for creating / pre-filling a note in Admin
  const [docNumber, setDocNumber] = useState('')
  const [docType, setDocType] = useState<NoteDocType>('delivery')
  const [createBoth, setCreateBoth] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliverySite, setDeliverySite] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [lpoReference, setLpoReference] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  )
  const [items, setItems] = useState<DeliveryNoteItem[]>([
    { description: '', subtext: '', qtySent: '1', qtyReceived: '1' },
  ])
  const [workDescription, setWorkDescription] = useState('')
  const [worksCompleted, setWorksCompleted] = useState('')
  const [remarks, setRemarks] = useState('')
  const [batteriqPersonName, setBatteriqPersonName] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverSignature, setReceiverSignature] = useState('')
  const [saving, setSaving] = useState(false)

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const [notesRes, ordersRes] = await Promise.all([
        fetch('/api/delivery-notes', { cache: 'no-store' }),
        fetch('/api/admin/orders/list', { cache: 'no-store' }),
      ])
      const notesData = await notesRes.json()
      setNotes(notesData.notes ?? [])
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders((ordersData.orders ?? []).slice(0, 50))
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const publicFormUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/delivery-note`
      : 'https://batteriq.com/delivery-note'

  function copyLink(url: string, label = 'Client link copied!') {
    navigator.clipboard.writeText(url)
    showMsg(label)
  }

  function updateItem(idx: number, patch: Partial<DeliveryNoteItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function resetForm() {
    setDocNumber('')
    setDocType('delivery')
    setCustomerName('')
    setCustomerPhone('')
    setDeliverySite('')
    setContactPerson('')
    setLpoReference('')
    setDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
    setItems([{ description: '', subtext: '', qtySent: '1', qtyReceived: '1' }])
    setWorkDescription('')
    setWorksCompleted('')
    setRemarks('')
    setBatteriqPersonName('')
    setReceiverName('')
    setReceiverSignature('')
  }

  function autofillFromOrder(order: AdminOrderSummary) {
    setDocNumber('')
    setCustomerName(order.guest_name || '')
    setReceiverName(order.guest_name || '')
    setContactPerson(order.guest_name || '')
    setCustomerPhone(order.guest_phone || '')
    setQuickWaPhone(order.guest_phone || '')
    const addr = order.delivery_address ?? {}
    const site = [addr.street, addr.city, addr.county].filter(Boolean).join(', ')
    setDeliverySite(site)
    setLpoReference(order.order_number || '')
    setDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
    const mapped =
      Array.isArray(order.items) && order.items.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          order.items.map((it: any) => ({
            description: String(it.name ?? ''),
            subtext: String(it.brand ?? ''),
            qtySent: String(it.quantity ?? 1),
            qtyReceived: String(it.quantity ?? 1),
          }))
        : [{ description: '', subtext: '', qtySent: '1', qtyReceived: '1' }]
    setItems(mapped)
    showMsg(`Autofilled from Order ${order.order_number}`)
  }

  function sendOrderDeliveryNoteWhatsApp(order: AdminOrderSummary, type: NoteDocType = 'delivery') {
    const typeQuery = type === 'installation' ? '&type=installation' : ''
    const link = `${publicFormUrl}?order=${encodeURIComponent(order.order_number || order.id)}${typeQuery}`
    const waPhone = cleanWaPhone(order.guest_phone || quickWaPhone)
    const docLabel = type === 'installation' ? 'Installation Completion Note' : 'Delivery Note'
    const text = `Hello ${order.guest_name || ''}, please confirm your name and sign your Batteriq ${docLabel} for Order ${order.order_number}:\n${link}`
    if (waPhone) {
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } else {
      copyLink(link, `Copied ${docLabel} link for Order ${order.order_number}!`)
    }
  }

  function loadIntoEditor(n: DeliveryNoteRecord) {
    setDocNumber(n.docNumber)
    setDocType(n.docType)
    setCreateBoth(false)
    setCustomerName(n.customerName)
    setCustomerPhone(n.customerPhone)
    setDeliverySite(n.deliverySite)
    setContactPerson(n.contactPerson)
    setLpoReference(n.lpoReference)
    setDate(n.date)
    setItems(n.items?.length ? n.items : [{ description: '', subtext: '', qtySent: '1', qtyReceived: '1' }])
    setWorkDescription(n.workDescription || '')
    setWorksCompleted(n.worksCompleted || '')
    setRemarks(n.remarks || '')
    setBatteriqPersonName(n.batteriqPersonName || '')
    setReceiverName(n.receiverName || '')
    setReceiverSignature(n.receiverSignature || '')
    showMsg(`Loaded ${n.docNumber} into editor`)
  }

  async function handleSaveAndSendLink() {
    if (!customerName.trim() && !items.some((i) => i.description.trim())) {
      showMsg('Enter Customer Name or Materials to pre-fill')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: docNumber || undefined,
          docType,
          createBoth: false,
          customerName,
          customerPhone,
          deliverySite,
          contactPerson,
          lpoReference,
          date,
          items,
          workDescription,
          worksCompleted,
          remarks,
          batteriqPersonName,
          receiverName,
          receiverSignature,
          status: receiverSignature ? 'signed' : 'draft',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      const link = `${publicFormUrl}?doc=${encodeURIComponent(data.note.docNumber)}`
      const waPhone = cleanWaPhone(customerPhone || quickWaPhone)
      const label = docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'
      const text = `Hello ${contactPerson || customerName || ''}, please confirm your name and sign your Batteriq ${label} (${data.note.docNumber}):\n${link}`
      navigator.clipboard.writeText(link)
      loadNotes()
      if (waPhone) {
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
        showMsg(`Saved ${data.note.docNumber} & opened WhatsApp!`)
      } else {
        showMsg(`Saved ${data.note.docNumber} & copied client signing link!`)
      }
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Admin fills everything, signs with the QR verification stamp on the
   * client's behalf, and sends a link that opens straight to "ready to download".
   */
  async function handleSignAndSendReady() {
    const signer = (receiverName || contactPerson || customerName).trim()
    if (!customerName.trim() || !signer) {
      showMsg('Enter Customer Name (and Receiver Name)')
      return
    }
    if (!items.some((i) => i.description.trim())) {
      showMsg('Add at least one item')
      return
    }
    const waPhone = cleanWaPhone(customerPhone || quickWaPhone)
    // Open the tab now (inside the click) so popup blockers allow it
    const waWindow = waPhone ? window.open('', '_blank') : null
    setSaving(true)
    try {
      const stamp = await createQrVerificationStamp({
        signer,
        site: deliverySite,
        lpoReference,
        items,
      })
      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: docNumber || undefined,
          docType,
          createBoth: !docNumber && createBoth,
          customerName,
          customerPhone,
          deliverySite,
          contactPerson: contactPerson || signer,
          lpoReference,
          date,
          items: items.filter((i) => i.description.trim()),
          workDescription,
          worksCompleted:
            worksCompleted ||
            items
              .filter((i) => i.description.trim())
              .map((i) => `${i.description} (x${i.qtyReceived || i.qtySent || '1'})`)
              .join(', '),
          checks: { visuallyInspected: true, functionalChecks: true, customerHandover: true },
          remarks: remarks || 'Received in good order and condition.',
          batteriqPersonName: batteriqPersonName || 'Batteriq Delivery Team',
          receiverName: signer,
          receiverSignature: stamp.compositeUrl,
          status: 'signed',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      const docNum: string = data.note.docNumber
      const also: string | undefined = data.companionNote?.docNumber
      const link = `${publicFormUrl}?doc=${encodeURIComponent(docNum)}${also ? `&also=${encodeURIComponent(also)}` : ''}`
      const label = docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'
      const text = `Hello ${signer}, your Batteriq ${label} (${docNum}) is ready. You can download it here:\n${link}`

      setReceiverSignature(stamp.compositeUrl)
      setDocNumber(docNum)
      loadNotes()
      if (waWindow) {
        waWindow.opener = null
        waWindow.location.href = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
        showMsg(`${docNum} signed & ready — WhatsApp opened`)
      } else {
        await navigator.clipboard.writeText(link).catch(() => {})
        showMsg(`${docNum} signed & ready — download link copied`)
      }
    } catch (err) {
      waWindow?.close()
      showMsg(err instanceof Error ? err.message : 'Failed to prepare the ready note')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndDownload() {
    if (!customerName.trim()) {
      showMsg('Enter Customer Name')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: docNumber || undefined,
          docType,
          createBoth: !docNumber && createBoth,
          customerName,
          customerPhone,
          deliverySite,
          contactPerson,
          lpoReference,
          date,
          items,
          workDescription,
          worksCompleted,
          remarks,
          batteriqPersonName,
          receiverName,
          receiverSignature,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      downloadBase64Pdf(data.pdf, data.filename)
      if (data.companionPdf && data.companionFilename) {
        setTimeout(() => downloadBase64Pdf(data.companionPdf, data.companionFilename), 400)
      }
      showMsg(`Generated & downloaded ${data.note.docNumber}`)
      loadNotes()
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(docNum: string) {
    if (!confirm(`Delete ${docNum}?`)) return
    await fetch(`/api/delivery-notes?doc=${encodeURIComponent(docNum)}`, { method: 'DELETE' })
    loadNotes()
    showMsg(`Deleted ${docNum}`)
  }

  const filteredNotes = notes.filter((n) => (tab === 'all' ? true : n.docType === tab))
  const selectedOrder = orders.find((o) => o.id === selectedOrderId)

  return (
    <div className="p-4 sm:p-8 pb-16 min-h-screen space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Delivery &amp; Installation Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Send a pre-filled order link on WhatsApp — client only confirms their name &amp; signs. Both PDFs are generated automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/delivery-note"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-slate-50"
          >
            <ExternalLink size={14} /> Open Client Form
          </a>
          <button
            onClick={loadNotes}
            className="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-blue-700"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* 1. One-Click Send from Existing Order */}
      <div className="bg-gradient-to-r from-[#00004d] to-[#1e4e87] rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
              <Package size={13} /> Autofill from Client Order
            </p>
            <p className="text-base font-black mt-0.5">
              Pick a client&apos;s order — all items, site &amp; contact details autofill automatically so the client just signs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedOrderId}
              onChange={(e) => {
                const id = e.target.value
                setSelectedOrderId(id)
                const ord = orders.find((o) => o.id === id)
                if (ord) autofillFromOrder(ord)
              }}
              className="h-11 px-3.5 rounded-2xl bg-white text-slate-900 text-xs font-bold focus:outline-none min-w-[240px]"
            >
              <option value="">— Select a Customer Order ({orders.length}) —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} · {o.guest_name || 'Customer'} ({o.guest_phone || 'No phone'})
                </option>
              ))}
            </select>

            {selectedOrder && (
              <>
                <button
                  type="button"
                  onClick={() => sendOrderDeliveryNoteWhatsApp(selectedOrder, 'delivery')}
                  className="h-11 px-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <Share2 size={14} /> WhatsApp Delivery Note
                </button>
                <button
                  type="button"
                  onClick={() => sendOrderDeliveryNoteWhatsApp(selectedOrder, 'installation')}
                  className="h-11 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <Wrench size={14} /> WhatsApp Installation Note
                </button>
              </>
            )}
          </div>
        </div>

        {/* Or Send Blank Link */}
        <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-blue-100 font-medium">
            Or send a blank link to any WhatsApp number: <code className="font-mono text-white">{publicFormUrl}</code>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyLink(publicFormUrl, 'Copied Delivery Note link!')}
              className="h-9 px-3.5 rounded-xl bg-white text-[#00004d] text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <Copy size={12} /> Copy Link
            </button>
            <input
              type="tel"
              value={quickWaPhone}
              onChange={(e) => setQuickWaPhone(e.target.value)}
              placeholder="Client Phone (07XX...)"
              className="h-9 px-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder:text-blue-200 text-xs font-semibold focus:outline-none"
            />
            <a
              href={`https://wa.me/${cleanWaPhone(quickWaPhone)}?text=${encodeURIComponent(
                `Hello! Please fill in and sign your Batteriq Delivery Note here:\n${publicFormUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <Share2 size={12} /> Send on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Create / Pre-fill Note for Client */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">
              {docNumber ? `Edit ${docNumber}` : 'Pre-fill Note for Client'}
            </h2>
            {docNumber && (
              <button
                onClick={resetForm}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + New Blank Note
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocType('delivery')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                docType === 'delivery' ? 'bg-[#1e4e87] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <FileText size={13} /> Delivery Note
            </button>
            <button
              type="button"
              onClick={() => setDocType('installation')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                docType === 'installation' ? 'bg-[#1e4e87] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Wrench size={13} /> Installation Note
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Customer / Company Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. J W Seagon & Co. Ltd"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Delivery / Work Site</label>
              <input
                type="text"
                value={deliverySite}
                onChange={(e) => setDeliverySite(e.target.value)}
                placeholder="Site location"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contact person"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Client WhatsApp / Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">LPO / Order Reference</label>
              <input
                type="text"
                value={lpoReference}
                onChange={(e) => setLpoReference(e.target.value)}
                placeholder="e.g. LPO No. 1594"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Received By (client name)</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Who received it"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Batteriq Staff / Tech Name</label>
              <input
                type="text"
                value={batteriqPersonName}
                onChange={(e) => setBatteriqPersonName(e.target.value)}
                placeholder="Delivered / installed by"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Materials Delivered / Installed
              </label>
              <button
                type="button"
                onClick={() => setItems((p) => [...p, { description: '', subtext: '', qtySent: '1', qtyReceived: '1' }])}
                className="text-[11px] font-black text-blue-600 flex items-center gap-1"
              >
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Description / Material"
                    className="col-span-7 h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={it.qtySent}
                    onChange={(e) => updateItem(idx, { qtySent: e.target.value, qtyReceived: it.qtyReceived || e.target.value })}
                    placeholder="Sent"
                    className="col-span-2 h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={it.qtyReceived}
                    onChange={(e) => updateItem(idx, { qtyReceived: e.target.value })}
                    placeholder="Rec"
                    className="col-span-2 h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))}
                    className="col-span-1 text-slate-400 hover:text-red-600 flex justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleSignAndSendReady}
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {saving ? 'Preparing...' : 'Fill & Sign Myself → Send Ready Note'}
            </button>
            <p className="text-[11px] text-slate-500 text-center -mt-0.5">
              Client just opens the link and downloads — nothing to fill or sign.
            </p>

            <button
              type="button"
              onClick={handleSaveAndSendLink}
              disabled={saving}
              className="w-full h-11 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <Share2 size={15} />
              {saving ? 'Saving...' : 'Save & Send Signing Link on WhatsApp'}
            </button>

            <button
              type="button"
              onClick={handleSaveAndDownload}
              disabled={saving}
              className="w-full h-10 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <Download size={14} />
              {docNumber ? 'Save & Download PDF' : 'Generate & Download PDF Now'}
            </button>
          </div>
        </div>

        {/* Right: Submitted & Generated Notes List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['all', 'delivery', 'installation'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                    tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {t === 'all' ? `All (${notes.length})` : t === 'delivery' ? 'Delivery Notes' : 'Installation Notes'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center text-sm text-slate-400 font-semibold border border-slate-200/70">
              Loading delivery &amp; installation notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <FileCheck2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-800">No notes yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Pick a customer order above and send the link on WhatsApp — once the client signs, both their Delivery Note and Installation Completion Note appear here ready to download.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((n) => {
                const prefillUrl = `${publicFormUrl}?doc=${encodeURIComponent(n.docNumber)}`
                const waNumber = cleanWaPhone(n.customerPhone)
                const isSigned = n.status === 'signed' || Boolean(n.receiverSignature)
                const waText = encodeURIComponent(
                  isSigned
                    ? `Hello ${n.receiverName || n.contactPerson || n.customerName}, your Batteriq ${
                        n.docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'
                      } (${n.docNumber}) is ready. You can download it here:\n${prefillUrl}`
                    : `Hello ${n.contactPerson || n.customerName}, please confirm your name and sign your Batteriq ${
                        n.docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'
                      } (${n.docNumber}):\n${prefillUrl}`
                )

                return (
                  <div
                    key={n.docNumber}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            n.docType === 'installation'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-[#1e4e87] border border-blue-200'
                          }`}
                        >
                          {n.docType === 'installation' ? 'Installation Note' : 'Delivery Note'}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-900">{n.docNumber}</span>
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 size={11} /> Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} /> Awaiting Signature
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">{n.date}</span>
                      </div>

                      <p className="text-sm font-black text-slate-900 truncate">
                        {n.customerName}{' '}
                        {n.deliverySite ? <span className="font-medium text-slate-500">· {n.deliverySite}</span> : null}
                      </p>

                      <p className="text-xs text-slate-500">
                        Receiver: <strong className="text-slate-700">{n.receiverName || n.contactPerson || '—'}</strong>
                        {n.lpoReference ? ` · Ref: ${n.lpoReference}` : ''}
                        {n.customerPhone ? ` · Tel: ${n.customerPhone}` : ''}
                      </p>

                      {n.items?.filter((i) => i.description).length > 0 && (
                        <p className="text-xs text-slate-600 line-clamp-1">
                          Items: {n.items.filter((i) => i.description).map((i) => `${i.description} (${i.qtyReceived || i.qtySent})`).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/delivery-notes/pdf?doc=${encodeURIComponent(n.docNumber)}`}
                          className="h-9 px-3.5 rounded-xl bg-[#1e4e87] hover:bg-[#163b68] text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                        >
                          <Download size={13} /> Download PDF
                        </a>
                        <a
                          href={`https://wa.me/${waNumber}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                        >
                          <Share2 size={13} /> {isSigned ? 'Send PDF on WA' : 'Send Sign Link'}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadIntoEditor(n)}
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => copyLink(prefillUrl, `Copied client signing link for ${n.docNumber}`)}
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Copy size={11} /> Sign Link
                        </button>
                        <button
                          onClick={() => handleDelete(n.docNumber)}
                          className="h-8 px-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
