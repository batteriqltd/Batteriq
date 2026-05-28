'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/lib/supabase/types'

type CartStore = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  subtotal: () => number
}

function toSafePrice(raw: unknown): number {
  const n =
    typeof raw === 'string'
      ? parseFloat((raw as string).replace(/[^0-9.]/g, ''))
      : Number(raw)
  return isNaN(n) || !isFinite(n) ? 0 : n
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        // FORCE price to number at point of insertion — permanent NaN fix
        const safePrice = toSafePrice(item.price_kes as unknown)

        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity, price_kes: safePrice }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, price_kes: safePrice }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + toSafePrice(i.price_kes as unknown) * i.quantity, 0),
    }),
    {
      name: 'batteriq-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      // Re-coerce prices after loading from localStorage — strings become numbers
      onRehydrateStorage: () => (state) => {
        if (state?.items) {
          state.items = state.items.map((item) => ({
            ...item,
            price_kes: toSafePrice(item.price_kes as unknown),
          }))
        }
      },
    }
  )
)

// Safe formatter — exported so CartDrawer and other components never produce NaN
export function formatKES(amount: number | string | undefined | null): string {
  const n = toSafePrice(amount)
  return `KES ${n.toLocaleString('en-KE')}`
}
