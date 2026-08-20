import type { Faq } from '@/lib/seo'

/**
 * Visible FAQ block for product pages.
 *
 * Uses native <details>/<summary> so it stays a server component and the answer
 * text is always present in the HTML — which matters twice over: Google requires
 * FAQ schema to match visible on-page content, and the answers themselves are
 * what rank for "how much is X in kenya" style long-tail queries.
 */
export function ProductFaq({ faqs, productName }: { faqs: Faq[]; productName: string }) {
  if (!faqs.length) return null

  return (
    <section
      className="max-w-8xl mx-auto px-4 lg:px-8 pb-16"
      aria-labelledby="product-faq-heading"
    >
      <h2
        id="product-faq-heading"
        className="font-display font-bold text-gray-900 text-2xl mb-2"
      >
        {productName} — Frequently Asked Questions
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Common questions from Kenyan buyers. Still unsure?{' '}
        <a
          href="https://wa.me/254716822014"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-green-600 hover:underline"
        >
          Ask us on WhatsApp
        </a>
        .
      </p>

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
    </section>
  )
}
