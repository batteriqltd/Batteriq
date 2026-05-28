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
}

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  bgImage,
  bgGradient = 'linear-gradient(135deg, #00004d 0%, #0000ff 100%)',
  height = 'medium',
  align = 'left',
}: PageHeroProps) {
  const heights = {
    full: 'h-screen',
    medium: 'h-[55vh] min-h-[400px]',
    small: 'h-[35vh] min-h-[280px]',
  }

  return (
    <section
      className={`relative ${heights[height]} flex items-end pb-16 overflow-hidden pt-[72px]`}
      aria-label={title}
    >
      {bgImage ? (
        <>
          <Image src={bgImage} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: bgGradient }} />
      )}

      <div
        className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full ${
          align === 'center' ? 'text-center' : 'text-left'
        }`}
      >
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-4 flex-wrap" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                {i < breadcrumb.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/40">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-4 max-w-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-white/80 max-w-xl leading-relaxed">{subtitle}</p>
        )}
      </div>
    </section>
  )
}
