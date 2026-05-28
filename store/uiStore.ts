'use client'

import { create } from 'zustand'

type UIStore = {
  cartOpen: boolean
  mobileNavOpen: boolean
  searchOpen: boolean
  chatOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  openMobileNav: () => void
  closeMobileNav: () => void
  openSearch: () => void
  closeSearch: () => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  cartOpen: false,
  mobileNavOpen: false,
  searchOpen: false,
  chatOpen: false,

  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),

  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}))
