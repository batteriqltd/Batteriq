'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CheckCircle2, Plus, Trash2, Download, Eraser, Check } from 'lucide-react'
import type { DeliveryNoteItem, NoteDocType } from '@/lib/delivery-note-pdf'

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

export default function PublicDeliveryNotePage() {
  const [docType, setDocType] = useState<NoteDocType>('delivery')
  const [docNumber, setDocNumber] = useState('')
  const [lpoReference, setLpoReference] = useState('')
  const [loadingPrefill, setLoadingPrefill] = useState(false)

  // The exact receiver fields: Name, Date, Delivery Site, Contact Person, Materials Delivered, Signature
  const [receiverName, setReceiverName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  )
  const [deliverySite, setDeliverySite] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [items, setItems] = useState<DeliveryNoteItem[]>([
    { description: '', subtext: '', qtySent: '1', qtyReceived: '1' },
  ])

  // Hidden/background fields preserved when prefilled by admin or order
  const [workDescription, setWorkDescription] = useState('')
  const [worksCompleted, setWorksCompleted] = useState('')
  const [remarks, setRemarks] = useState('')
  const [batteriqPersonName, setBatteriqPersonName] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<{
    docNumber: string
    pdf: string
    filename: string
    companionDocNumber?: string
    companionPdf?: string | null
    companionFilename?: string | null
  } | null>(null)

  // Smooth high-DPI Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const [hasSignature, setHasSignature] = useState(false)

  // Initialize & scale canvas for crisp mobile & laptop drawing
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  // Auto-fill from ?order= or ?doc= in URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('type')
    if (t === 'installation' || t === 'delivery') setDocType(t)

    const orderParam = params.get('order')
    const prefillDoc = params.get('doc') || params.get('id')
    if (!orderParam && !prefillDoc) return

    setLoadingPrefill(true)
    const queryUrl = orderParam
      ? `/api/delivery-notes?order=${encodeURIComponent(orderParam)}`
      : `/api/delivery-notes?doc=${encodeURIComponent(prefillDoc!)}`

    fetch(queryUrl)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.note) return
        const n = d.note
        if (n.docNumber) setDocNumber(n.docNumber)
        if (n.docType === 'installation' || n.docType === 'delivery') {
          if (!t) setDocType(n.docType)
        }
        const nameVal = n.receiverName || n.customerName || ''
        setReceiverName(nameVal)
        setCustomerName(n.customerName || nameVal)
        setContactPerson(n.contactPerson || nameVal)
        setCustomerPhone(n.customerPhone || '')
        setDeliverySite(n.deliverySite || '')
        setLpoReference(n.lpoReference || '')
        if (n.date) setDate(n.date)
        if (Array.isArray(n.items) && n.items.length > 0) setItems(n.items)
        setWorkDescription(n.workDescription || '')
        setWorksCompleted(n.worksCompleted || '')
        setRemarks(n.remarks || '')
        setBatteriqPersonName(n.batteriqPersonName || '')
      })
      .catch(() => {})
      .finally(() => setLoadingPrefill(false))
  }, [])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setupCanvas()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const pt = getPoint(e)
    lastPtRef.current = pt
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1)
    ctx.stroke()
    setHasSignature(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPtRef.current) return
    const pt = getPoint(e)
    const prev = lastPtRef.current
    const midX = (prev.x + pt.x) / 2
    const midY = (prev.y + pt.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(midX, midY)
    lastPtRef.current = pt
    setHasSignature(true)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPtRef.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setHasSignature(false)
  }, [])

  function updateItem(idx: number, patch: Partial<DeliveryNoteItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', subtext: '', qtySent: '1', qtyReceived: '1' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanName = receiverName.trim() || customerName.trim() || contactPerson.trim()
    if (!cleanName) {
      setError('Please enter your Name.')
      return
    }
    if (!deliverySite.trim()) {
      setError('Please enter the Delivery Site / Location.')
      return
    }
    const validItems = items.filter((i) => i.description.trim())
    if (validItems.length === 0) {
      setError('Please list at least one material delivered.')
      return
    }
    if (!hasSignature) {
      setError('Please sign inside the signature box.')
      return
    }

    const sigDataUrl = canvasRef.current?.toDataURL('image/png') ?? ''

    setSubmitting(true)
    try {
      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: docNumber || undefined,
          docType,
          createBoth: true,
          customerName: customerName.trim() || cleanName,
          receiverName: cleanName,
          contactPerson: contactPerson.trim() || cleanName,
          customerPhone: customerPhone.trim(),
          deliverySite: deliverySite.trim(),
          lpoReference: lpoReference.trim(),
          date: date.trim(),
          items: validItems.map((it) => ({
            description: it.description.trim(),
            subtext: it.subtext || '',
            qtySent: it.qtySent || it.qtyReceived || '1',
            qtyReceived: it.qtyReceived || it.qtySent || '1',
          })),
          workDescription: workDescription.trim(),
          worksCompleted:
            worksCompleted.trim() ||
            validItems.map((i) => `${i.description.trim()} (x${i.qtyReceived || i.qtySent || '1'})`).join(', '),
          checks: {
            visuallyInspected: true,
            functionalChecks: true,
            customerHandover: true,
          },
          remarks: remarks.trim() || 'Received in good order and condition.',
          batteriqPersonName: batteriqPersonName.trim(),
          receiverSignature: sigDataUrl,
          status: 'signed',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      // Automatically trigger download of the client's signed copy
      if (data.pdf && data.filename) {
        downloadBase64Pdf(data.pdf, data.filename)
      }

      setSubmitted({
        docNumber: data.note.docNumber,
        pdf: data.pdf,
        filename: data.filename,
        companionDocNumber: data.companionNote?.docNumber,
        companionPdf: data.companionPdf,
        companionFilename: data.companionFilename,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-7 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Done! Copy Sent</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Thank you, <strong className="text-slate-800">{receiverName || customerName}</strong>. Your signed note (
            <span className="font-mono font-bold text-slate-700">{submitted.docNumber}</span>) has been sent to Batteriq
            and downloaded to your device.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => downloadBase64Pdf(submitted.pdf, submitted.filename)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} />
              Download Signed Copy Again (PDF)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-5 sm:py-10 px-3 sm:px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Clean Minimal Header */}
        <div className="px-5 sm:px-8 py-5 bg-[#1e4e87] text-white flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">BATTERIQ SOLUTIONS LTD</p>
            <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase mt-0.5">
              {docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight leading-none">
              BATTERIQ<sup className="text-[9px] font-bold text-blue-200">™</sup>
            </div>
            {lpoReference && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-mono font-bold">
                {lpoReference}
              </span>
            )}
          </div>
        </div>

        {loadingPrefill && (
          <div className="px-5 sm:px-8 py-3 bg-blue-50 text-[#1e4e87] text-xs font-bold text-center">
            Loading your order details...
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* 1. Receiver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Receiver Full Name *
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => {
                  setReceiverName(e.target.value)
                  if (!customerName) setCustomerName(e.target.value)
                  if (!contactPerson) setContactPerson(e.target.value)
                }}
                placeholder="Enter your full name"
                className="w-full h-12 px-4 rounded-2xl border border-slate-300 text-base text-slate-900 font-semibold focus:outline-none focus:border-[#1e4e87] focus:ring-2 focus:ring-[#1e4e87]/15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Delivery Site / Location *
              </label>
              <input
                type="text"
                value={deliverySite}
                onChange={(e) => setDeliverySite(e.target.value)}
                placeholder="e.g. Westlands, Nairobi"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#1e4e87]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Date *
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="10 Nov 2026"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#1e4e87]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Contact Person *
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contact person name"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#1e4e87]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#1e4e87]"
              />
            </div>
          </div>

          {/* 2. Materials Delivered */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Materials Delivered *
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-[#1e4e87] text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80"
                >
                  <span className="w-6 text-center text-xs font-black text-slate-400 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Item / Material name"
                    className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#1e4e87]"
                  />
                  <input
                    type="text"
                    value={item.qtyReceived}
                    onChange={(e) =>
                      updateItem(idx, { qtyReceived: e.target.value, qtySent: item.qtySent || e.target.value })
                    }
                    placeholder="Qty"
                    aria-label="Quantity"
                    className="w-16 sm:w-20 h-10 px-2.5 rounded-xl bg-white border border-slate-200 text-sm text-center text-slate-900 font-bold focus:outline-none focus:border-[#1e4e87] shrink-0"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Smooth Signature Pad */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Signature * <span className="font-normal text-slate-400">(Draw with finger or mouse)</span>
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Eraser size={14} /> Clear
              </button>
            </div>

            <div className="relative rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-inner">
              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Sign Here
                </div>
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-44 sm:h-48 cursor-crosshair touch-none block"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] active:scale-[0.99] text-white font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <Check size={18} />
            {submitting ? 'Submitting...' : 'Submit & Download Copy'}
          </button>
        </form>
      </div>
    </div>
  )
}
