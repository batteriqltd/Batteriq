import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | Batteriq Kenya',
  description: 'Privacy Policy for Batteriq Solutions Ltd — how we collect, use, and protect your personal data when you shop on batteriq.com.',
  robots: 'index, follow',
  alternates: { canonical: 'https://batteriq.com/privacy' },
}

const LAST_UPDATED = 'June 25, 2026'
const EFFECTIVE_DATE = 'June 25, 2026'

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-screen bg-[#f8f9fa]">

        {/* Hero */}
        <div className="bg-[#00003a] pt-14 pb-12">
          <div className="max-w-3xl mx-auto px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3">Legal</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-blue-200/70 text-sm font-medium">
              Last updated: {LAST_UPDATED} · Effective: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-14">
          <div className="bg-white rounded-[24px] p-8 sm:p-12 shadow-sm border border-gray-100 space-y-10">

            {/* Intro */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                Batteriq Solutions Ltd (&ldquo;Batteriq&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is Kenya&apos;s
                official authorised EcoFlow and BLUETTI dealer, operating at{' '}
                <strong>batteriq.com</strong>. We are committed to protecting your privacy and
                handling your personal data with transparency, integrity, and care. This Privacy
                Policy explains what information we collect, how we use it, with whom we share it,
                how long we keep it, and the rights you have over your data.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                By using batteriq.com or placing an order with us, you agree to the terms of this
                Privacy Policy. If you do not agree, please do not use our website or services.
              </p>
            </div>

            <Section title="1. Who We Are">
              <Info label="Company Name" value="Batteriq Solutions Ltd" />
              <Info label="Trading Name" value="Batteriq Kenya" />
              <Info label="Business Address" value="Kijabe Street Block 17, Nairobi, Kenya" />
              <Info label="Email" value="info@batteriq.com" />
              <Info label="Phone" value="+254 716 822 014" />
              <Info label="Website" value="https://batteriq.com" />
              <p className="text-sm text-gray-600 leading-relaxed mt-4">
                Batteriq Solutions Ltd is the data controller responsible for your personal information
                collected through this website and our business operations.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                We collect information in the following ways:
              </p>

              <SubSection title="2.1 Information You Provide Directly">
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li><strong>Order information:</strong> Full name, email address, phone number, delivery address (street, city, county), product selections, and payment method.</li>
                  <li><strong>M-Pesa payment data:</strong> Your phone number used to initiate the M-Pesa STK Push payment. We do not store your M-Pesa PIN. Payment confirmation codes (transaction references) are stored as proof of payment.</li>
                  <li><strong>Contact form submissions:</strong> Name, email, phone number, and the content of your message when you contact us through our website.</li>
                  <li><strong>Newsletter sign-ups:</strong> Email address and, optionally, your name when you subscribe to our newsletter.</li>
                  <li><strong>Warranty registrations:</strong> Product details, purchase date, and contact information when you register a product warranty.</li>
                  <li><strong>Reviews and feedback:</strong> Your name and written feedback when you submit a product review.</li>
                </ul>
              </SubSection>

              <SubSection title="2.2 Information Collected Automatically">
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li><strong>Device and browser data:</strong> Device type (mobile, tablet, desktop), browser type and version, operating system.</li>
                  <li><strong>Usage data:</strong> Pages visited, time spent on pages, products viewed, search queries entered on the site.</li>
                  <li><strong>Session identifiers:</strong> A temporary anonymous session ID stored in your browser&apos;s sessionStorage (not cookies) to track your visit for analytics. This is deleted when you close your browser tab.</li>
                  <li><strong>Referral source:</strong> How you arrived at batteriq.com (e.g., Google, Facebook, Instagram, direct visit). This is derived from your browser&apos;s referrer header.</li>
                  <li><strong>IP address:</strong> Used for rate limiting (preventing abuse), fraud detection, and approximate geolocation (country/city level only).</li>
                </ul>
              </SubSection>

              <SubSection title="2.3 Information We Do NOT Collect">
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li>We do <strong>not</strong> store your M-Pesa PIN or full bank account details.</li>
                  <li>We do <strong>not</strong> use persistent tracking cookies for advertising purposes.</li>
                  <li>We do <strong>not</strong> collect biometric data, national ID numbers, or government identification.</li>
                  <li>We do <strong>not</strong> sell your personal data to third parties.</li>
                </ul>
              </SubSection>
            </Section>

            <Section title="3. How We Use Your Information">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">We use your personal data for the following purposes:</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-black text-gray-700 border border-gray-100 text-xs uppercase tracking-wider">Purpose</th>
                    <th className="text-left p-3 font-black text-gray-700 border border-gray-100 text-xs uppercase tracking-wider">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {[
                    ['Process and fulfil your orders', 'Contract performance'],
                    ['Send order confirmation emails and payment receipts', 'Contract performance'],
                    ['Send M-Pesa STK Push payment prompts to your phone', 'Contract performance'],
                    ['Issue eTIMS KRA invoices for tax compliance', 'Legal obligation'],
                    ['Respond to your support and warranty enquiries', 'Contract performance / Legitimate interest'],
                    ['Send newsletter and promotional emails (with consent)', 'Consent'],
                    ['Detect and prevent fraud, abuse, and unauthorised access', 'Legitimate interest'],
                    ['Analyse website traffic and improve our services', 'Legitimate interest'],
                    ['Display live visitor counts in our admin dashboard (anonymised)', 'Legitimate interest'],
                    ['Comply with Kenyan tax and business regulations', 'Legal obligation'],
                  ].map(([purpose, basis], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="p-3 border border-gray-100">{purpose}</td>
                      <td className="p-3 border border-gray-100 font-medium text-[#0000ff]">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="4. M-Pesa Payment Processing">
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Batteriq processes payments via the <strong>Safaricom M-Pesa Daraja API</strong>.
                When you make a payment:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>Your phone number is shared with Safaricom PLC to initiate the STK Push payment prompt.</li>
                <li>The transaction amount and merchant reference are shared with Safaricom.</li>
                <li>Upon successful payment, Safaricom sends us a callback containing your M-Pesa transaction code, which we store as proof of payment.</li>
                <li>Your M-Pesa PIN is entered directly on your phone and is <strong>never transmitted to or seen by Batteriq</strong>.</li>
                <li>Safaricom&apos;s own Privacy Policy governs their processing of your payment data. Visit <strong>safaricom.co.ke</strong> for details.</li>
              </ul>
            </Section>

            <Section title="5. Sharing Your Information">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                We do not sell your personal data. We share your information only with trusted service
                providers who help us operate our business, and only to the extent necessary:
              </p>
              <div className="space-y-4">
                {[
                  {
                    partner: 'Safaricom PLC',
                    purpose: 'M-Pesa payment processing',
                    data: 'Phone number, payment amount, transaction reference',
                    location: 'Kenya',
                  },
                  {
                    partner: 'Supabase Inc.',
                    purpose: 'Database and real-time infrastructure',
                    data: 'Order data, customer information, product data',
                    location: 'Ireland (EU) / USA',
                  },
                  {
                    partner: 'Vercel Inc.',
                    purpose: 'Website hosting and deployment',
                    data: 'IP addresses, request logs',
                    location: 'USA / Global edge network',
                  },
                  {
                    partner: 'Resend Inc.',
                    purpose: 'Email delivery (order confirmations, receipts)',
                    data: 'Email address, order details for email content',
                    location: 'USA',
                  },
                  {
                    partner: 'Kenya Revenue Authority (KRA)',
                    purpose: 'eTIMS invoice compliance (legal requirement)',
                    data: 'Transaction details for tax invoicing',
                    location: 'Kenya',
                  },
                ].map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="font-black text-gray-900 text-sm mb-2">{p.partner}</p>
                    <p className="text-xs text-gray-500"><span className="font-bold">Purpose:</span> {p.purpose}</p>
                    <p className="text-xs text-gray-500"><span className="font-bold">Data shared:</span> {p.data}</p>
                    <p className="text-xs text-gray-500"><span className="font-bold">Location:</span> {p.location}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mt-4">
                We may also disclose your information if required by Kenyan law, court order, or
                regulatory authority, or to protect the rights, property, or safety of Batteriq,
                our customers, or the public.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                We retain your personal data for as long as necessary to fulfil the purposes
                described in this policy:
              </p>
              <div className="space-y-2">
                {[
                  ['Order records', '7 years', 'KRA tax compliance requirements'],
                  ['Payment transaction codes', '7 years', 'Financial record-keeping'],
                  ['Customer contact information', '3 years after last interaction', 'Customer support and warranty'],
                  ['Newsletter subscriptions', 'Until you unsubscribe', 'Ongoing with consent'],
                  ['Website analytics (anonymous session data)', 'Session duration only', 'Deleted when browser tab closes'],
                  ['Contact form messages', '2 years', 'Customer service records'],
                  ['Warranty registrations', 'Duration of warranty + 1 year', 'Warranty support'],
                ].map(([type, period, reason], i) => (
                  <div key={i} className={`flex gap-4 p-3 rounded-xl text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white border border-gray-100'}`}>
                    <div className="flex-1 font-bold text-gray-700">{type}</div>
                    <div className="w-40 text-[#0000ff] font-black">{period}</div>
                    <div className="flex-1 text-gray-500 hidden sm:block">{reason}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="7. Your Rights">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Under the Kenya Data Protection Act, 2019, you have the following rights regarding
                your personal data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Right to Access', desc: 'Request a copy of the personal data we hold about you.' },
                  { title: 'Right to Rectification', desc: 'Ask us to correct inaccurate or incomplete personal data.' },
                  { title: 'Right to Erasure', desc: 'Request deletion of your data where we have no legal obligation to retain it.' },
                  { title: 'Right to Object', desc: 'Object to us processing your data for direct marketing at any time.' },
                  { title: 'Right to Restrict Processing', desc: 'Ask us to limit how we use your data in certain circumstances.' },
                  { title: 'Right to Data Portability', desc: 'Receive your data in a structured, machine-readable format.' },
                  { title: 'Right to Withdraw Consent', desc: 'Withdraw consent at any time where processing is based on consent (e.g., newsletter).' },
                  { title: 'Right to Lodge a Complaint', desc: 'Complain to the Office of the Data Protection Commissioner (ODPC) Kenya.' },
                ].map((r, i) => (
                  <div key={i} className="bg-[#f0f5ff] border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-black text-[#0000ff] mb-1">{r.title}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-sm font-black text-green-800 mb-1">Exercise Your Rights</p>
                <p className="text-sm text-green-700">
                  To exercise any of the above rights, contact us at{' '}
                  <strong>info@batteriq.com</strong> or call <strong>+254 716 822 014</strong>.
                  We will respond within <strong>30 days</strong> of receiving your request.
                  We may ask you to verify your identity before processing your request.
                </p>
              </div>
            </Section>

            <Section title="8. Cookies and Tracking">
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Batteriq uses <strong>minimal tracking technologies</strong>:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li><strong>SessionStorage (not cookies):</strong> We use browser sessionStorage to store a temporary anonymous visitor ID for live analytics. This is automatically deleted when you close your browser tab. No cross-site tracking occurs.</li>
                <li><strong>No advertising cookies:</strong> We do not use Google Analytics, Facebook Pixel, or any advertising tracking pixels.</li>
                <li><strong>No persistent cookies for tracking:</strong> We do not track you across other websites.</li>
                <li><strong>Essential functionality:</strong> Your shopping cart contents are stored in your browser&apos;s local memory (Zustand store) for the duration of your session.</li>
              </ul>
            </Section>

            <Section title="9. Data Security">
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We take appropriate technical and organisational measures to protect your personal
                data against unauthorised access, loss, or misuse:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>All data is transmitted over <strong>HTTPS/TLS encryption</strong>.</li>
                <li>Our database (Supabase) uses <strong>Row Level Security (RLS)</strong> policies to restrict data access.</li>
                <li>Admin access requires a <strong>secret URL, email, and bcrypt-hashed password</strong>. Admin sessions are HMAC-signed and expire after 8 hours of inactivity.</li>
                <li>API endpoints are protected by <strong>rate limiting</strong> to prevent abuse and DDoS attacks.</li>
                <li>M-Pesa API credentials are stored as environment variables and never exposed to the public.</li>
                <li>We regularly review and update our security practices.</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Despite our best efforts, no method of transmission over the internet is 100% secure.
                If you suspect any unauthorised access to your data, contact us immediately at
                <strong> info@batteriq.com</strong>.
              </p>
            </Section>

            <Section title="10. Children's Privacy">
              <p className="text-sm text-gray-600 leading-relaxed">
                Batteriq&apos;s products and services are not directed at children under the age of
                18. We do not knowingly collect personal data from children. If you believe we have
                inadvertently collected data from a child, please contact us immediately and we will
                delete it promptly.
              </p>
            </Section>

            <Section title="11. International Data Transfers">
              <p className="text-sm text-gray-600 leading-relaxed">
                Your data may be transferred to and processed in countries outside Kenya, including
                the United States and Ireland (European Union), by our service providers (Supabase,
                Vercel, Resend). Where such transfers occur, we ensure appropriate safeguards are in
                place in accordance with the Kenya Data Protection Act, 2019, including standard
                contractual clauses or adequacy decisions where applicable.
              </p>
            </Section>

            <Section title="12. Links to Third-Party Websites">
              <p className="text-sm text-gray-600 leading-relaxed">
                Our website may contain links to third-party websites including EcoFlow&apos;s
                official website, BLUETTI&apos;s website, Safaricom, and our social media profiles.
                These websites have their own privacy policies, which we encourage you to review.
                We are not responsible for the content or privacy practices of any third-party
                websites.
              </p>
            </Section>

            <Section title="13. Changes to This Privacy Policy">
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our
                practices, technology, or legal requirements. When we make significant changes, we
                will update the &ldquo;Last Updated&rdquo; date at the top of this page and, where
                appropriate, notify you by email or prominent notice on our website. Your continued
                use of batteriq.com after any changes constitutes your acceptance of the updated
                Privacy Policy.
              </p>
            </Section>

            <Section title="14. Contact Us">
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                If you have any questions, concerns, or requests regarding this Privacy Policy or
                how we handle your personal data, please contact us:
              </p>
              <div className="bg-[#00003a] rounded-2xl p-6 text-white space-y-3">
                <p className="font-black text-lg">Batteriq Solutions Ltd</p>
                <div className="space-y-2 text-sm text-blue-200/80">
                  <p>📍 Kijabe Street Block 17, Nairobi, Kenya</p>
                  <p>📧 info@batteriq.com</p>
                  <p>📞 +254 716 822 014</p>
                  <p>🌐 batteriq.com</p>
                </div>
                <div className="border-t border-white/10 pt-4 mt-4">
                  <p className="text-xs text-blue-200/60">
                    You also have the right to lodge a complaint with the{' '}
                    <strong className="text-blue-200">Office of the Data Protection Commissioner (ODPC)</strong> Kenya
                    if you believe your data protection rights have been violated.
                    Visit <strong className="text-blue-200">odpc.go.ke</strong> for more information.
                  </p>
                </div>
              </div>
            </Section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-black text-gray-900 tracking-tight mb-4 pb-3 border-b border-gray-100">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-black text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-black text-gray-400 uppercase tracking-wider w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-700">{value}</span>
    </div>
  )
}
