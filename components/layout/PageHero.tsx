import Image from 'next/image'
import Link from 'next/link'

interface PageHeroProps {
  title: string
  subtitle?: string
  breadcrumb?: { label: string; href: string }[]
  bgImage?: string
  bgGradient?: string
  height?: 'full' | 'medium' | 'small'
  align?: 'left' | 'center'
  badge?: string
}

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  bgImage,
  bgGradient = 'linear-gradient(135deg, #00004d 0%, #0000ff 100%)',
  height = 'medium',
  align = 'left',
  badge,
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

      {/* Content — always bottom-left, text readable over any background */}
      <div className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full pb-12 sm:pb-16 ${align === 'center' ? 'text-center' : 'text-left'}`}>

        {/* Breadcrumb */}
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-xs text-white/50 mb-4 flex-wrap" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/30">/</span>}
                {i < breadcrumb.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors font-medium">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/40 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Badge */}
        {badge && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 border border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{badge}</span>
          </div>
        )}

        {/* Title */}
        <h1
          className="font-black text-white leading-tight mb-4"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.8rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            maxWidth: '700px',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-white/75 leading-relaxed"
            style={{
              fontSize: 'clamp(0.875rem, 1.8vw, 1.1rem)',
              maxWidth: '560px',
              textShadow: '0 1px 8px rgba(0,0,0,0.3)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
