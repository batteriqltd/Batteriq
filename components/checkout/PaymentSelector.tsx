'use client'

import Image from 'next/image'
import { DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentMethod = 'mpesa_now' | 'cod_cash' | 'cod_mpesa'

type PaymentSelectorProps = {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const METHODS = [
  {
    id: 'mpesa_now' as PaymentMethod,
    image: '/logos/mpesa-express.png',
    label: 'M-Pesa Express',
    description: 'Safe, instant STK Push payment',
    badge: 'Recommended',
  },
  {
    id: 'cod_cash' as PaymentMethod,
    image: null,
    label: 'Cash on Delivery',
    description: 'Pay cash when your order arrives at your door.',
    badge: null,
  },
  {
    id: 'cod_mpesa' as PaymentMethod,
    image: '/logos/delivery-truck.png',
    label: 'M-Pesa on Delivery',
    description: 'STK prompt sent upon delivery',
    badge: null,
  },
]

export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  return (
    <fieldset>
      <legend className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase mb-4">
        Payment Method
      </legend>
      <div className="space-y-3">
        {METHODS.map(({ id, image, label, description, badge }) => {
          const isSelected = value === id
          return (
            <label
              key={id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer group',
                isSelected
                  ? 'bg-blue-50/30 border-2 border-blue-600 shadow-sm shadow-blue-100/50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={id}
                checked={isSelected}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              <div className={cn(
                'min-w-[48px] h-9 rounded-lg bg-white border flex items-center justify-center transition-all duration-200 overflow-hidden',
                isSelected ? 'border-blue-100' : 'border-slate-100'
              )}>
                {image ? (
                  <Image
                    src={image}
                    alt={label}
                    width={40}
                    height={32}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <DollarSign
                    size={18}
                    className={isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn(
                    'text-sm font-bold tracking-tight transition-colors',
                    isSelected ? 'text-blue-600' : 'text-slate-900'
                  )}>
                    {label}
                  </span>
                  {badge && (
                    <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{description}</p>
              </div>
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                  isSelected ? 'border-blue-600' : 'border-slate-200'
                )}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
