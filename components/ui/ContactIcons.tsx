'use client'

function LogoIcon({ src, alt, size }: { src: string; alt: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/whatsapp.png" alt="WhatsApp" size={size} />
}

export function EmailIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/email.png" alt="Email" size={size} />
}

export function MpesaIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/mpesa.png" alt="M-Pesa" size={size} />
}

export function DeliveryIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/delivery.png" alt="Delivery" size={size} />
}

export function ContactSalesIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/contact-sales.png" alt="Contact Sales" size={size} />
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/instagram.png" alt="Instagram" size={size} />
}

export function FacebookIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/facebook.png" alt="Facebook" size={size} />
}

export function TikTokIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/tiktok.png" alt="TikTok" size={size} />
}

export function LinkedInIcon({ size = 20 }: { size?: number }) {
  return <LogoIcon src="/logos/linkedin.png" alt="LinkedIn" size={size} />
}
