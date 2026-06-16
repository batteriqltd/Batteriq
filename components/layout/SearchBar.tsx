'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, ArrowRight, Zap } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { formatKES, getProductImageUrl } from '@/lib/utils'
import type { Product } from '@/lib/supabase/types'

export function SearchBar() {
  const { searchOpen, closeSearch } = useUIStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      setQuery('')
      setResults([])
      setFocused(-1)
    }
  }, [searchOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query.trim())}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.products ?? [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
        setFocused(-1)
      }
    }, 250)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocused(p => Math.min(p + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocused(p => Math.max(p - 1, -1))
      }
      if (e.key === 'Enter' && focused >= 0 && results[focused]) {
        closeSearch()
        window.location.href = `/${results[focused].brand.toLowerCase()}/${results[focused].slug}`
      }
    }
    if (searchOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeSearch, searchOpen, focused, results])

  const popular = ['DELTA Pro 3', 'RIVER 2', 'Solar Panel', 'AC200PL']

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,20,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={closeSearch}
          />

          {/* Search modal — centered on screen */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-4 right-4 sm:left-auto sm:right-auto top-[10vh] sm:top-[12vh] z-50 w-auto sm:w-[580px] sm:mx-auto sm:left-1/2 sm:-translate-x-1/2"
          >
            <div
              className="bg-white rounded-[24px] overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,30,0.35), 0 4px 20px rgba(0,0,30,0.15)' }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 sm:px-6 h-16 border-b border-gray-100">
                <Search size={20} className="text-gray-300 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-gray-900 text-[16px] font-medium placeholder:text-gray-300 outline-none"
                  style={{ fontSize: '16px' }}
                  aria-label="Search products"
                />
                {loading && <Loader2 size={18} className="text-[#0000ff] animate-spin shrink-0" />}
                <button
                  onClick={closeSearch}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Close search"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Results or suggestions */}
              <div className="max-h-[58vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,40,0.1) transparent' }}>

                {/* Results list */}
                {results.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 px-3 pt-2 pb-3">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </p>
                    {results.map((product, i) => (
                      <Link
                        key={product.id}
                        href={`/${product.brand.toLowerCase()}/${product.slug}`}
                        onClick={closeSearch}
                        className={`flex items-center gap-4 px-3 py-3 rounded-[16px] transition-all duration-150 group ${
                          focused === i ? 'bg-[#f0f2ff]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-14 h-14 bg-[#fafbff] border border-gray-100 rounded-[14px] flex items-center justify-center shrink-0 overflow-hidden">
                          <Image
                            src={getProductImageUrl(product)}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="object-contain w-full h-full p-1 group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold text-gray-900 truncate transition-colors ${
                            focused === i ? 'text-[#0000ff]' : 'group-hover:text-[#0000ff]'
                          }`}>
                            {product.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {product.brand} · {product.category}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black font-mono text-[#0000ff]">
                            {formatKES(product.price_kes)}
                          </p>
                          {product.compare_price_kes && Number(product.compare_price_kes) > product.price_kes && (
                            <p className="text-[10px] font-medium text-gray-300 line-through font-mono">
                              {formatKES(Number(product.compare_price_kes))}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={14} className={`shrink-0 text-gray-200 transition-all ${
                          focused === i ? 'text-[#0000ff] translate-x-0.5' : 'group-hover:text-gray-400 group-hover:translate-x-0.5'
                        }`} />
                      </Link>
                    ))}
                  </div>
                )}

                {/* No results */}
                {query.trim() && !loading && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                      <Search size={22} className="text-gray-200" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No products found</p>
                    <p className="text-xs text-gray-400 font-medium">Try a different search term or browse our categories</p>
                  </div>
                )}

                {/* Popular searches — shown when empty */}
                {!query.trim() && (
                  <div className="p-4 sm:p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 px-1 mb-3">
                      Popular searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popular.map(term => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 transition-all hover:border-[#0000ff] hover:text-[#0000ff] hover:bg-[#f0f2ff]"
                        >
                          <Zap size={12} />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 rounded text-[10px] font-mono font-bold text-gray-300 bg-gray-50 border border-gray-100">ESC</kbd>
                  <span className="hidden sm:inline text-[10px] text-gray-300 font-medium">to close</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 rounded text-[10px] font-mono font-bold text-gray-300 bg-gray-50 border border-gray-100">&uarr;&darr;</kbd>
                  <span className="hidden sm:inline text-[10px] text-gray-300 font-medium">navigate</span>
                  <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 rounded text-[10px] font-mono font-bold text-gray-300 bg-gray-50 border border-gray-100">&crarr;</kbd>
                  <span className="hidden sm:inline text-[10px] text-gray-300 font-medium">select</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
