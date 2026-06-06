'use client'

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/whatsapp.png"
      alt="WhatsApp"
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

export function EmailIcon({ size = 20 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/email.png"
      alt="Email"
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

export function ContactSalesIcon({ size = 20 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/contact-sales.png"
      alt="Contact Sales"
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}
