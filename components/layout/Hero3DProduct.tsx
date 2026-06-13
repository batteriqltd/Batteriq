'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'

/**
 * Interactive 3D product showcase for page heroes.
 * Tilts toward the cursor / touch point with perspective,
 * floats gently when idle, and casts a dynamic glow.
 * Pure presentation — no business logic.
 */
export function Hero3DProduct({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const wrap = wrapRef.current
    const card = cardRef.current
    if (!wrap || !card) return
    const rect = wrap.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width - 0.5   // -0.5 → 0.5
    const y = (clientY - rect.top) / rect.height - 0.5
    card.style.transform =
      `perspective(1100px) rotateY(${x * 22}deg) rotateX(${-y * 18}deg) scale(1.04)`
    card.style.transition = 'transform 0.08s ease-out'
  }, [])

  const reset = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
    card.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg) scale(1)'
  }, [])

  return (
    <div
      ref={wrapRef}
      className="relative select-none"
      style={{ touchAction: 'pan-y' }}
      onMouseMove={e => handleMove(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchMove={e => {
        const t = e.touches[0]
        if (t) handleMove(t.clientX, t.clientY)
      }}
      onTouchEnd={reset}
    >
      {/* Dynamic glow beneath */}
      <div
        className="absolute left-1/2 bottom-2 -translate-x-1/2 w-[70%] h-10 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 70%)', filter: 'blur(22px)' }}
      />

      {/* Tilting card */}
      <div
        ref={cardRef}
        className="relative will-change-transform animate-hero-float"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <Image
          src={src}
          alt={alt}
          width={520}
          height={520}
          priority
          className="w-[240px] sm:w-[320px] lg:w-[420px] h-auto object-contain pointer-events-none"
          style={{
            filter: 'drop-shadow(0 30px 50px rgba(0,0,40,0.45)) drop-shadow(0 8px 16px rgba(0,0,80,0.3))',
          }}
        />
        {/* Specular sheen that rides above the product */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[24px]"
          style={{
            background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.10) 45%, transparent 60%)',
            transform: 'translateZ(40px)',
          }}
        />
      </div>
    </div>
  )
}
