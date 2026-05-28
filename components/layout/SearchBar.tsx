'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2 } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl } from '@/lib/utils'
import type { Product } from '@/lib/supabase/types'

export function SearchBar() {
  const { searchOpen, closeSearch } = useUIStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [searchOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=6`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.products ?? [])
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeSearch])

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeSearch}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-xl"
          >
            <div className="max-w-3xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search EcoFlow DELTA Pro, solar panels, Bluetti…"
                  className="flex-1 bg-transparent text-gray-900 text-lg placeholder:text-gray-400 outline-none"
                  aria-label="Search products"
                />
                {loading && <Loader2 size={18} className="text-bq-blue animate-spin shrink-0" />}
                <button
                  onClick={closeSearch}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[6px] transition-colors"
                  aria-label="Close search"
                >
                  <X size={20} />
                </button>
              </div>

              {results.length > 0 && (
                <ul className="mt-4 space-y-1 max-h-[60vh] overflow-y-auto">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/${product.brand.toLowerCase()}/${product.slug}`}
                        onClick={closeSearch}
                        className="flex items-center gap-4 px-3 py-2.5 rounded-[8px] hover:bg-bq-blue-light transition-colors group"
                      >
                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-[6px] flex items-center justify-center shrink-0 overflow-hidden">
                          <Image
                            src={getProductImageUrl(product)}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="object-contain w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-bq-blue">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.brand} · {product.category}</p>
                        </div>
                        <p className="text-sm font-bold font-mono text-bq-blue shrink-0">
                          {formatKES(product.price_kes)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {query && !loading && results.length === 0 && (
                <p className="mt-4 text-sm text-gray-400 pb-2">No products found for &ldquo;{query}&rdquo;</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
