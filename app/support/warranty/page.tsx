'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { Shield, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
  'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera',
  'Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi',
  'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita Taveta',
  'Tana River','Tharaka Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga',
  'Wajir','West Pokot',
]

const ECOFLOW_PRODUCTS = [
  'DELTA Pro 3','DELTA Pro','DELTA 2 Max','DELTA 2','DELTA 3 Plus','DELTA 3',
  'RIVER 3','RIVER 3 Plus','RIVER 3 Max','RIVER 2','RIVER 2 Max','RIVER 2 Pro',
  'DELTA Pro Ultra',
  '400W Portable Solar Panel','220W Bifacial Solar Panel','160W Portable Solar Panel',
  '110W Portable Solar Panel','60W Portable Solar Panel','45W Portable Solar Panel',
  '400W Rigid Solar Panel','100W Flexible Solar Panel',
  'Extra Battery for DELTA Pro','Extra Battery for DELTA 2','Extra Battery for DELTA 2 Max',
  'EB300 Extra Battery','EB600 Extra Battery',
  'Smart Generator 3000','Smart Generator 4000',
  'GLACIER Portable Refrigerator','WAVE 2 Air Conditioner',
  'Alternator Charger 800W','PowerStream Micro Inverter 800W',
  'RAPID Power Bank 5000mAh','RAPID Power Bank 10000mAh',
  'Other EcoFlow Product',
]

const PRODUCT_TYPE_MAP: Record<string, string> = {
  'DELTA': 'Power Station',
  'RIVER': 'Power Station',
  'Solar Panel': 'Solar Panel',
  'Extra Battery': 'Extra Battery',
  'EB300': 'Extra Battery',
  'EB600': 'Extra Battery',
  'Smart Generator': 'Smart Generator',
  'GLACIER': 'Appliance',
  'WAVE': 'Appliance',
  'Charger': 'Accessory',
  'Inverter': 'Accessory',
  'Power Bank': 'Accessory',
}

const WARRANTY_DISPLAY: Record<string, string> = {
  'Power Station': '24 months (2 years)',
  'Solar Panel': '24 months + 5-year power output guarantee',
  'Extra Battery': '24 months (2 years)',
  'Smart Generator': '24 months (2 years)',
  'Appliance': '24 months (2 years)',
  'Accessory': '12 months (1 year)',
}

function getProductType(name: string): string {
  for (const [key, type] of Object.entries(PRODUCT_TYPE_MAP)) {
    if (name.includes(key)) return type
  }
  return 'Accessory'
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  county: string
  productBrand: string
  productName: string
  productSku: string
  serialNumber: string
  purchaseDate: string
  purchaseChannel: string
}

const EMPTY_FORM: FormState = {
  firstName: '', lastName: '', email: '', phone: '', county: '',
  productBrand: 'EcoFlow', productName: '', productSku: '',
  serialNumber: '', purchaseDate: '', purchaseChannel: 'batteriq.com',
}

interface SuccessState {
  registrationNumber: string
  warrantyEnd: string
  warrantyMonths: number
}

