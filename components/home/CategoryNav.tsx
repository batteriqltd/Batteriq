'use client'

import Link from 'next/link'

const CATEGORIES = [
  { label: 'Power Stations', href: '/power-stations', from: 'From KES 27,259', img: '/categories/power-stations.jpg', gradient: 'linear-gradient(135deg, #0000ff, #00004d)' },
  { label: 'Solar Panels', href: '/solar', from: 'From KES 7,599', img: '/categories/solar-panels.jpg', gradient: 'linear-gradient(135deg, #0369a1, #0000ff)' },
  { label: 'Extra Batteries', href: '/accessories', from: 'From KES 27,899', img: '/categories/extra-batteries.jpg', gradient: 'linear-gradient(135deg, #7c3aed, #0000ff)' },
  { label: 'Accessories', href: '/accessories', from: 'From KES 3,799', img: '/categories/accessories.jpg', gradient: 'linear-gradient(135deg, #0000ff, #4f46e5)' },
  { label: 'Appliances', href: '/accessories', from: 'From KES 149,469', img: '/categories/appliances.jpg', gradient: 'linear-gradient(135deg, #00004d, #0000ff)' },
  { label: 'Solar Home Systems', href: '/power-stations', from: 'From KES 759,999', img: '/categories/powerkits.jpg', gradient: 'linear-gradient(135deg, #1e3a8a, #0000ff)' },
]

export function CategoryNav() {
  return (
    <section className="py-10 sm:py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#0000ff' }}>
            Browse Our Range
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>
            Shop by Category
          </h2>
        </div>

        {/* Category grid */}
        <nav aria-label="Product categories" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.label}
              href={cat.href}
              data-aos="fade-up"
              data-aos-delay={String(i * 60)}
              data-aos-once="true"
              className="group flex flex-col items-center text-center"
              style={{ textDecoration: 'none' }}
            >
              {/* Image square */}
              <div
                className="w-full aspect-square rounded-3xl overflow-hidden mb-4 relative"
                style={{
                  background: cat.gradient,
                  boxShadow: '0 4px 20px rgba(0,0,64,0.10)',
                  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,255,0.18)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,64,0.10)'
                }}
              >
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="w-full h-full object-cover object-center"
                  onError={e => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:13px;font-weight:900;text-align:center;padding:12px;letter-spacing:-0.01em;">${cat.label}</span></div>`
                    }
                  }}
                />
              </div>

              {/* Label */}
              <p
                className="font-black text-gray-900 text-sm leading-tight mb-1 group-hover:text-blue-600 transition-colors"
                style={{ letterSpacing: '-0.01em' }}
              >
                {cat.label}
              </p>
              <p className="text-xs text-gray-400 font-medium">{cat.from}</p>
            </Link>
          ))}
        </nav>

      </div>
    </section>
  )
}
