import Image from 'next/image'
import Link from 'next/link'
import { Hero3DProduct } from './Hero3DProduct'

interface PageHeroProps {
  title: string
  subtitle?: string
  breadcrumb?: { label: string; href: string }[]
  bgImage?: string
  bgGradient?: string
  height?: 'full' | 'medium' | 'small'
  align?: 'left' | 'center'
  badge?: string
  productImage?: string
  productAlt?: string
}

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  bgImage,
  bgGradient = 'linear-gradient(135deg, #0a0a14 0%, #111827 50%, #0f172a 100%)',
  height = 'medium',
  align = 'left',
  badge,
  productImage,
  productAlt,
}: PageHeroProps) {
  const heights = {
    full: 'min-h-screen',
    medium: 'min-h-[420px] h-[52vh]',
    small: 'min-h-[260px] h-[32vh]',
  }

  return (
    <section
      className={`relative ${heights[height]} flex items-end overflow-hidden pt-[72px]`}
      aria-label={title}
    >
      {/* Background */}
      {bgImage ? (
        <>
          <Image
            src={bgImage}
            alt={title}
            fill
            className="object-cover object-center"
            priority
          />
          {/* Single clean overlay — only darkens bottom for text readability */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)'
          }} />
          {/* Left side gradient for text readability on desktop */}
          <div className="absolute inset-0 hidden lg:block" style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, transparent 70%)'
          }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: bgGradient }} />
      )}

      {/* 3D interactive product — floats right of the text */}
      {productImage && (
        <div className="absolute z-10 hidden md:flex items-center justify-center right-[4%] lg:right-[7%] top-1/2 -translate-y-1/2 pt-[72px]">
          <Hero3DProduct src={productImage} alt={productAlt ?? title} />
        </div>
      )}

      {/* Content — always bottom-left, text readable over any background */}
      <div className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full pb-12 sm:pb-16 ${align === 'center' ? 'text-center' : 'text-left'}`}>

        {/* Breadcrumb */}
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-[11px] text-white/35 mb-5 flex-wrap font-medium" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/20">/</span>}
                {i < breadcrumb.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors font-medium">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/30">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Badge */}
        {badge && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-white/70 text-[10px] font-bold uppercase tracking-[0.18em]">{badge}</span>
          </div>
        )}

        {/* Title */}
        <h1
          className="font-black text-white leading-tight mb-4"
          style={{
            fontSize: 'clamp(1.85rem, 4.5vw, 3.4rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            fontWeight: 900,
            maxWidth: '640px',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="leading-relaxed"
            style={{
              fontSize: 'clamp(0.85rem, 1.6vw, 1.05rem)',
              maxWidth: '480px',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 500,
              letterSpacing: '0.005em',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
