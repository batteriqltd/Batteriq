import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { GeminiChatWidget } from '@/components/ai/GeminiChatWidget'
import { ToastContainer } from '@/components/ui/Toast'
import { ExternalLink, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Product Manuals & Downloads | Batteriq Kenya',
  description: 'Download official EcoFlow user manuals, quick start guides, and product specifications for all EcoFlow models available in Kenya.',
}

const manualCategories = [
  {
    category: 'DELTA Series',
    icon: '⚡',
    manuals: [
      { name: 'EcoFlow DELTA Pro 3', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA Pro', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA 2 Max', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA 2', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA 3 Plus', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA 3', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow DELTA Pro Ultra', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
    ],
  },
  {
    category: 'RIVER Series',
    icon: '🌊',
    manuals: [
      { name: 'EcoFlow RIVER 3', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow RIVER 3 Plus', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow RIVER 3 Max', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow RIVER 2', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow RIVER 2 Max', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow RIVER 2 Pro', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
    ],
  },
  {
    category: 'Solar Panels',
    icon: '☀️',
    manuals: [
      { name: 'EcoFlow 400W Portable Solar Panel', type: 'Quick Start Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow 220W Bifacial Solar Panel', type: 'Quick Start Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow 160W Portable Solar Panel', type: 'Quick Start Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow 110W Portable Solar Panel', type: 'Quick Start Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow Rigid Solar Panels', type: 'Installation Guide', url: 'https://ecoflow.com/pages/download-center' },
    ],
  },
  {
    category: 'Smart Home & Accessories',
    icon: '🏠',
    manuals: [
      { name: 'EcoFlow Smart Home Panel 2', type: 'Installation Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow Alternator Charger 800W', type: 'Installation Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow PowerStream Micro Inverter', type: 'Installation Guide', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow GLACIER Portable Refrigerator', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow WAVE 2 Air Conditioner', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
    ],
  },
  {
    category: 'Smart Generators',
    icon: '🔌',
    manuals: [
      { name: 'EcoFlow Smart Generator 3000 (Dual Fuel)', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
      { name: 'EcoFlow Smart Generator 4000 (Dual Fuel)', type: 'User Manual', url: 'https://ecoflow.com/pages/download-center' },
    ],
  },
]

export default function ManualsPage() {
  return (
    <>
      <Header />
      <ToastContainer />

      <PageHero
        title="Product Manuals & Downloads"
        subtitle="Official EcoFlow user manuals, quick start guides, and technical documentation for all products sold by Batteriq Kenya."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Support', href: '/support' },
          { label: 'Manuals', href: '/support/manuals' },
        ]}
        bgGradient="linear-gradient(135deg, #0a0a1a 0%, #1a1a4d 60%, #00004d 100%)"
        height="small"
      />

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          {/* Notice */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-12 flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">Official EcoFlow Documentation</p>
              <p className="text-sm text-blue-700">
                All manuals below link to EcoFlow&apos;s official download centre at ecoflow.com.
                These are the same documents provided with every product — no registration required to download.
              </p>
            </div>
          </div>

          {/* Manual categories */}
          <div className="space-y-10">
            {manualCategories.map(cat => (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-xl font-black text-gray-900">{cat.category}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.manuals.map(manual => (
                    <a
                      key={manual.name}
                      href={manual.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {manual.name}
                        </p>
                        <p className="text-xs text-gray-400">{manual.type} · PDF</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Can't find manual */}
          <div className="mt-16 text-center bg-gray-50 rounded-3xl p-10">
            <h2 className="text-xl font-black text-gray-900 mb-2">Can&apos;t find your manual?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Visit EcoFlow&apos;s official download centre for the complete library, or contact us and we&apos;ll help you find it.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://ecoflow.com/pages/download-center"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                EcoFlow Download Centre <ExternalLink size={14} />
              </a>
              <a
                href="https://wa.me/254716822014"
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all"
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <GeminiChatWidget />
    </>
  )
}
