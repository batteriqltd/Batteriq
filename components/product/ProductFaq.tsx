import type { Faq } from '@/lib/seo'
import { FaqList } from '@/components/seo/FaqList'

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

      <FaqList faqs={faqs} />
    </section>
  )
}
