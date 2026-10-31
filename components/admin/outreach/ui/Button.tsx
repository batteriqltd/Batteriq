'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    'bg-[var(--bq-blue)] hover:bg-[var(--bq-blue-dim)] text-white shadow-[var(--bq-shadow-2)]',
  secondary:
    'bg-[var(--bq-blue-light)] hover:bg-[var(--bq-border)] text-[var(--bq-blue-dim)]',
  ghost:
    'bg-transparent hover:bg-[var(--bq-surface-sunken)] text-[var(--bq-text-secondary)]',
  danger:
    'bg-[var(--bq-danger-light)] hover:bg-[var(--bq-danger)] hover:text-white text-[var(--bq-danger)]',
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'h-9 px-3 text-[12px] gap-1.5 rounded-[var(--bq-radius-md)]',
  md: 'h-11 px-4 text-[13px] gap-2 rounded-[var(--bq-radius-lg)]',
  lg: 'h-12 px-5 text-[14px] gap-2 rounded-[var(--bq-radius-lg)]',
  icon: 'h-11 w-11 rounded-[var(--bq-radius-lg)]',
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant
    size?: Size
    loading?: boolean
    icon?: React.ReactNode
  }
>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-[var(--bq-duration-base)] ease-[var(--bq-ease-standard)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})
