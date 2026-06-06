'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, MapPin, MessageCircle, CheckCircle, Smartphone, Send, Lock, Shield } from 'lucide-react'
import { WhatsAppIcon, EmailIcon } from '@/components/ui/ContactIcons'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { motion } from 'framer-motion'

type Status = 'idle' | 'loading' | 'success' | 'error'

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

  const inputClass =
    'w-full h-14 px-5 rounded-xl text-slate-900 text-sm font-semibold bg-slate-50 border border-slate-200 placeholder-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all'

  return (
    <>
      <Header />
      <ToastContainer />
      <PageHero
        title="Get in Touch"
        subtitle="Experience world-class support. We're here to help you find the perfect energy solution for your home or business."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Contact', href: '/contact' },
        ]}
        bgGradient="linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #1e3a8a 100%)"
        height="small"
        align="center"
      />

      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* LEFT — Form Module */}
            <div className="lg:col-span-7" data-aos="fade-up" data-aos-duration="600" data-aos-once="true">
              <div className="bg-white rounded-[2rem] shadow-ambient border border-slate-100 overflow-hidden">
                <div className="p-8 sm:p-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">Send us a message</h2>
                  <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed max-w-lg">
                    Have a question about EcoFlow products, pricing, or delivery? Our energy experts respond within 2 hours during business hours.
                  </p>

                  {status === 'success' ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-50 border border-slate-100 rounded-3xl p-10 text-center shadow-inner"
                    >
                      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
                        <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Message Received</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">
                        Thank you, {firstName}. We'll get back to you within 2 hours at {email}.
                      </p>
                      <button
                        onClick={() => {
                          setStatus('idle')
                          setFirstName(''); setLastName(''); setEmail('')
                          setPhone(''); setInquiryType(''); setMessage('')
                        }}
                        className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:text-blue-800 transition-colors"
                      >
                        Send another message →
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">First Name</label>
                          <input
                            type="text" required value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Samuel"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Last Name</label>
                          <input
                            type="text" required value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Okoth"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Email Address</label>
                          <input
                            type="email" required value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="samuel@email.com"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Phone Number</label>
                          <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                              <span className="text-base leading-none">🇰🇪</span>
                              <div className="w-px h-4 bg-slate-200 mx-1" />
                            </div>
                            <input
                              type="tel" value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="7XX XXX XXX"
                              className="w-full h-14 pl-16 pr-5 rounded-xl text-slate-900 text-sm font-semibold bg-slate-50 border border-slate-200 placeholder-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Inquiry Type</label>
                        <select
                          value={inquiryType}
                          onChange={(e) => setInquiryType(e.target.value)}
                          className="w-full h-14 px-5 rounded-xl text-slate-900 text-sm font-semibold bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 outline-none transition-all appearance-none cursor-pointer"
                        >
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Your Message</label>
                        <textarea
                          required rows={5} value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us how we can help you..."
                          className="w-full p-5 rounded-xl text-slate-900 text-sm font-semibold bg-slate-50 border border-slate-200 placeholder-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all resize-none"
                        />
                      </div>

                      {status === 'error' && (
                        <p className="text-red-500 text-xs font-bold uppercase tracking-wider">
                          Error sending message. Please try again or WhatsApp us.
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full h-16 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                      >
                        {status === 'loading' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <><Send className="w-4 h-4" /> Send Message</>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-3 pt-4">
                        <Lock size={12} className="text-slate-300" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Secured Transmission · 256-bit SSL
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — Contact Info Matrix */}
            <div className="lg:col-span-5 space-y-8" data-aos="fade-up" data-aos-duration="600" data-aos-once="true" data-aos-delay="100">
              <div className="bg-slate-900 rounded-[2rem] p-8 sm:p-10 text-white shadow-ambient">
                <h3 className="text-2xl font-bold mb-2 tracking-tight">Direct Support Channels</h3>
                <p className="text-slate-400 text-sm font-medium mb-10">Our authorised team is available to assist you across all official platforms.</p>

                <div className="space-y-6">
                  {[
                    {
                      icon: Smartphone,
                      label: 'Call / Phone',
                      value: '0716 822 014',
                      sub: 'Mon–Sat, 8AM–6PM',
                      color: 'bg-blue-600',
                    },
                    {
                      icon: MessageCircle,
                      label: 'Official WhatsApp',
                      value: '0716 822 014',
                      sub: 'Instant reply · 24/7 Monitoring',
                      color: 'bg-[#25D366]',
                    },
                    {
                      icon: Mail,
                      label: 'Email Support',
                      value: 'info@batteriq.com',
                      sub: 'Case response within 2 hours',
                      color: 'bg-blue-500',
                      extraEmail: 'batteriq@gmail.com',
                    },
                    {
                      icon: MapPin,
                      label: 'Main Office',
                      value: 'Nairobi, Kenya',
                      sub: 'Authorised Distribution Hub',
                      color: 'bg-slate-700',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-5 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                      <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                        {item.label === 'Official WhatsApp' ? (
                          <WhatsAppIcon size={22} />
                        ) : item.label === 'Email Support' ? (
                          <EmailIcon size={22} />
                        ) : (
                          <item.icon className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.15em] mb-1">{item.label}</p>
                        {item.label === 'Email Support' ? (
                          <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            <a href="mailto:info@batteriq.com"
                              className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-200 transition-colors">
                              <EmailIcon size={16} />
                              info@batteriq.com
                            </a>
                            <span className="text-gray-500 hidden sm:block">|</span>
                            <a href="mailto:batteriq@gmail.com"
                              className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-200 transition-colors">
                              <EmailIcon size={16} />
                              batteriq@gmail.com
                            </a>
                          </div>
                        ) : (
                          <p className="text-white font-bold text-lg font-mono tracking-tight">{item.value}</p>
                        )}
                        <p className="text-slate-400 text-[11px] font-medium mt-1">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mb-5">Social Connectivity</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'Instagram', href: 'https://instagram.com/batteriqkenya' },
                      { label: 'Facebook', href: 'https://facebook.com/batteriqkenya' },
                      { label: 'TikTok', href: '#' },
                    ].map((s) => (
                      <Link
                        key={s.label}
                        href={s.href}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all text-white text-[10px] font-bold uppercase tracking-widest"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Authorized Badge Card */}
              <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-ambient flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg tracking-tight">Authorised Dealer</h4>
                  <p className="text-blue-100 text-xs font-medium leading-relaxed">Official EcoFlow & Bluetti distribution hub for the Kenyan market. All products carry full warranty.</p>
                </div>
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

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}
