'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-bold transition-all duration-250 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-bq-blue text-white hover:bg-bq-blue-dim hover:shadow-blue-glow focus-visible:outline-white',
      outline: 'bg-transparent text-white border-2 border-white hover:border-bq-blue hover:text-bq-blue focus-visible:outline-bq-blue',
      ghost: 'bg-transparent text-bq-gray-400 hover:text-white hover:bg-white/5 focus-visible:outline-bq-blue',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-400',
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-4 py-2 text-sm rounded-[6px] min-h-[36px]',
      md: 'px-6 py-3 text-base rounded-[8px] min-h-[44px]',
      lg: 'px-8 py-4 text-lg rounded-[8px] min-h-[52px]',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading…
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
