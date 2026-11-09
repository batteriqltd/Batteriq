import { ReadMore } from '@/components/seo/ReadMore'
import { FaqList } from '@/components/seo/FaqList'
import { Segments } from '@/components/product/ProductOverview'
import type { CategoryContent } from '@/lib/categoryContent'

/**
 * "About … in Kenya" + FAQ, placed BELOW a category grid. The first paragraph
 * shows; the rest opens with "Read more" and is always in the server HTML.
 * No FAQPage markup is added for these questions (FAQ rich results are gone).
 */
export function CategoryAbout({ content, showFaqs = true }: { content: CategoryContent | null; showFaqs?: boolean }) {
  if (!content) return null
  const [first, ...rest] = content.paragraphs
  const p = (para: CategoryContent['paragraphs'][number], i: number) => (
    <p key={i} className="text-gray-600 leading-relaxed">
      <Segments paragraph={para} />
    </p>
  )
  return (
    <section className="bg-white border-t border-gray-100 py-16" aria-labelledby="category-about-heading">
      <div className="max-w-4xl mx-auto px-6">
        <h2 id="category-about-heading" className="text-2xl font-black text-gray-900 mb-4">
          {content.heading}
        </h2>
        <ReadMore lead={p(first, 0)}>{rest.length ? rest.map((para, i) => p(para, i + 1)) : null}</ReadMore>
        {showFaqs && content.faqs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Frequently asked questions</h2>
            <FaqList faqs={content.faqs} />
          </div>
        )}
      </div>
    </section>
  )
}
