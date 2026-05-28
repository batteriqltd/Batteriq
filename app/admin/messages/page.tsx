import { createAdminClient } from '@/lib/supabase/admin'
import { Mail, Phone, MessageSquare, ExternalLink, MessageCircle, ArrowRight, UserCheck } from 'lucide-react'
import type { ContactSubmission } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (supabase.from('contact_submissions') as any)
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(100) as { data: ContactSubmission[] | null }

  return (
    <div className="p-8 pb-12 bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Inquiry Console</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Managing {messages?.length ?? 0} customer submissions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm text-blue-600 font-black text-[11px] uppercase tracking-widest">
            <UserCheck size={16} />
            OPERATOR ONLINE
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {messages?.map((m: ContactSubmission) => (
          <div
            key={m.id}
            className="bg-white rounded-[28px] p-8 transition-all hover:shadow-xl hover:shadow-blue-900/5 group"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
          >
            <div className="flex items-start justify-between gap-8 mb-8">
              <div className="flex items-center gap-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
                >
                  {m.first_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-[17px] font-black text-gray-900 tracking-tight">{m.first_name} {m.last_name}</p>
                    {m.status === 'new' && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-blue-600 text-white uppercase tracking-tighter animate-pulse shadow-lg shadow-blue-100">NEW</span>
                    )}
                  </div>
                  <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em]">
                    SUBMITTED {new Date(m.submitted_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {m.inquiry_type && (
                  <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-gray-50 text-gray-400 border border-gray-100 uppercase tracking-widest">
                    {m.inquiry_type}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <MessageSquare size={18} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
                  <Mail size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Email Identity</p>
                  <a href={`mailto:${m.email}`} className="text-[13px] font-black text-gray-900 hover:text-blue-600 transition-colors">{m.email}</a>
                </div>
              </div>
              {m.phone && (
                <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
                    <Phone size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Verified Phone</p>
                    <p className="text-[13px] font-black text-gray-900 font-mono uppercase">{m.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative group/msg">
              <div className="absolute -left-4 top-4 bottom-4 w-1 bg-blue-600 rounded-full opacity-0 group-hover/msg:opacity-100 transition-all shadow-[0_0_10px_rgba(0,0,255,0.5)]" />
              <div className="bg-gray-50/50 rounded-[24px] p-6 text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100 shadow-inner italic font-medium">
                "{m.message}"
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <a
                href={`mailto:${m.email}?subject=Re: Your inquiry to Batteriq`}
                className="h-12 px-8 rounded-2xl text-[12px] font-black text-white transition-all flex items-center gap-3 shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 uppercase tracking-widest"
                style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
              >
                <Mail size={16} />
                Send Email Reply
              </a>
              {m.phone && (
                <a
                  href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-8 rounded-2xl text-[12px] font-black text-white transition-all flex items-center gap-3 shadow-lg shadow-green-100 hover:scale-105 active:scale-95 uppercase tracking-widest"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  <MessageCircle size={16} />
                  WhatsApp Support
                </a>
              )}
              <div className="flex-1" />
              <button className="h-12 px-6 rounded-2xl text-[11px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
                Mark as read
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}

        {(!messages || messages.length === 0) && (
          <div
            className="bg-white rounded-[32px] p-24 text-center border border-dashed border-gray-200"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
          >
            <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center mx-auto mb-6">
              <MessageSquare size={32} className="text-gray-200" />
            </div>
            <p className="text-[18px] font-black text-gray-900 tracking-tight mb-2">Inbox Empty</p>
            <p className="text-gray-400 font-medium max-w-xs mx-auto text-sm">When customers reach out via the contact form, their inquiries will materialize here instantly.</p>
          </div>
        )}
      </div>
    </div>
  )
}