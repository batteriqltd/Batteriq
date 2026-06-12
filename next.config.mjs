/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Old WordPress shop URLs → new EcoFlow hub (301 permanent, passes link equity)
      { source: '/shop', destination: '/ecoflow-kenya', permanent: true },
      { source: '/shop/page/:page', destination: '/ecoflow-kenya', permanent: true },
      { source: '/shop/:path*', destination: '/ecoflow-kenya', permanent: true },
      { source: '/product/:slug', destination: '/ecoflow-kenya', permanent: true },
      { source: '/product-category/:path*', destination: '/ecoflow-kenya', permanent: true },
      { source: '/cart-2', destination: '/cart', permanent: true },
      { source: '/my-account/:path*', destination: '/', permanent: true },
    ]
  },
  webpack: (config) => {
    // Disable filesystem cache to prevent stale chunk errors on Windows
    config.cache = false
    return config
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'ecoflow.com',
      },
      {
        protocol: 'https',
        hostname: '*.ecoflow.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live *.vercel-insights.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com https://fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http: *.supabase.co ecoflow.com *.ecoflow.com",
              "connect-src 'self' *.supabase.co wss://*.supabase.co vercel.live *.vercel-insights.com https://api.safaricom.co.ke https://api.anthropic.com https://generativelanguage.googleapis.com https://api.resend.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.batteriq.com' }],
        destination: 'https://batteriq.com/:path*',
        permanent: true,
      },
      { source: '/shop', destination: '/power-stations', permanent: true },
      { source: '/shop/:path*', destination: '/', permanent: true },
      { source: '/product/:path*', destination: '/', permanent: true },
      { source: '/product-category/:path*', destination: '/', permanent: true },
      { source: '/explore', destination: '/', permanent: true },
      { source: '/explore/:path*', destination: '/', permanent: true },
      { source: '/home-solar-backup', destination: '/', permanent: true },
      { source: '/about-us', destination: '/about', permanent: true },
    ]
  },
}

export default nextConfig
