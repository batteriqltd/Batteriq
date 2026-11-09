import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductCard } from '@/components/product/ProductCard'
import { Segments } from '@/components/product/ProductOverview'
import { newPageMetadata, type NewPagePath } from '@/lib/newPages'
import { getProductsBySlugs } from '@/lib/productContentServer'
import { COMPARISONS, comparisonRows, comparisonVerdicts, delivery } from '@/lib/newPageContent'
import { breadcrumbListJsonLd, collectionPageJsonLd, jsonLdScript } from '@/lib/structuredData'
import { productDisplayName } from '@/lib/seo'

export const revalidate = 300
export const dynamicParams = false

type PageProps = { params: { pair: string } }

const find = (pair: string) => COMPARISONS.find((c) => c.path === `/compare/${pair}`)

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ pair: c.path.replace('/compare/', '') }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const def = find(params.pair)
  if (!def) return {}
  return newPageMetadata(def.path as NewPagePath, {
    title: { absolute: `${def.title} | Batteriq` },
    description: `${def.h1}: side-by-side specs, live Kenyan prices and stock, and which to buy for runtime, bigger appliances, budget and portability.`,
  })
}

export default async function ComparisonPage({ params }: PageProps) {
  const def = find(params.pair)
  if (!def) notFound()
  const products = await getProductsBySlugs(def.slugs)
  if (products.length !== 2) notFound()
  const [a, b] = products
  const rows = comparisonRows(a, b)
  const verdicts = comparisonVerdicts(a, b)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbListJsonLd([{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }, { name: def.h1, path: def.path }]))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(collectionPageJsonLd({ path: def.path, name: def.h1, description: `Specs, prices and stock for the ${def.h1.replace(' vs ', ' and ')}.`, products }))}
      />
      <Header />
      <ToastContainer />
      <PageHero
        title={def.h1}
        subtitle="Side-by-side specs with live Kenyan prices and stock, and which one to buy for your needs."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Compare', href: '/compare' },
          { label: def.h1, href: def.path },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        height="small"
        align="left"
      />

      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-12 space-y-16">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-3xl">
          <ProductCard product={a} />
          <ProductCard product={b} />
        </div>

        <section>
          <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">Specifications</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-[8px]">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3.5 text-gray-500 font-medium w-1/4">Spec</th>
                  <th className="px-5 py-3.5 text-gray-900 font-bold">{productDisplayName(a)}</th>
                  <th className="px-5 py-3.5 text-gray-900 font-bold">{productDisplayName(b)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-gray-100">
                    <th scope="row" className="px-5 py-3.5 text-gray-500 font-medium text-left">{r.label}</th>
                    <td className="px-5 py-3.5 text-gray-900 font-mono">{r.a}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-mono">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {verdicts.length > 0 && (
          <section className="max-w-3xl">
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-6">Which should you buy?</h2>
            <ul className="space-y-3">
              {verdicts.map((v, i) => (
                <li key={i} className="text-gray-600 leading-relaxed">
                  <Segments paragraph={v} />
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mt-6">
              Runtimes are approximate (capacity × 0.85 ÷ appliance watts). Not sure? Send us your appliance list on WhatsApp, or build your own comparison on our{' '}
              <Link href="/compare" className="text-blue-600 font-semibold hover:underline">comparison page</Link>. {delivery}
            </p>
          </section>
        )}
      </div>
      <Footer />
    </>
  )
}
