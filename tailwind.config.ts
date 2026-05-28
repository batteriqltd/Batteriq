import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        sm: '480px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
      colors: {
        'bq-black': '#0a0a0a',
        'bq-white': '#FFFFFF',
        'bq-navy': '#00004d',
        'bq-blue': '#2563eb',
        'bq-blue-dim': '#1d4ed8',
        'bq-blue-light': '#eff6ff',
        'bq-gray-900': '#0a0a0a',
        'bq-gray-800': '#141414',
        'bq-gray-600': '#404040',
        'bq-gray-400': '#888888',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        '8xl': '1440px',
      },
      backdropBlur: {
        glass: '16px',
      },
      boxShadow: {
        'blue-glow': '0 0 20px rgba(0, 0, 255, 0.35)',
        'blue-glow-lg': '0 0 40px rgba(0, 0, 255, 0.4)',
        'card-hover': '0 20px 40px rgba(0, 0, 255, 0.12)',
        'ambient': '0 1px 3px rgba(0, 0, 0, 0.01), 0 10px 40px -10px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'pulse-blue': 'pulseBlue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'dropdown-enter': 'dropdownEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pulseBlue: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 0, 255, 0.4)' },
          '50%': { boxShadow: '0 0 0 20px rgba(0, 0, 255, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        dropdownEnter: {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
