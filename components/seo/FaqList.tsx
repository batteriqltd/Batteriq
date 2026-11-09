import type { Faq } from '@/lib/seo'

/**
 * The site's FAQ accordion (native <details>, so every answer is in the server
 * HTML). Extracted unchanged from ProductFaq so category pages use the same one.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-2xl border border-gray-100 bg-white overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}
        >
          <summary className="flex items-start justify-between gap-4 cursor-pointer list-none px-5 py-4 sm:px-6 sm:py-5">
            <h3 className="text-[15px] sm:text-base font-bold text-gray-900 leading-snug">
              {faq.question}
            </h3>
            <span
              className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 -mt-1">
            <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
