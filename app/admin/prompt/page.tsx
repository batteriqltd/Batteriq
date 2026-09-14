import { PromptForm } from './_PromptForm'

export const dynamic = 'force-dynamic'

export default function AdminPromptPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-12 min-h-screen">
      <div className="flex flex-col gap-2 mb-6 sm:mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0000ff]">Payments — Manual STK</p>
        <h1 className="text-[24px] sm:text-[32px] font-black text-gray-900 tracking-tight leading-none">Prompt Client</h1>
        <p className="text-[11px] sm:text-sm font-medium text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Send M-Pesa PIN prompt to any phone — for offline / phone orders
        </p>
      </div>

      <PromptForm />
    </div>
  )
}
