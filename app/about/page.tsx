import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Zap, Shield, Globe, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Batteriq — Kenya\'s Authorised EcoFlow Dealer',
  description: 'Batteriq is Kenya\'s authorised EcoFlow and Bluetti dealer. Learn about our mission to guarantee uptime for homes and businesses across Kenya.',
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <div className="pt-[72px] min-h-screen">
        <div className="bg-bq-gray-900 border-b border-bq-gray-800 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
            <h1 className="h1-fluid text-white mb-4">About Batteriq</h1>
            <p className="text-bq-gray-400 text-xl leading-relaxed">
              We are Kenya&apos;s authorised distributor for EcoFlow and Bluetti —
              on a mission to guarantee uptime for every home and business in Kenya.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="h2-fluid text-white mb-4">Our Mission</h2>
              <p className="text-bq-gray-400 leading-relaxed mb-4">
                Power outages are a reality of life in Kenya. Batteriq exists to give homes,
                businesses, and individuals a reliable solution — portable power stations and solar
                panels that guarantee your uptime, no matter what the grid does.
              </p>
              <p className="text-bq-gray-400 leading-relaxed">
                As the authorised EcoFlow and Bluetti distributor in Kenya, we bring the world&apos;s
                best portable power technology directly to our customers, backed by genuine warranty
                and local after-sales support.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: 'Authorised Dealer', value: 'EcoFlow & Bluetti' },
                { icon: Shield, label: 'Warranty Coverage', value: 'Official & Full' },
                { icon: Globe, label: 'Delivery', value: 'Nationwide Kenya' },
                { icon: Users, label: 'Customers Served', value: '500+' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-bq-gray-900 border border-bq-gray-600 rounded-[8px] p-4 text-center">
                  <Icon size={24} className="text-bq-blue mx-auto mb-2" />
                  <p className="text-white font-bold text-sm">{value}</p>
                  <p className="text-bq-gray-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-bq-gray-800 pt-12" id="partner">
            <h2 className="h2-fluid text-white mb-4">Become a Partner</h2>
            <p className="text-bq-gray-400 max-w-2xl leading-relaxed mb-6">
              Are you a retailer, solar installer, or business interested in stocking EcoFlow or Bluetti
              products? Contact us to discuss wholesale and partnership opportunities.
            </p>
            <a
              href="mailto:partners@batteriq.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-bq-blue text-white font-bold rounded-[8px] hover:bg-bq-blue-dim transition-colors"
            >
              Get in Touch →
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
