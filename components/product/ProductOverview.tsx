import Link from 'next/link'
import { ReadMore } from '@/components/seo/ReadMore'
import type { Paragraph } from '@/lib/productContent'

export function Segments({ paragraph }: { paragraph: Paragraph }) {
  return (
    <>
      {paragraph.map((s, i) =>
        typeof s === 'string' ? (
          <span key={i}>{s}</span>
        ) : (
          <Link key={i} href={s.href} className="text-blue-600 font-semibold hover:underline">
            {s.text}
          </Link>
        )
      )}
    </>
  )
}

/** "Overview" below Full Specifications, same heading style. Built from specs only. */
export function ProductOverview({ paragraphs }: { paragraphs: Paragraph[] }) {
  if (!paragraphs.length) return null
  const [first, ...rest] = paragraphs
  const p = (para: Paragraph, i: number) => (
    <p key={i} className="text-gray-600 leading-relaxed">
      <Segments paragraph={para} />
    </p>
  )
  return (
    <section className="max-w-8xl mx-auto px-4 lg:px-8 pb-16" aria-labelledby="product-overview-heading">
      <h2 id="product-overview-heading" className="font-display font-bold text-gray-900 text-2xl mb-6">
        Overview
      </h2>
      <div className="max-w-3xl">
        <ReadMore lead={p(first, 0)}>{rest.length ? rest.map((para, i) => p(para, i + 1)) : null}</ReadMore>
      </div>
    </section>
  )
}
