'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Phone, MapPin, Send, Lock, Shield, CheckCircle, Smartphone } from 'lucide-react'
import { WhatsAppIcon, EmailIcon, InstagramIcon, FacebookIcon, TikTokIcon, LinkedInIcon } from '@/components/ui/ContactIcons'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ToastContainer } from '@/components/ui/Toast'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { motion, AnimatePresence } from 'framer-motion'

type Status = 'idle' | 'loading' | 'success' | 'error'

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export default function ContactPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inquiryType, setInquiryType] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, inquiryType, message }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const inputClass = 'w-full h-14 px-5 rounded-2xl text-gray-900 text-sm font-semibold bg-[#f8f9ff] border border-gray-100 placeholder-gray-300 focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all'

  const SOCIAL_LINKS = [
    { label: 'Instagram', href: 'https://instagram.com/batteriqkenya', icon: <InstagramIcon size={22} /> },
    { label: 'Facebook', href: 'https://facebook.com/batteriqkenya', icon: <FacebookIcon size={22} /> },
    { label: 'TikTok', href: 'https://tiktok.com/@batteriqkenya', icon: <TikTokIcon size={22} /> },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/batteriq', icon: <LinkedInIcon size={22} /> },
  ]

  return (
    <>
      <Header />
      <ToastContainer />

      <main className="min-h-screen bg-[#f8f9fa]">

        {/* HERO — full width image with overlay text */}
        <div className="relative w-full overflow-hidden" style={{ height: 'clamp(320px, 45vh, 520px)' }}>
          <Image
            src="/images/batteriq-team.jpg"
            alt="Batteriq Team"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,77,0.82) 0%, rgba(0,0,30,0.65) 50%, rgba(0,0,77,0.45) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="text-[11px] font-black text-blue-300 uppercase tracking-[0.25em] mb-4">Batteriq Kenya — Official Support</p>
              <h1 className="text-white font-black tracking-tight mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
                Get in Touch
              </h1>
              <p className="text-blue-100 font-medium max-w-lg mx-auto" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.1rem)' }}>
                Kenya&apos;s authorised EcoFlow &amp; BLUETTI dealer. Our team responds within 2 hours during business hours.
              </p>
            </motion.div>
          </div>
        </div>

        {/* QUICK CONTACT STRIP */}
        <div className="bg-[#00004d] py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              <a href="tel:+254716822014" className="flex items-center gap-3 text-white hover:text-blue-200 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <Phone size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest">Call Us</p>
                  <p className="text-sm font-black">0716 822 014</p>
                </div>
              </a>
              <a href="https://wa.me/254716822014" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-green-300 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <WhatsAppIcon size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest">WhatsApp</p>
                  <p className="text-sm font-black">Instant Reply</p>
                </div>
              </a>
              <a href="mailto:info@batteriq.com" className="flex items-center gap-3 text-white hover:text-blue-200 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <EmailIcon size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest">Email</p>
                  <p className="text-sm font-black">info@batteriq.com</p>
                </div>
              </a>
              <div className="flex items-center gap-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest">Location</p>
                  <p className="text-sm font-black">Nairobi, Kenya</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* LEFT — Contact Form */}
            <div className="lg:col-span-7">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden" style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.06)' }}>

                  {/* Form header */}
                  <div className="px-8 sm:px-10 pt-10 pb-8 border-b border-gray-50">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">Send us a message</h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed">
                      Have a question about EcoFlow products, pricing, or delivery? We respond within 2 hours during business hours.
                    </p>
                  </div>

                  <div className="p-8 sm:p-10">
                    <AnimatePresence mode="wait">
                      {status === 'success' ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-12"
                        >
                          <div className="w-20 h-20 rounded-[24px] bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                            <CheckCircle className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Message Received</h3>
                          <p className="text-gray-500 text-sm font-medium mb-8 max-w-sm mx-auto leading-relaxed">
                            Thank you, {firstName}. We&apos;ll get back to you within 2 hours at {email}.
                          </p>
                          <button
                            onClick={() => {
                              setStatus('idle')
                              setFirstName(''); setLastName(''); setEmail('')
                              setPhone(''); setInquiryType(''); setMessage('')
                            }}
                            className="text-[#0000ff] font-black text-xs uppercase tracking-widest hover:text-blue-800 transition-colors"
                          >
                            Send another message →
                          </button>
                        </motion.div>
                      ) : (
                        <motion.form key="form" onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">First Name</label>
                              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Samuel" className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Last Name</label>
                              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Okoth" className={inputClass} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Email Address</label>
                              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="samuel@email.com" className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Phone Number</label>
                              <div className="relative">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                  <span className="text-base leading-none">🇰🇪</span>
                                  <div className="w-px h-4 bg-gray-200 mx-1" />
                                </div>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XX XXX XXX"
                                  className="w-full h-14 pl-16 pr-5 rounded-2xl text-gray-900 text-sm font-semibold bg-[#f8f9ff] border border-gray-100 placeholder-gray-300 focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Inquiry Type</label>
                            <select value={inquiryType} onChange={(e) => setInquiryType(e.target.value)}
                              className="w-full h-14 px-5 rounded-2xl text-gray-900 text-sm font-semibold bg-[#f8f9ff] border border-gray-100 focus:bg-white focus:border-[#0000ff] outline-none transition-all appearance-none cursor-pointer">
                              <option value="">Select an inquiry type</option>
                              <option>Product Information &amp; Pricing</option>
                              <option>Place an Order</option>
                              <option>Warranty &amp; After-Sales Support</option>
                              <option>Delivery &amp; Shipping</option>
                              <option>Bulk / Business Order</option>
                              <option>Technical Support</option>
                              <option>Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Your Message</label>
                            <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                              placeholder="Tell us how we can help you..."
                              className="w-full p-5 rounded-2xl text-gray-900 text-sm font-semibold bg-[#f8f9ff] border border-gray-100 placeholder-gray-300 focus:bg-white focus:border-[#0000ff] focus:ring-4 focus:ring-[#0000ff08] outline-none transition-all resize-none" />
                          </div>

                          {status === 'error' && (
                            <p className="text-red-500 text-xs font-bold uppercase tracking-wider bg-red-50 px-4 py-3 rounded-xl">
                              Error sending message. Please try again or WhatsApp us directly.
                            </p>
                          )}

                          <button type="submit" disabled={status === 'loading'}
                            className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-[0.15em] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:-translate-y-0.5 active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #0000ff 0%, #00004d 100%)', boxShadow: '0 8px 32px rgba(0,0,255,0.25)' }}>
                            {status === 'loading' ? <Loader2 className="w-5 h-5" /> : <><Send className="w-4 h-4" /> Send Message</>}
                          </button>

                          <div className="flex items-center justify-center gap-3">
                            <Lock size={11} className="text-gray-300" />
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Secured · 256-bit SSL Encryption</p>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT — Info Panel */}
            <div className="lg:col-span-5 space-y-6">

              {/* Direct Support Channels */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <div className="rounded-[2rem] overflow-hidden" style={{ background: 'linear-gradient(160deg, #00004d 0%, #000080 100%)', boxShadow: '0 4px 40px rgba(0,0,77,0.2)' }}>
                  <div className="p-8 sm:p-10">
                    <h3 className="text-xl font-black text-white tracking-tight mb-1">Direct Support</h3>
                    <p className="text-blue-300 text-xs font-medium mb-8">Available Mon–Sat, 8:30AM–6:00PM</p>

                    <div className="space-y-4">
                      {[
                        {
                          icon: <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center"><Smartphone size={18} className="text-white" /></div>,
                          label: 'Call Us',
                          value: '0716 822 014',
                          href: 'tel:+254716822014',
                          sub: 'Mon–Sat, 8:30AM–6:00PM',
                          external: false,
                        },
                        {
                          icon: <div className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center"><WhatsAppIcon size={20} /></div>,
                          label: 'WhatsApp',
                          value: '0716 822 014',
                          href: 'https://wa.me/254716822014?text=Hi Batteriq! I need help.',
                          sub: 'Instant reply · 24/7 monitoring',
                          external: true,
                        },
                        {
                          icon: <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center"><EmailIcon size={20} /></div>,
                          label: 'Email',
                          value: 'info@batteriq.com',
                          href: 'mailto:info@batteriq.com',
                          sub: 'Response within 2 hours',
                          external: false,
                        },
                      ].map((item, i) => (
                        <a key={i} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all group">
                          <div className="flex-shrink-0 group-hover:scale-110 transition-transform">{item.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-blue-300 font-black uppercase tracking-[0.15em]">{item.label}</p>
                            <p className="text-white font-black text-base truncate">{item.value}</p>
                            <p className="text-blue-400 text-[10px] font-medium mt-0.5">{item.sub}</p>
                          </div>
                          <div className="text-white/20 group-hover:text-white/60 transition-colors text-lg">→</div>
                        </a>
                      ))}
                    </div>

                    {/* Social Media */}
                    <div className="mt-8 pt-8 border-t border-white/10">
                      <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mb-5">Follow Us</p>
                      <div className="grid grid-cols-4 gap-3">
                        {SOCIAL_LINKS.map((s) => (
                          <Link key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/20 transition-all group">
                            <div className="group-hover:scale-110 transition-transform">{s.icon}</div>
                            <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider">{s.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Business Hours */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <h4 className="font-black text-gray-900 text-base mb-5">Business Hours</h4>
                  <div className="space-y-3">
                    {[
                      { day: 'Monday – Friday', hours: '8:30 AM – 6:00 PM', active: true },
                      { day: 'Saturday', hours: '9:00 AM – 4:00 PM', active: true },
                      { day: 'Sunday', hours: 'Closed', active: false },
                    ].map((h) => (
                      <div key={h.day} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm font-bold text-gray-600">{h.day}</span>
                        <span className={`text-sm font-black ${h.active ? 'text-gray-900' : 'text-gray-300'}`}>{h.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Authorised Dealer Badge */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                <div className="rounded-[2rem] p-8 text-white flex items-center gap-5"
                  style={{ background: 'linear-gradient(135deg, #0000ff 0%, #0000cc 100%)', boxShadow: '0 8px 32px rgba(0,0,255,0.2)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg tracking-tight">Authorised Dealer</h4>
                    <p className="text-blue-100 text-xs font-medium leading-relaxed mt-1">
                      Official EcoFlow &amp; BLUETTI distribution hub for Kenya. All products carry full manufacturer warranty.
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
