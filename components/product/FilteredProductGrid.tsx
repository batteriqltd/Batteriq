'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductCard } from './ProductCard'
import type { Product } from '@/lib/supabase/types'

type FilterDef = { label: string; value: string }

function extractWattage(name: string): number {
  const pvMatch = name.match(/PV(\d+)/i)
  if (pvMatch) return parseInt(pvMatch[1])
  const wMatch = name.match(/(\d+)\s*W/i)
  if (wMatch) return parseInt(wMatch[1])
  return 0
}

function matchesFilter(product: Product, filterValue: string, filterType: string): boolean {
  if (filterValue === 'all') return true
  const name = product.name.toLowerCase()

  if (filterType === 'power-stations') {
    if (filterValue === 'delta') return name.includes('delta')
    if (filterValue === 'river') return name.includes('river')
    if (filterValue === 'solar-home-system') return product.category === 'Solar Home Systems'
    if (filterValue === 'bluetti') return product.brand === 'Bluetti'
  }

  if (filterType === 'solar') {
    if (filterValue === 'portable') return name.includes('portable')
    if (filterValue === 'rigid') return name.includes('rigid')
    if (filterValue === 'flexible') return name.includes('flexible') || name.includes('bifacial')
    const w = extractWattage(product.name)
    if (filterValue === 'low-watt') return w > 0 && w <= 160
    if (filterValue === 'high-watt') return w >= 200
  }

  if (filterType === 'accessories') {
    if (filterValue === 'batteries') return product.category === 'Batteries'
    if (filterValue === 'powerbanks') return product.category === 'Power Banks'
    if (filterValue === 'chargers') return name.includes('charger')
    if (filterValue === 'cables') return name.includes('cable') || name.includes('mc4') || name.includes('xt60')
    if (filterValue === 'appliances') return product.category === 'Appliances'
  }

  if (filterType === 'bluetti') {
    if (filterValue === 'ac') return name.startsWith('ac') || name.includes(' ac')
    if (filterValue === 'eb') return name.startsWith('eb') || name.includes(' eb')
    if (filterValue === 'batteries') return product.category === 'Batteries'
    if (filterValue === 'solar') return product.category === 'Solar Panels'
  }

  return true
}

const FILTER_SETS: Record<string, FilterDef[]> = {
  'power-stations': [
    { label: 'All', value: 'all' },
    { label: 'DELTA Series', value: 'delta' },
    { label: 'RIVER Series', value: 'river' },
    { label: 'Solar Home Systems', value: 'solar-home-system' },
    { label: 'Bluetti', value: 'bluetti' },
  ],
  solar: [
    { label: 'All', value: 'all' },
    { label: 'Portable Panels', value: 'portable' },
    { label: 'Rigid Panels', value: 'rigid' },
    { label: 'Flexible / Bifacial', value: 'flexible' },
    { label: '≤160W', value: 'low-watt' },
    { label: '200W+', value: 'high-watt' },
  ],
  accessories: [
    { label: 'All', value: 'all' },
    { label: 'Extra Batteries', value: 'batteries' },
    { label: 'Power Banks', value: 'powerbanks' },
    { label: 'Chargers', value: 'chargers' },
    { label: 'Cables', value: 'cables' },
    { label: 'Appliances', value: 'appliances' },
  ],
  bluetti: [
    { label: 'All', value: 'all' },
    { label: 'AC Series', value: 'ac' },
    { label: 'EB Series', value: 'eb' },
    { label: 'Battery Modules', value: 'batteries' },
    { label: 'Solar Panels', value: 'solar' },
  ],
}

interface FilteredProductGridProps {
  products: Product[]
  filterType: 'power-stations' | 'solar' | 'accessories' | 'bluetti'
}

export function FilteredProductGrid({ products, filterType }: FilteredProductGridProps) {
  const filters = FILTER_SETS[filterType] ?? FILTER_SETS['power-stations']
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = products.filter((p) => matchesFilter(p, activeFilter, filterType))

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 mb-10 sm:mb-12">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-5 sm:px-6 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap flex-shrink-0 border ${
              activeFilter === f.value
                ? 'bg-bq-blue text-white border-bq-blue shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-500 border-slate-200 hover:border-bq-blue hover:text-bq-blue hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
        <AnimatePresence mode="popLayout">
          {filtered.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 font-semibold text-lg">No products in this category yet.</p>
        </div>
      )}
    </div>
  )
}
