'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Plus, Trash2, Download, QrCode, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import QRCode from 'qrcode'
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
  const [isPrefilled, setIsPrefilled] = useState(false)
  const [showEditDetails, setShowEditDetails] = useState(false)

  // Client fills Name + taps QR Verify; everything else is populated from the Order / Admin
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

  // Preserved background fields
  const [workDescription, setWorkDescription] = useState('')
  const [worksCompleted, setWorksCompleted] = useState('')
  const [remarks, setRemarks] = useState('')
  const [batteriqPersonName, setBatteriqPersonName] = useState('')

  // 1-Tap Automatic QR Verification state
  const [qrStampDataUrl, setQrStampDataUrl] = useState('')
  const [qrOnlyDataUrl, setQrOnlyDataUrl] = useState('')
  const [qrStampInfo, setQrStampInfo] = useState<{
    stampId: string
    signedBy: string
    timestamp: string
  } | null>(null)

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
        setIsPrefilled(true)
        if (n.docNumber) setDocNumber(n.docNumber)
        if (n.docType === 'installation' || n.docType === 'delivery') {
          if (!t) setDocType(n.docType)
        }
        const nameVal = n.receiverName || n.customerName || ''
        setReceiverName(nameVal)
        setCustomerName(n.customerName || nameVal)
        setContactPerson(n.contactPerson || nameVal)
        setCustomerPhone(n.customerPhone || '')
        setDeliverySite(n.deliverySite || 'Nairobi, Kenya')
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

  // Generate the 480x150 composite QR Verification Stamp (embedded into the ready A4 PDF)
  const generateQrSignatureStamp = useCallback(async () => {
    const cleanSigner = (receiverName.trim() || contactPerson.trim() || customerName.trim() || 'Verified Receiver').slice(0, 36)
    const cleanSite = (deliverySite.trim() || 'Nairobi, Kenya').slice(0, 40)
    const stampId = `BAT-QR-${Math.floor(100000 + Math.random() * 900000)}`
    const timestamp = new Date().toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const matSummary = items
      .filter((i) => i.description.trim())
      .map((i) => `${i.description.trim()} x${i.qtyReceived || i.qtySent || '1'}`)
      .join(', ')
      .slice(0, 120)

    const qrPayload = [
      'BATTERIQ VERIFIED DELIVERY',
      `ID: ${stampId}`,
      `Receiver: ${cleanSigner}`,
      `Site: ${cleanSite}`,
      `Date: ${timestamp}`,
      lpoReference ? `Ref: ${lpoReference}` : '',
      matSummary ? `Items: ${matSummary}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    const qrUrl = await QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
    setQrOnlyDataUrl(qrUrl)

    // Render composite stamp canvas (480x150 -> 3.2:1 aspect ratio matching 48mm x 15mm in PDF)
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 150
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setQrStampDataUrl(qrUrl)
      setQrStampInfo({ stampId, signedBy: cleanSigner, timestamp })
      return qrUrl
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 480, 150)

    ctx.strokeStyle = '#1e4e87'
    ctx.lineWidth = 3
    ctx.strokeRect(3, 3, 474, 144)

    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 8, 8, 134, 134)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = qrUrl
    })

    ctx.fillStyle = '#1e4e87'
    ctx.font = 'bold 17px Arial, sans-serif'
    ctx.fillText('QR VERIFIED & SIGNED', 154, 34)

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText(cleanSigner.slice(0, 24), 154, 64)

    ctx.fillStyle = '#334155'
    ctx.font = 'bold 14px Courier New, monospace'
    ctx.fillText(`ID: ${stampId}`, 154, 92)

    ctx.fillStyle = '#475569'
    ctx.font = '14px Arial, sans-serif'
    ctx.fillText(timestamp, 154, 116)

    ctx.fillStyle = '#16a34a'
    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.fillText('BATTERIQ SOLUTIONS LTD', 154, 137)

    const compositeUrl = canvas.toDataURL('image/png')
    setQrStampDataUrl(compositeUrl)
    setQrStampInfo({ stampId, signedBy: cleanSigner, timestamp })
    return compositeUrl
  }, [receiverName, contactPerson, customerName, deliverySite, lpoReference, items])

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

    const validItems = items.filter((i) => i.description.trim())
    const finalItems =
      validItems.length > 0
        ? validItems.map((it) => ({
            description: it.description.trim(),
            subtext: it.subtext || '',
            qtySent: it.qtySent || it.qtyReceived || '1',
            qtyReceived: it.qtyReceived || it.qtySent || '1',
          }))
        : [
            {
              description: lpoReference
                ? `Order / Delivery items per ${lpoReference}`
                : 'Power Backup Equipment & Accessories',
              subtext: '',
              qtySent: '1 lot',
              qtyReceived: '1 lot',
            },
          ]

    setSubmitting(true)
    try {
      const finalQrStamp = qrStampDataUrl || (await generateQrSignatureStamp())

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
          deliverySite: deliverySite.trim() || 'Nairobi, Kenya',
          lpoReference: lpoReference.trim(),
          date: date.trim(),
          items: finalItems,
          workDescription: workDescription.trim(),
          worksCompleted:
            worksCompleted.trim() ||
            finalItems.map((i) => `${i.description} (x${i.qtyReceived || i.qtySent || '1'})`).join(', '),
          checks: {
            visuallyInspected: true,
            functionalChecks: true,
            customerHandover: true,
          },
          remarks: remarks.trim() || 'Received in good order and condition.',
          batteriqPersonName: batteriqPersonName.trim() || 'Batteriq Delivery Team',
          receiverSignature: finalQrStamp,
          status: 'signed',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      // Automatically trigger download of the ready PDF
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

  const populatedItems = items.filter((i) => i.description.trim())

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-7 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verified &amp; Ready!</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Thank you, <strong className="text-slate-800">{receiverName || customerName}</strong>. Your QR-verified{' '}
            <strong>Delivery Note ({submitted.docNumber})</strong> has been downloaded and saved with Batteriq.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => downloadBase64Pdf(submitted.pdf, submitted.filename)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} />
              Download Ready {docType === 'installation' ? 'Installation Note' : 'Delivery Note'} (PDF)
            </button>
            {submitted.companionPdf && submitted.companionFilename && (
              <button
                onClick={() => downloadBase64Pdf(submitted.companionPdf!, submitted.companionFilename!)}
                className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} />
                Download Ready {docType === 'installation' ? 'Delivery Note' : 'Installation Completion Note'} (PDF)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-5 sm:py-10 px-3 sm:px-4">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Clean Header */}
        <div className="px-5 sm:px-7 py-5 bg-[#1e4e87] text-white flex items-center justify-between gap-3">
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
          <div className="px-5 py-3 bg-blue-50 text-[#1e4e87] text-xs font-bold text-center">
            Loading your delivery details...
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Auto-Populated Order / Delivery Summary */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1e4e87]">
                Populated Delivery Details
              </span>
              <button
                type="button"
                onClick={() => setShowEditDetails((v) => !v)}
                className="text-[11px] font-bold text-slate-500 hover:text-[#1e4e87] inline-flex items-center gap-1"
              >
                {showEditDetails ? (
                  <>
                    Hide Details <ChevronUp size={13} />
                  </>
                ) : (
                  <>
                    Edit Details <ChevronDown size={13} />
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Customer:</span>
                <span className="font-bold text-slate-800">{customerName || receiverName || 'Client'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Date:</span>
                <span className="font-bold text-slate-800">{date}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block">Delivery Site:</span>
                <span className="font-bold text-slate-800">{deliverySite || 'Nairobi, Kenya'}</span>
              </div>
            </div>

            {populatedItems.length > 0 && (
              <div className="pt-2 border-t border-slate-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Materials Delivered
                </span>
                <ul className="space-y-1">
                  {populatedItems.map((it, i) => (
                    <li key={i} className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>
                        {i + 1}. {it.description}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">
                        Qty: {it.qtyReceived || it.qtySent || '1'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collapsible editor if client or staff wants to adjust populated details */}
            {(showEditDetails || (!isPrefilled && populatedItems.length === 0)) && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Delivery / Work Site
                    </label>
                    <input
                      type="text"
                      value={deliverySite}
                      onChange={(e) => setDeliverySite(e.target.value)}
                      placeholder="e.g. Westlands, Nairobi"
                      className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Date</label>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Materials Delivered</label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1e4e87] text-[10px] font-black uppercase"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="Material / Item name"
                          className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          value={item.qtyReceived}
                          onChange={(e) =>
                            updateItem(idx, { qtyReceived: e.target.value, qtySent: item.qtySent || e.target.value })
                          }
                          placeholder="Qty"
                          className="w-16 h-9 px-2 rounded-lg bg-white border border-slate-300 text-xs text-center font-bold text-slate-900"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Client enters Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5">
              1. Enter Your Full Name *
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => {
                setReceiverName(e.target.value)
                if (!customerName) setCustomerName(e.target.value)
                if (!contactPerson) setContactPerson(e.target.value)
              }}
              placeholder="Type your full name"
              className="w-full h-12 px-4 rounded-2xl border-2 border-slate-300 text-base text-slate-900 font-bold focus:outline-none focus:border-[#1e4e87] focus:ring-2 focus:ring-[#1e4e87]/15"
              required
            />
          </div>

          {/* Step 2: Client taps to verify via QR Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                2. Select to Verify via QR Code *
              </label>
              {qrStampDataUrl && (
                <button
                  type="button"
                  onClick={() => generateQrSignatureStamp()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-[#1e4e87] hover:bg-blue-50"
                >
                  <RefreshCw size={12} /> Refresh QR
                </button>
              )}
            </div>

            {!qrStampDataUrl ? (
              <button
                type="button"
                onClick={() => generateQrSignatureStamp()}
                className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-[#1e4e87]/50 bg-blue-50/50 hover:bg-blue-50 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
              >
                <div className="w-13 h-13 p-3 rounded-2xl bg-[#1e4e87] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <QrCode size={26} />
                </div>
                <span className="text-sm font-black text-[#1e4e87] uppercase tracking-wider">
                  Tap to Verify via QR Code
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Generates your instant QR verification stamp on the Delivery Note
                </span>
              </button>
            ) : (
              <div
                onClick={() => generateQrSignatureStamp()}
                className="w-full p-4 rounded-2xl border-2 border-green-500 bg-green-50/40 flex flex-col sm:flex-row items-center gap-4 cursor-pointer"
              >
                {qrOnlyDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrOnlyDataUrl}
                    alt="Verified QR Code"
                    className="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm shrink-0"
                  />
                )}
                <div className="text-center sm:text-left min-w-0 flex-1 space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-black uppercase tracking-widest">
                    <Check size={12} /> Verified via QR Code
                  </div>
                  <p className="text-base font-black text-slate-900 truncate">{qrStampInfo?.signedBy}</p>
                  <p className="text-xs font-mono font-bold text-[#1e4e87]">{qrStampInfo?.stampId}</p>
                  <p className="text-xs text-slate-500">{qrStampInfo?.timestamp}</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Download Ready Delivery Note */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-2xl bg-[#1e4e87] hover:bg-[#163b68] active:scale-[0.99] text-white font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <Download size={18} />
            {submitting ? 'Generating Ready PDF...' : '3. Download Ready Delivery Note (PDF)'}
          </button>
        </form>
      </div>
    </div>
  )
}
