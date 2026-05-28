import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { HelpCircle, BookOpen, Shield, MessageCircle, Phone, Mail, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Support & Help | Batteriq Kenya',
  description: 'Official EcoFlow & Bluetti support hub in Kenya. FAQ, product manuals, and warranty registration.',
}

export default function SupportPage() {
  return (
    <>
      <Header />
      <ToastContainer />

      <PageHero
        title="Support & Help Center"
        subtitle="Experience comprehensive care for your power systems. Access technical documentation, warranty services, and expert guidance."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Support', href: '/support' }]}
        bgGradient="linear-gradient(135deg, #020617 0%, #1e1b4b 60%, #1e40af 100%)"
        height="small"
        align="center"
      />

      {/* Support Cards */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                href: '/support/faq',
                icon: HelpCircle,
                color: 'blue',
                title: 'Help & FAQ',
                desc: 'Comprehensive answers regarding EcoFlow systems, local M-Pesa payments, and Nairobi-wide logistics.',
                cta: 'Browse Help Articles',
                delay: 0,
              },
              {
                href: '/support/manuals',
                icon: BookOpen,
                color: 'indigo',
                title: 'Technical Manuals',
                desc: 'Access official technical documentation, installation guides, and specifications for all EcoFlow series.',
                cta: 'Download Manuals',
                delay: 100,
              },
              {
                href: '/support/warranty',
                icon: Shield,
                color: 'emerald',
                title: 'Warranty Center',
                desc: 'Activate your official 24-month Kenyan warranty and secure priority after-sales technical support.',
                cta: 'Register Product',
                delay: 200,
              },
            ].map(card => (
              <Link
                key={card.href}
                href={card.href}
                data-aos="fade-up"
                data-aos-duration="600"
                data-aos-delay={card.delay}
                data-aos-once="true"
                className="group bg-white rounded-[2rem] border border-slate-100 p-8 sm:p-10 hover:border-blue-600/20 hover:shadow-ambient transition-all duration-300 flex flex-col h-full"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-sm transition-transform duration-500 group-hover:scale-110 ${
                  card.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  <card.icon className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 flex-1">{card.desc}</p>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 group-hover:text-blue-800 transition-colors">
                  {card.cta} <ChevronRight size={14} strokeWidth={3} />
                </span>
              </Link>
            ))}
          </div>

          {/* Direct contact strip */}
          <div className="mt-16 bg-white rounded-[2rem] border border-slate-100 p-8 sm:p-12 shadow-ambient">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Need direct assistance?</h2>
              <p className="text-slate-500 text-sm font-medium">Our technical sales engineers are standing by to provide expert guidance on your power requirements.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Phone, label: 'Official Line', value: '0716 822 014', sub: 'Mon–Sat, 8AM–6PM' },
                { icon: MessageCircle, label: 'WhatsApp Hub', value: '0716 822 014', sub: 'Active Response' },
                { icon: Mail, label: 'Email Support', value: 'info@batteriq.com', sub: '2-hour Response' },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-5 bg-slate-50/50 rounded-2xl p-6 border border-slate-100/50 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100 group-hover:border-blue-600/20 group-hover:bg-blue-50 transition-all">
                    <c.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{c.label}</p>
                    <p className="text-sm font-bold text-slate-900 font-mono tracking-tight">{c.value}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
