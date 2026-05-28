'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/lib/supabase/types'

interface PowerStationsClientProps {
  products: Product[]
}

export function PowerStationsClient({ products }: PowerStationsClientProps) {
  const searchParams = useSearchParams()
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') ?? 'all')

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setActiveFilter(f)
  }, [searchParams])

  const deltaCount = products.filter(
    (p) => p.name.toLowerCase().includes('delta') && p.brand === 'EcoFlow'
  ).length
  const riverCount = products.filter(
    (p) => p.name.toLowerCase().includes('river') && p.brand === 'EcoFlow'
  ).length
  const solarHomeSystemCount = products.filter((p) => p.category === 'Solar Home Systems').length
  const bluettiCount = products.filter((p) => p.brand === 'Bluetti').length

  const FILTERS = [
    { label: 'All Stations', value: 'all', count: products.length },
    { label: 'DELTA Series', value: 'delta', count: deltaCount },
    { label: 'RIVER Series', value: 'river', count: riverCount },
    { label: 'Solar Home Systems', value: 'solar-home-system', count: solarHomeSystemCount },
    { label: 'Bluetti', value: 'bluetti', count: bluettiCount },
  ]

  const filteredProducts = products.filter((p) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'delta') return p.name.toLowerCase().includes('delta') && p.brand === 'EcoFlow'
    if (activeFilter === 'river') return p.name.toLowerCase().includes('river') && p.brand === 'EcoFlow'
    if (activeFilter === 'solar-home-system') return p.category === 'Solar Home Systems'
    if (activeFilter === 'bluetti') return p.brand === 'Bluetti'
    return true
  })

  return (
    <div>
      {/* Filter tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeFilter === f.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
          >
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No products in this filter</h3>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-blue-600 font-semibold text-sm hover:underline"
            >
              Show all power stations →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
