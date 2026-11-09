import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { ANSWER_GROUPS, ALL_ANSWERS, AEO_LAST_REVIEWED, answerText } from '@/lib/aeo'
import { articleJsonLd, breadcrumbListJsonLd, jsonLdScript } from '@/lib/structuredData'

/** First published (git history of this page). */
const AEO_PUBLISHED = '2026-11-02'

export const metadata: Metadata = withCanonical('/answers', {
  title: 'Backup Power in Kenya — Straight Answers',
  description:
    'Direct answers on buying EcoFlow and BLUETTI in Kenya: where to buy, M-Pesa payment, what size power station you need for KPLC blackouts, solar charging, warranty and delivery.',
  openGraph: {
    title: 'Backup Power in Kenya — Straight Answers | Batteriq',
    description: 'Where to buy EcoFlow in Kenya, sizing a power station for blackouts, M-Pesa payment, solar, warranty and delivery.',
    type: 'article',
  },
})

// FAQPage schema must mirror the visible text below (Google policy), which it
// does because both are rendered from lib/aeo.ts.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ALL_ANSWERS.map(a => ({
    '@type': 'Question',
    name: a.question,
    acceptedAnswer: { '@type': 'Answer', text: answerText(a) },
  })),
}

// The page is a buyer's guide: an Article, dated by its visible "Last reviewed" line.
const articleSchema = {
  ...articleJsonLd({
    path: '/answers',
    headline: 'Backup Power in Kenya — Straight Answers',
    description:
      'Direct answers on buying EcoFlow and BLUETTI in Kenya: where to buy, M-Pesa payment, sizing a power station for KPLC blackouts, solar charging, warranty and delivery.',
    datePublished: AEO_PUBLISHED,
    dateModified: AEO_LAST_REVIEWED,
  }),
  about: ['Portable power stations', 'EcoFlow', 'BLUETTI', 'Solar power in Kenya', 'KPLC power outages'],
  // Voice assistants read these elements aloud as the answer.
  speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.aeo-short'] },
}

export default function AnswersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(articleSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Answers', path: '/answers' }]))} />
      <Header />
      <ToastContainer />

      <PageHero
        title="Backup Power in Kenya — Straight Answers"
        subtitle="Short, direct answers to the questions Kenyans ask most about power stations, solar, M-Pesa payment, warranty and delivery."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Answers', href: '/answers' },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        badge="Buyer's Guide"
        height="small"
      />

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          {/* Table of contents — plain anchor links help both readers and crawlers */}
          <nav aria-label="Questions on this page" className="mb-14 rounded-2xl bg-slate-50 p-6">
            <p className="font-display font-bold text-gray-900 mb-3">On this page</p>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {ALL_ANSWERS.map(a => (
                <li key={a.id}>
                  <a href={`#${a.id}`} className="text-blue-700 hover:underline">
                    {a.question}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {ANSWER_GROUPS.map(group => (
            <div key={group.title} className="mb-14">
              <h2 className="font-display text-2xl font-black text-gray-900 mb-6">{group.title}</h2>
              <div className="space-y-8">
                {group.answers.map(a => (
                  <article key={a.id} id={a.id} className="scroll-mt-28 border-l-4 border-blue-600 pl-5">
                    <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{a.question}</h3>
                    <p className="aeo-short text-gray-800 leading-relaxed">{a.short}</p>
                    {a.detail?.map(d => (
                      <p key={d} className="mt-2 text-gray-600 leading-relaxed">
                        {d}
                      </p>
                    ))}
                    {a.link && (
                      <Link href={a.link.href} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
                        {a.link.label} →
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))}

          <p className="text-sm text-gray-400">
            Last reviewed{' '}
            <time dateTime={AEO_LAST_REVIEWED}>
              {new Date(AEO_LAST_REVIEWED).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>{' '}
            by the Batteriq team, Nairobi.
          </p>

          <div className="mt-12 text-center bg-blue-50 rounded-3xl p-10">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Need a system sized for your home?</h2>
            <p className="text-gray-500 mb-6">Send us your appliance list and we will recommend the right setup — free.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://wa.me/254716822014"
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
              >
                WhatsApp Us
              </a>
              <Link href="/support/faq" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">
                More FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
