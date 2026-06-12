import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, User, Bot, Clock, Sparkles, ShoppingCart, ArrowRight, UserCheck } from 'lucide-react'
import type { AiChatSession } from '@/lib/supabase/types'

export const revalidate = 30

export default async function AdminChatMonitorPage() {
  const supabase = createAdminClient()
  const { data: rawSessions } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .order('last_active', { ascending: false })
    .limit(50)
  const sessions = rawSessions as unknown as AiChatSession[]

  return (
    <div className="p-8 pb-12 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Intelligence Monitor</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Supervising {sessions?.length ?? 0} active Gemini session streams
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-11 px-5 rounded-2xl bg-white border border-gray-100 flex items-center gap-2 shadow-sm text-blue-600 font-black text-[11px] uppercase tracking-widest">
            <Sparkles size={16} />
            GEMINI-1.5-FLASH LIVE
          </div>
        </div>
      </div>

      {(!sessions || sessions.length === 0) ? (
        <div
          className="bg-white rounded-[32px] p-24 text-center border border-dashed border-gray-200"
          style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
        >
          <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={32} className="text-gray-200" />
          </div>
          <p className="text-[18px] font-black text-gray-900 tracking-tight mb-2">Nexus Offline</p>
          <p className="text-gray-400 font-medium max-w-xs mx-auto text-sm">When customers interact with the AI assistant, their live conversation streams will aggregate here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((session: AiChatSession) => {
            const msgs = Array.isArray(session.messages)
              ? (session.messages as Array<{ role: string; content: string }>)
              : []
            return (
              <div
                key={session.id}
                className="bg-white rounded-[28px] border border-gray-50 overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-900/5 group"
                style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
              >
                {/* Session header */}
                <div
                  className="px-8 py-5 border-b border-gray-50 flex items-center justify-between"
                  style={{ background: 'linear-gradient(90deg, #f8faff 0%, #ffffff 100%)' }}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ background: 'linear-gradient(135deg, #0000ff, #00004d)' }}
                    >
                      <User size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-gray-900 tracking-tight">{session.guest_name ?? 'Anonymous Operator'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={11} className="text-blue-500" />
                          INITIATED {new Date(session.started_at).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{msgs.length} EXCHANGES</span>
                    </div>
                    {session.order_generated && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-50 border border-green-100 shadow-sm shadow-green-100 animate-bounce">
                        <ShoppingCart size={12} className="text-green-600" />
                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">ORDER CONVERTED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message history */}
                <div className="px-8 py-8 space-y-4 bg-gray-50/30">
                  {msgs.slice(-8).map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                          msg.role === 'assistant' ? 'bg-[#00004d]' : 'bg-white border border-gray-100'
                        }`}
                      >
                        {msg.role === 'assistant' ? <Bot size={14} className="text-blue-400" /> : <User size={14} className="text-gray-400" />}
                      </div>
                      <div
                        className={`max-w-[80%] px-5 py-4 rounded-[20px] text-[14px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                          msg.role === 'user'
                            ? 'bg-[#0000ff] text-white rounded-tr-none font-medium'
                            : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none font-medium'
                        }`}
                      >
                        {typeof msg.content === 'string'
                          ? msg.content
                          : ''}
                      </div>
                    </div>
                  ))}
                  {msgs.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center opacity-40">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping mb-3" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">LISTENING FOR INPUT…</p>
                    </div>
                  )}
                </div>

                <div className="px-8 py-4 bg-white border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">SESSION ID: {session.id.slice(0, 8).toUpperCase()}</span>
                  <button className="text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest flex items-center gap-2 group">
                    Inspect Full Stream
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}