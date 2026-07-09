import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { MessageCard } from '@/components/admin/MessageCard'
import type { ContactSubmission } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, error } = await (supabase.from('contact_submissions') as any)
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(100) as { data: ContactSubmission[] | null; error: { message: string } | null }

  const newCount = messages?.filter((m) => m.status === 'new').length ?? 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff] mb-2.5">Customer Support</p>
          <h1 className="text-[24px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Messages</h1>
          <p className="text-gray-400 text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {messages?.length ?? 0} message{(messages?.length ?? 0) !== 1 ? 's' : ''}
            {newCount > 0 && <span className="text-blue-600 font-black">· {newCount} new</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-red-700 text-sm">Could not load messages</p>
            <p className="text-red-500 text-xs font-medium mt-1 break-words">
              {error.message}. Refresh the page — if this keeps happening, check the Supabase service role key.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {messages?.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}

        {!error && (!messages || messages.length === 0) && (
          <div
            className="bg-white rounded-3xl p-12 sm:p-24 text-center border border-dashed border-gray-200"
            style={{ boxShadow: '0 2px 20px rgba(0,0,64,0.06)' }}
          >
            <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center mx-auto mb-6">
              <MessageSquare size={32} className="text-gray-200" />
            </div>
            <p className="text-[18px] font-black text-gray-900 tracking-tight mb-2">Inbox Empty</p>
            <p className="text-gray-400 font-medium max-w-xs mx-auto text-sm">When customers reach out via the contact form, their messages will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
