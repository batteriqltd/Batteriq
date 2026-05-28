'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqCategory {
  category: string
  icon: string
  items: FaqItem[]
}

export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const [openCategory, setOpenCategory] = useState<string>(categories[0]?.category ?? '')
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat.category}
            onClick={() => { setOpenCategory(cat.category); setOpenItem(null) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              openCategory === cat.category
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.category}
          </button>
        ))}
      </div>

      {/* FAQ items for active category */}
      {categories
        .filter(cat => cat.category === openCategory)
        .map(cat => (
          <div key={cat.category} className="space-y-3">
            {cat.items.map((item, i) => {
              const key = `${cat.category}-${i}`
              const isOpen = openItem === key
              return (
                <div
                  key={key}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                    isOpen ? 'border-blue-200 shadow-sm shadow-blue-50' : 'border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setOpenItem(isOpen ? null : key)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className={`font-semibold text-sm leading-snug ${isOpen ? 'text-blue-600' : 'text-gray-900'}`}>
                      {item.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 bg-white border-t border-gray-50">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
