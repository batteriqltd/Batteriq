import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageHero } from '@/components/layout/PageHero'
import { ToastContainer } from '@/components/ui/Toast'
import { FaqAccordion } from '@/components/support/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions | Batteriq Kenya',
  description: 'Answers to common questions about EcoFlow products in Kenya — charging, battery life, solar compatibility, M-Pesa payment, warranty, and delivery.',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Batteriq an authorised EcoFlow dealer in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Batteriq is Kenya's officially appointed EcoFlow distributor. All products are genuine, carry full international EcoFlow warranty, and are supported by EcoFlow-certified after-sales service.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I pay for EcoFlow products with M-Pesa in Kenya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Batteriq offers instant M-Pesa STK Push checkout. You receive a payment prompt on your phone during checkout and confirm with your M-Pesa PIN. We also accept Cash on Delivery and M-Pesa on Delivery.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the warranty on EcoFlow products bought from Batteriq?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EcoFlow power stations carry a 24-month warranty. Solar panels carry a 24-month product warranty plus a 5-year power output warranty. Accessories carry a 12-month warranty. All warranties are honoured by Batteriq as the authorised Kenya distributor.',
      },
    },
  ],
}

const faqCategories = [
  {
    category: 'About Batteriq',
    icon: '🏢',
    items: [
      {
        question: 'Is Batteriq an authorised EcoFlow dealer in Kenya?',
        answer: "Yes. Batteriq is Kenya's officially appointed EcoFlow distributor. Every product we sell is 100% genuine, sourced directly from EcoFlow, and comes with the full official EcoFlow international warranty.\n\nAs an authorised dealer, we also provide EcoFlow-certified after-sales support, spare parts, and warranty claim processing directly in Kenya.",
      },
      {
        question: 'Where is Batteriq located?',
        answer: 'Batteriq is based in Nairobi, Kenya. We serve customers across all 47 counties with nationwide courier delivery. For Nairobi customers, we offer same-day and next-day delivery options.',
      },
      {
        question: 'Does Batteriq sell Bluetti products as an authorised dealer?',
        answer: 'Batteriq stocks and sells Bluetti power stations in Kenya. For Bluetti-specific warranty and authorisation queries, please contact us directly and we will advise on the appropriate support channel.',
      },
    ],
  },
  {
    category: 'Power Stations',
    icon: '⚡',
    items: [
      {
        question: 'How long does it take to charge an EcoFlow power station?',
        answer: 'Charging time depends on the model and charging method:\n\n• EcoFlow DELTA Pro: ~1.9 hours via AC wall charging (2900W input)\n• EcoFlow DELTA 2: ~1.3 hours via AC wall charging (1200W input)\n• EcoFlow RIVER 2: ~60 minutes via AC wall charging (360W input)\n• EcoFlow RIVER 3: ~60 minutes via AC wall charging\n\nSolar charging times vary depending on panel wattage and sunlight conditions. EcoFlow\'s X-Stream fast charging technology charges most models to 80% in under 1 hour.',
      },
      {
        question: 'Can I use an EcoFlow power station while it is charging?',
        answer: 'Yes. All EcoFlow power stations support simultaneous charging and discharging — called "pass-through charging". You can power your devices while the unit is plugged in and charging. This is particularly useful as a UPS (Uninterruptible Power Supply) for home offices and essential equipment.',
      },
      {
        question: 'How many times can I charge and discharge an EcoFlow battery?',
        answer: 'EcoFlow power stations use LFP (Lithium Iron Phosphate) battery chemistry, which is rated for:\n\n• 3,500+ charge cycles to 80% capacity\n• This equates to approximately 10 years of daily use\n\nAfter 3,500 cycles, the battery retains at least 80% of its original capacity — it does not suddenly fail. LFP chemistry is also significantly safer and more stable than traditional lithium-ion batteries.',
      },
      {
        question: 'Can I leave my EcoFlow power station plugged in all the time?',
        answer: 'Yes. EcoFlow power stations are designed to be left plugged in continuously. The Battery Management System (BMS) automatically stops charging when the battery reaches 100% and manages optimal charging cycles to extend battery life.\n\nFor long-term storage (more than 3 months), EcoFlow recommends storing the unit at 30–60% charge in a cool, dry location.',
      },
      {
        question: 'What appliances can an EcoFlow DELTA Pro power?',
        answer: 'The EcoFlow DELTA Pro (3600Wh, 3600W AC output) can power:\n\n• Refrigerator (150W) — 15+ hours\n• Television (100W) — 24+ hours\n• Laptop (60W) — 40+ hours\n• LED lights (10W) — multiple days\n• CPAP machine — 4+ nights\n• Electric kettle (1500W) — multiple uses\n• Power tools (intermittent use)\n\nFor appliances with motors (fridge, AC), always check the surge wattage. The DELTA Pro handles surges up to 7200W.',
      },
      {
        question: 'Does EcoFlow work as a UPS (Uninterruptible Power Supply)?',
        answer: 'Yes. EcoFlow RIVER 3 series and DELTA 3 series feature a 10ms UPS switchover time — faster than most household UPS units. This means connected devices experience no interruption during a power outage.\n\nThe EcoFlow RIVER 3 (UPS) is specifically designed for this use case with a 10ms response time, making it ideal for routers, NAS drives, CCTV systems, and sensitive electronics.',
      },
      {
        question: 'Can I expand the capacity of my EcoFlow power station?',
        answer: 'Yes. Several EcoFlow models support extra battery expansion:\n\n• DELTA Pro: expandable to 10.8kWh with extra batteries\n• DELTA 2: expandable to 2kWh with one extra battery\n• DELTA 2 Max: expandable to 4kWh\n• DELTA 3 / DELTA 3 Plus: expandable with dedicated extra batteries\n• RIVER 3 / RIVER 3 Plus: expandable with EB300/EB600 extra batteries\n\nAll compatible extra batteries are available from Batteriq.',
      },
    ],
  },
  {
    category: 'Solar Panels',
    icon: '☀️',
    items: [
      {
        question: 'Which EcoFlow solar panels are compatible with which power stations?',
        answer: 'All EcoFlow portable solar panels (MC4 connector) are compatible with all EcoFlow power stations. The key consideration is total wattage:\n\n• RIVER 2 / RIVER 3: max 110W solar input\n• DELTA 2: max 500W solar input\n• DELTA 2 Max: max 1000W solar input\n• DELTA Pro: max 1600W solar input\n• DELTA Pro 3: max 2600W solar input\n\nYou can chain multiple panels to reach the max input. All EcoFlow panels use the standard MC4 connector.',
      },
      {
        question: 'How much power will I generate from EcoFlow solar panels in Kenya?',
        answer: 'Kenya has excellent solar irradiance — Nairobi averages 5.5 peak sun hours per day. Expected daily output:\n\n• 100W panel: ~500Wh/day (0.5kWh)\n• 220W panel: ~1,100Wh/day (1.1kWh)\n• 400W panel: ~2,200Wh/day (2.2kWh)\n\nActual output depends on panel angle, shading, temperature, and cloud cover. EcoFlow panels are rated at Standard Test Conditions (25°C, 1000W/m²).',
      },
      {
        question: 'Are EcoFlow solar panels waterproof?',
        answer: 'Yes. EcoFlow portable solar panels carry an IP68 waterproof rating (except the 45W panel which is IP65). IP68 means complete protection against dust and submersion in water up to 1 metre for 30 minutes.\n\nThis makes them suitable for use during light rain, outdoor camping, and marine environments. Do not use during heavy storms or lightning.',
      },
      {
        question: 'Can I use non-EcoFlow solar panels with an EcoFlow power station?',
        answer: 'Yes, with conditions. EcoFlow power stations accept solar input via MC4 connectors. Third-party panels work if:\n\n• Voltage is within the accepted range (check your specific model\'s specs)\n• Current does not exceed the max input current\n• Total wattage does not exceed the max solar input\n\nFor guaranteed compatibility and optimal MPPT charging performance, EcoFlow-branded panels are recommended.',
      },
    ],
  },
  {
    category: 'Payment & Ordering',
    icon: '💳',
    items: [
      {
        question: 'How does M-Pesa payment work on Batteriq?',
        answer: 'M-Pesa payment on Batteriq is fully automated:\n\n1. Add items to cart and proceed to checkout\n2. Enter your details and select "Pay Now with M-Pesa"\n3. Enter your M-Pesa phone number\n4. Click "Pay" — you receive an STK Push prompt on your phone within seconds\n5. Enter your M-Pesa PIN to confirm\n6. Payment is instantly verified and your order is confirmed\n\nNo need to manually input a transaction code or send a screenshot. The system verifies automatically.',
      },
      {
        question: 'What payment options does Batteriq offer?',
        answer: 'Batteriq offers three payment options:\n\n1. Pay Now (M-Pesa STK Push) — instant payment during checkout\n2. Cash on Delivery — pay in cash when your order arrives\n3. M-Pesa on Delivery — our delivery person triggers an M-Pesa prompt to your phone at the doorstep\n\nAll payment methods are available for all products.',
      },
      {
        question: 'Can I cancel or modify my order after placing it?',
        answer: 'You can cancel or modify your order within 2 hours of placing it by contacting us on WhatsApp or calling us directly. After 2 hours, if the order has been dispatched, cancellation may not be possible.\n\nFor M-Pesa payments that have already been processed, refunds are issued within 3–5 business days back to your M-Pesa account.',
      },
    ],
  },
  {
    category: 'Delivery',
    icon: '🚚',
    items: [
      {
        question: 'How fast is delivery in Nairobi?',
        answer: 'For Nairobi orders:\n\n• Orders placed before 12PM: same-day delivery in most cases\n• Orders placed after 12PM: next-day delivery\n• Weekends: delivery available Saturday, Sunday by arrangement\n\nDelivery within Nairobi typically takes 2–4 hours from dispatch. You will receive a WhatsApp message with tracking information when your order is dispatched.',
      },
      {
        question: 'Do you deliver outside Nairobi?',
        answer: 'Yes. We deliver nationwide across all 47 counties via trusted courier partners:\n\n• Major towns (Mombasa, Kisumu, Nakuru, Eldoret): 1–2 business days\n• Other counties: 2–5 business days\n\nDelivery fees are calculated at checkout based on your location and the weight/size of your order. Large items like the DELTA Pro require special handling.',
      },
      {
        question: 'How do I track my order?',
        answer: 'After placing your order, you receive an order confirmation email with your order number. You can track your order at any time by visiting batteriq.com/track-order and entering your order number and email address. No account is required.\n\nYou will also receive WhatsApp updates when your order is confirmed, dispatched, and out for delivery.',
      },
    ],
  },
  {
    category: 'Warranty',
    icon: '🛡️',
    items: [
      {
        question: 'What is the warranty period for EcoFlow products bought from Batteriq?',
        answer: 'Batteriq honours the full official EcoFlow warranty:\n\n• Power Stations: 24 months (2 years)\n• Solar Panels: 24 months product warranty + 5-year power output guarantee (≥90% at year 5)\n• Extra Batteries: 24 months\n• Accessories & Cables: 12 months\n• Smart Generators: 24 months\n\nWarranty starts from the date of purchase from Batteriq.',
      },
      {
        question: 'How do I make a warranty claim in Kenya?',
        answer: 'To make a warranty claim:\n\n1. Register your product at batteriq.com/support/warranty (do this at purchase)\n2. Contact Batteriq directly via WhatsApp or email with:\n   - Your warranty registration number\n   - A description of the issue\n   - Photos or video of the fault\n3. Our technical team will assess the claim within 48 hours\n4. If approved: repair, replacement, or refund as appropriate\n\nAs the authorised Kenya distributor, all warranty claims are handled locally — you do not need to ship products internationally.',
      },
      {
        question: 'What does the EcoFlow warranty NOT cover?',
        answer: 'The warranty does not cover:\n\n• Physical damage from drops, impacts, or mishandling\n• Water damage beyond the stated IP rating\n• Damage from incorrect voltage or power surges\n• Normal wear and tear (scratches, cosmetic marks)\n• Damage from unauthorised modifications or repairs\n• Consumable parts (cables, connectors) after 12 months\n\nIf your product is damaged due to a manufacturing defect, it is covered. If damaged due to misuse, it is not.',
      },
      {
        question: 'Do I need to register my product to get warranty support?',
        answer: 'We strongly recommend registering your product at batteriq.com/support/warranty as it speeds up any future warranty claims significantly. However, proof of purchase (M-Pesa receipt or order confirmation email) is sufficient to make a warranty claim even without prior registration.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      <ToastContainer />

      <PageHero
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about EcoFlow products, payments, delivery, and warranty in Kenya."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Support', href: '/support' },
          { label: 'FAQ', href: '/support/faq' },
        ]}
        bgGradient="linear-gradient(135deg, #00004d 0%, #0000aa 100%)"
        badge="Help Center"
        height="small"
      />

      <section className="py-20 bg-white" data-aos="fade-up" data-aos-duration="600" data-aos-once="true">
        <div className="max-w-4xl mx-auto px-6">
          <FaqAccordion categories={faqCategories} />

          {/* Bottom CTA */}
          <div className="mt-16 text-center bg-blue-50 rounded-3xl p-10">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Didn&apos;t find your answer?</h2>
            <p className="text-gray-500 mb-6">Our team is available Monday to Saturday, 8AM–6PM Nairobi time.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://wa.me/254716822014"
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
              >
                WhatsApp Us
              </a>
              <Link
                href="/contact"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                Send a Message
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
