import { BadgePercent, MessageCircle } from 'lucide-react'

const WHATSAPP_QUOTE_URL =
  'https://wa.me/254716822014?text=Hi%20Batteriq!%20I%27d%20like%20a%20quote%20—%20please%20share%20your%20best%20bulk%20%26%20retail%20prices.'

export function BulkPricingBanner() {
  return (
    <section
      aria-label="Bulk and retail pricing"
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #000033 0%, #00004d 60%, #000099 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 85% 30%, rgba(0,194,255,0.18), transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-8xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:gap-4 sm:py-7 lg:flex-row lg:px-8 lg:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <BadgePercent size={20} className="text-white" />
          </span>
          <span>
            <span className="block text-base font-black text-white sm:text-lg" style={{ letterSpacing: '-0.01em' }}>
              We offer the best bulk &amp; retail prices
            </span>
            <span className="mt-0.5 block text-xs text-blue-200 sm:text-sm">
              Send your list on WhatsApp and get a fast quote — resellers welcome.
            </span>
          </span>
        </div>
        <a
          href={WHATSAPP_QUOTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#00a651] px-6 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-px hover:brightness-110 active:translate-y-0 sm:w-fit"
          style={{ boxShadow: '0 8px 24px rgba(0, 166, 81, 0.35)' }}
        >
          <MessageCircle size={17} />
          Get a Quote on WhatsApp
        </a>
      </div>
    </section>
  )
}
