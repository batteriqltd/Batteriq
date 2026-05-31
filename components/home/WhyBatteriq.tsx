import Link from 'next/link'

const REASONS = [
  {
    icon: '🏆',
    title: 'Kenya\'s Only Authorised EcoFlow Dealer',
    body: 'Batteriq is the official authorised distributor of EcoFlow products in Kenya. Every unit comes with a genuine 24-month manufacturer warranty — not a grey import, not a copy. Buy with complete confidence.',
  },
  {
    icon: '📱',
    title: 'Pay with M-Pesa — Instant STK Push',
    body: 'No bank transfers, no running to an ATM. Enter your phone number at checkout and approve the payment right on your phone. M-Pesa STK Push makes buying a KES 461,799 power station as easy as buying airtime.',
  },
  {
    icon: '🚚',
    title: 'Same-Day Nairobi Delivery',
    body: 'Order before 12PM and your EcoFlow power station arrives the same day anywhere in Nairobi. Nationwide shipping covers all 47 counties — from Mombasa to Kisumu to Eldoret.',
  },
  {
    icon: '🔋',
    title: 'Expert Power Backup Advice',
    body: 'Not sure which power station is right for your home or business? Our team has helped 500+ Kenyan homes and businesses choose the right solution. Call, WhatsApp, or use our AI assistant for instant guidance.',
  },
  {
    icon: '🛡️',
    title: '24-Month Manufacturer Warranty',
    body: 'Every EcoFlow and BLUETTI product sold by Batteriq comes with the full international manufacturer warranty. If anything goes wrong within 24 months, we handle the replacement — no questions asked.',
  },
  {
    icon: '☀️',
    title: 'Complete Solar + Battery Systems',
    body: 'From a single RIVER 2 for apartment backup to a full 15kWh EcoFlow PowerKit for whole-home energy independence, Batteriq stocks the complete EcoFlow ecosystem — power stations, solar panels, and smart accessories.',
  },
]

export function WhyBatteriq() {
  return (
    <section className="py-16 sm:py-24 bg-white border-t border-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Why Kenyans Choose Batteriq</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
            Kenya&apos;s Most Trusted<br />
            <span className="text-[#0000ff]">Power Backup Store</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            Over 500 Kenyan homes and businesses have chosen Batteriq for genuine EcoFlow and BLUETTI products,
            seamless M-Pesa checkout, and expert after-sales support.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {REASONS.map(({ icon, title, body }) => (
            <div key={title} className="bg-[#f8f9ff] rounded-2xl p-7 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform shadow-sm">
                {icon}
              </div>
              <h3 className="text-base font-black text-gray-900 mb-3 leading-snug">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #00004d 0%, #0000ff 100%)' }}>
          <div className="px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-white font-black text-xl sm:text-2xl tracking-tight mb-2">
                Ready to power your home?
              </p>
              <p className="text-blue-200 text-sm">
                500+ Kenyans already have. M-Pesa accepted. Same-day Nairobi delivery.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/ecoflow-kenya"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-white text-[#0000ff] font-black text-sm hover:bg-blue-50 transition-colors whitespace-nowrap">
                Shop Now →
              </Link>
              <a href="https://wa.me/254716822014?text=Hi%20Batteriq!%20I%20need%20help%20choosing%20a%20power%20station."
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-[#25D366] text-white font-black text-sm hover:bg-green-500 transition-colors whitespace-nowrap">
                💬 WhatsApp Us
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