export default function WarrantyPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [error, setError] = useState('')

  const productType = form.productName ? getProductType(form.productName) : null
  const warrantyText = productType ? WARRANTY_DISPLAY[productType] : null

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          county: form.county,
          productBrand: form.productBrand,
          productName: form.productName,
          productSku: form.productSku,
          serialNumber: form.serialNumber,
          purchaseDate: form.purchaseDate,
          purchaseChannel: form.purchaseChannel,
          productType: productType ?? 'Accessory',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.')
        return
      }

      setSuccess({
        registrationNumber: data.registrationNumber,
        warrantyEnd: data.warrantyEnd,
        warrantyMonths: data.warrantyMonths,
      })
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <Header />
        <PageHero
          title="Warranty Registered!"
          bgGradient="linear-gradient(135deg, #003300 0%, #006600 100%)"
          height="small"
          align="center"
        />
        <section className="py-20 bg-white">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Product Registered ✅</h1>
            <p className="text-gray-500 mb-8">Your product is now covered. Save your registration number below.</p>

            <div className="bg-gray-50 rounded-3xl p-8 text-left space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Registration Number</span>
                <span className="text-sm font-black text-blue-600 font-mono">{success.registrationNumber}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Warranty Period</span>
                <span className="text-sm font-bold text-gray-900">{success.warrantyMonths} months</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Warranty Expires</span>
                <span className="text-sm font-bold text-gray-900">
                  {new Date(success.warrantyEnd).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-5 text-left mb-8">
              <p className="text-sm font-bold text-blue-900 mb-1">To make a warranty claim:</p>
              <p className="text-sm text-blue-700">
                Contact Batteriq on WhatsApp or email with your registration number{' '}
                <strong>{success.registrationNumber}</strong>.
                A confirmation email has also been sent to you.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                Back to Shop
              </a>
              <button
                onClick={() => setSuccess(null)}
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-blue-400 transition-all"
              >
                Register Another
              </button>
            </div>
          </div>
        </section>
        <Footer />
        <GeminiChatWidget />
      </>
    )
  }

  return (
    <>
      <Header />
      <ToastContainer />

      <PageHero
        title="Warranty Registration"
        subtitle="Register your EcoFlow product to activate your official Batteriq warranty and ensure full after-sales support in Kenya."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Support', href: '/support' },
          { label: 'Warranty Registration', href: '/support/warranty' },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #000080 100%)"
        height="small"
      />

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Register Your Product</h2>
              <p className="text-gray-500 text-sm mb-8">All fields marked * are required.</p>

              {error && (
                <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer details */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Your Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', field: 'firstName' as const, placeholder: 'John', type: 'text' },
                      { label: 'Last Name', field: 'lastName' as const, placeholder: 'Kamau', type: 'text' },
                      { label: 'Email Address', field: 'email' as const, placeholder: 'john@example.com', type: 'email' },
                      { label: 'Phone Number', field: 'phone' as const, placeholder: '0712 345 678', type: 'tel' },
                    ].map(f => (
                      <div key={f.field}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label} *</label>
                        <input
                          type={f.type}
                          required
                          placeholder={f.placeholder}
                          value={form[f.field]}
                          onChange={e => set(f.field, e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">County *</label>
                    <select
                      required
                      value={form.county}
                      onChange={e => set('county', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white transition-all"
                    >
                      <option value="">Select your county</option>
                      {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Product details */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Product Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand *</label>
                      <div className="flex gap-3">
                        {['EcoFlow', 'Bluetti'].map(brand => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => { set('productBrand', brand); set('productName', '') }}
                            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                              form.productBrand === brand
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Model *</label>
                      {form.productBrand === 'EcoFlow' ? (
                        <select
                          required
                          value={form.productName}
                          onChange={e => set('productName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white transition-all"
                        >
                          <option value="">Select your EcoFlow product</option>
                          {ECOFLOW_PRODUCTS.map(p => (
                            <option key={p} value={`EcoFlow ${p}`}>EcoFlow {p}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder="e.g. Bluetti AC200PL"
                          value={form.productName}
                          onChange={e => set('productName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        />
                      )}
                    </div>

                    {/* Warranty preview */}
                    {warrantyText && (
                      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Warranty Coverage</p>
                          <p className="text-sm text-green-700 font-semibold">{warrantyText}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Serial Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="Found on product label or box"
                          value={form.serialNumber}
                          onChange={e => set('serialNumber', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 font-mono uppercase transition-all"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Usually on a sticker on the back or bottom of the unit
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Purchase Date *</label>
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={form.purchaseDate}
                          onChange={e => set('purchaseDate', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Where did you purchase? *</label>
                      <select
                        required
                        value={form.purchaseChannel}
                        onChange={e => set('purchaseChannel', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white transition-all"
                      >
                        <option value="batteriq.com">Batteriq Website (batteriq.com)</option>
                        <option value="batteriq-nairobi">Batteriq Nairobi Showroom</option>
                        <option value="phone-order">Phone / WhatsApp Order</option>
                        <option value="reseller">Authorised Batteriq Reseller</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</>
                  ) : (
                    <><Shield className="w-5 h-5" /> Activate Warranty</>
                  )}
                </button>
              </form>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <div className="bg-[#00004d] rounded-3xl p-7 text-white">
                <Shield className="w-8 h-8 text-blue-300 mb-4" />
                <h3 className="text-lg font-black mb-3">Official EcoFlow Warranty</h3>
                <p className="text-blue-200 text-sm leading-relaxed mb-6">
                  As Kenya&apos;s authorised EcoFlow distributor, all warranty claims are handled
                  locally by Batteriq. No need to ship products internationally.
                </p>
                <div className="space-y-3">
                  {[
                    { type: 'Power Stations', period: '24 months' },
                    { type: 'Solar Panels', period: '24 months + 5yr power' },
                    { type: 'Extra Batteries', period: '24 months' },
                    { type: 'Smart Generators', period: '24 months' },
                    { type: 'Accessories', period: '12 months' },
                  ].map(w => (
                    <div key={w.type} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-blue-200 text-sm">{w.type}</span>
                      <span className="text-white font-bold text-sm">{w.period}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6">
                <h3 className="text-base font-black text-gray-900 mb-3">Why Register?</h3>
                <ul className="space-y-3">
                  {[
                    'Faster warranty claim processing',
                    'Email confirmation with expiry date',
                    'Proof of purchase on file',
                    'Access to product updates & alerts',
                    'Priority support from our team',
                  ].map(r => (
                    <li key={r} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
