'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CheckCircle2, Plus, Trash2, Download, Eraser, Send, FileText, Wrench } from 'lucide-react'
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
  const [createBoth, setCreateBoth] = useState(true)
  const [docNumber, setDocNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliverySite, setDeliverySite] = useState('')
  const [lpoReference, setLpoReference] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  )
  const [items, setItems] = useState<DeliveryNoteItem[]>([
    { description: '', subtext: '', qtySent: '1', qtyReceived: '1' },
  ])
  const [workDescription, setWorkDescription] = useState('')
  const [worksCompleted, setWorksCompleted] = useState('')
  const [checks, setChecks] = useState({
    visuallyInspected: true,
    functionalChecks: true,
    customerHandover: true,
  })
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

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  // Load pre-filled note if ?doc= or ?id= is passed in URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('type')
    if (t === 'installation' || t === 'delivery') setDocType(t)
    const prefillDoc = params.get('doc') || params.get('id')
    if (!prefillDoc) return
    fetch(`/api/delivery-notes?doc=${encodeURIComponent(prefillDoc)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.note) return
        const n = d.note
        setDocNumber(n.docNumber || '')
        setDocType(n.docType === 'installation' ? 'installation' : 'delivery')
        setCustomerName(n.customerName || '')
        setReceiverName(n.receiverName || '')
        setContactPerson(n.contactPerson || '')
        setCustomerPhone(n.customerPhone || '')
        setDeliverySite(n.deliverySite || '')
        setLpoReference(n.lpoReference || '')
        if (n.date) setDate(n.date)
        if (Array.isArray(n.items) && n.items.length) setItems(n.items)
        setWorkDescription(n.workDescription || '')
        setWorksCompleted(n.worksCompleted || '')
        if (n.checks) setChecks(n.checks)
        setRemarks(n.remarks || '')
        setBatteriqPersonName(n.batteriqPersonName || '')
      })
      .catch(() => {})
  }, [])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    isDrawingRef.current = true
    const { x, y } = getPos(e)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    if ('touches' in e) e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const endDraw = () => {
    isDrawingRef.current = false
  }

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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

    const finalReceiver = receiverName.trim() || contactPerson.trim() || customerName.trim()
    if (!finalReceiver) {
      setError('Please enter your Name / Receiver Name.')
      return
    }
    if (!deliverySite.trim()) {
      setError('Please enter the Delivery / Work Site.')
      return
    }
    const validItems = items.filter((i) => i.description.trim())
    if (validItems.length === 0 && !workDescription.trim() && !worksCompleted.trim()) {
      setError('Please list at least one material delivered or work completed.')
      return
    }
    if (!hasSignature) {
      setError('Please sign in the signature box before submitting.')
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
          createBoth: !docNumber && createBoth,
          customerName: customerName.trim() || finalReceiver,
          receiverName: finalReceiver,
          contactPerson: contactPerson.trim() || finalReceiver,
          customerPhone: customerPhone.trim(),
          deliverySite: deliverySite.trim(),
          lpoReference: lpoReference.trim(),
          date: date.trim(),
          items: validItems.length > 0 ? validItems : [{ description: workDescription || worksCompleted, qtySent: '1 lot', qtyReceived: '1 lot' }],
          workDescription: workDescription.trim(),
          worksCompleted: worksCompleted.trim(),
          checks,
          remarks: remarks.trim(),
          batteriqPersonName: batteriqPersonName.trim(),
          receiverSignature: sigDataUrl,
          status: 'signed',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

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
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Signed &amp; Sent to Batteriq!
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Thank you, <strong className="text-slate-800">{receiverName || customerName}</strong>. Your signed{' '}
            <strong>Delivery Note ({submitted.docNumber})</strong>
            {submitted.companionDocNumber ? (
              <> and <strong>Installation Completion Note ({submitted.companionDocNumber})</strong></>
            ) : null}{' '}
            have been recorded with Batteriq Solutions Ltd.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => downloadBase64Pdf(submitted.pdf, submitted.filename)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} />
              Download Signed {docType === 'installation' ? 'Installation Note' : 'Delivery Note'} (PDF)
            </button>

            {submitted.companionPdf && submitted.companionFilename && (
              <button
                onClick={() => downloadBase64Pdf(submitted.companionPdf!, submitted.companionFilename!)}
                className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} />
                Download Signed {docType === 'installation' ? 'Delivery Note' : 'Installation Completion Note'} (PDF)
              </button>
            )}

            <a
              href={`https://wa.me/254716822014?text=${encodeURIComponent(
                `Hi Batteriq! I have signed and submitted the Delivery / Installation Note (${submitted.docNumber}) for ${customerName || receiverName} at ${deliverySite}.\n\nDownload PDF: ${typeof window !== 'undefined' ? window.location.origin : 'https://batteriq.com'}/api/delivery-notes/pdf?doc=${submitted.docNumber}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Send size={15} />
              Notify Batteriq on WhatsApp
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Official Batteriq Document Header */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="border-l-4 border-[#1e4e87] pl-4">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e4e87] tracking-tight uppercase">
              {docType === 'installation' ? 'Installation Completion Note' : 'Delivery Note'}
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              BATTERIQ SOLUTIONS LTD
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
              BATTERIQ<sup className="text-[10px] font-bold text-slate-500">™</sup>
            </div>
            <p className="text-[11px] font-bold text-slate-600 mt-1">Guarantee your Uptime</p>
          </div>
        </div>

        {/* Document Type Switcher */}
        <div className="px-6 sm:px-10 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocType('delivery')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                docType === 'delivery'
                  ? 'bg-[#1e4e87] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText size={14} />
              Delivery Note
            </button>
            <button
              type="button"
              onClick={() => setDocType('installation')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                docType === 'installation'
                  ? 'bg-[#1e4e87] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wrench size={14} />
              Installation Note
            </button>
          </div>

          {!docNumber && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={createBoth}
                onChange={(e) => setCreateBoth(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#1e4e87] focus:ring-[#1e4e87]"
              />
              Generate both Delivery &amp; Installation Note copies
            </label>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Issued By & Customer Details */}
          <div className="grid sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Issued By</p>
              <p className="text-sm font-black text-slate-900">BATTERIQ SOLUTIONS LTD</p>
              <p className="text-xs text-slate-600 mt-1">P.O. Box 430-00600, Nairobi, Kenya</p>
              <p className="text-xs text-slate-600">Tel: +254 716 822014</p>
              <p className="text-xs text-slate-600">info@batteriq.com | batteriq.com</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer &amp; Site Details</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. J W Seagon & Co. Ltd or Full Name"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery / Work Site *</label>
                <input
                  type="text"
                  value={deliverySite}
                  onChange={(e) => setDeliverySite(e.target.value)}
                  placeholder="e.g. Westlands, Nairobi / Site Location"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Contact person name"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="10 Nov 2026"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">LPO / Order Ref (Optional)</label>
                  <input
                    type="text"
                    value={lpoReference}
                    onChange={(e) => setLpoReference(e.target.value)}
                    placeholder="e.g. LPO No. 1594"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materials Delivered Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Goods / Materials Delivered
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#1e4e87] text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#1e4e87] text-white px-4 py-2.5 grid grid-cols-12 gap-2 text-[11px] font-black uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-6 sm:col-span-7">Description / Material</div>
                <div className="col-span-2">Qty Sent</div>
                <div className="col-span-2">Qty Rec&apos;d</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-center bg-white">
                    <div className="col-span-1 text-xs font-bold text-slate-500 pl-1">{idx + 1}</div>
                    <div className="col-span-6 sm:col-span-7">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="e.g. Bluetti Homestar 3 / Solar Panels / Electrical materials"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.qtySent}
                        onChange={(e) => updateItem(idx, { qtySent: e.target.value, qtyReceived: item.qtyReceived || e.target.value })}
                        placeholder="1"
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.qtyReceived}
                        onChange={(e) => updateItem(idx, { qtyReceived: e.target.value })}
                        placeholder="1"
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Installation Completion Checks & Works (shown when Installation Note or createBoth is active) */}
          {(docType === 'installation' || createBoth) && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Installation &amp; Handover Checks
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Description (Optional)</label>
                  <input
                    type="text"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="e.g. Backup system installation and commissioning"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Works Completed Details (Optional)</label>
                  <input
                    type="text"
                    value={worksCompleted}
                    onChange={(e) => setWorksCompleted(e.target.value)}
                    placeholder="e.g. Inverter mounted, battery tested, changeover verified"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks.visuallyInspected}
                    onChange={(e) => setChecks((c) => ({ ...c, visuallyInspected: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#1e4e87]"
                  />
                  Installation visually inspected
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks.functionalChecks}
                    onChange={(e) => setChecks((c) => ({ ...c, functionalChecks: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#1e4e87]"
                  />
                  Functional checks carried out
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks.customerHandover}
                    onChange={(e) => setChecks((c) => ({ ...c, customerHandover: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#1e4e87]"
                  />
                  Customer shown operation / handover
                </label>
              </div>
            </div>
          )}

          {/* Condition / Shortages / Remarks */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
              Condition / Shortages / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Received in good order and condition..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
            />
          </div>

          {/* Receiver Name & Signature Pad */}
          <div className="pt-4 border-t border-slate-200 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Received By / Representative Name *
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Full name of person receiving"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivered / Installed By (Batteriq Staff — Optional)
                </label>
                <input
                  type="text"
                  value={batteriqPersonName}
                  onChange={(e) => setBatteriqPersonName(e.target.value)}
                  placeholder="Batteriq delivery / technician name"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#1e4e87]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Receiver Signature * <span className="font-normal text-slate-500">(Sign inside the box below)</span>
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600"
                >
                  <Eraser size={14} /> Clear Signature
                </button>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={180}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  className="w-full h-40 cursor-crosshair touch-none bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Acknowledgement confirms receipt of the goods and/or satisfactory completion of works recorded above.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all disabled:opacity-60"
          >
            {submitting ? 'Generating & Sending Note...' : 'Submit Signed Note to Batteriq'}
          </button>
        </form>
      </div>
    </div>
  )
}
