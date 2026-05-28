'use client'

import { motion } from 'framer-motion'
import { ProductCard } from './ProductCard'
import type { Product } from '@/lib/supabase/types'

type ProductGridProps = {
  products: Product[]
  showKenyaContext?: boolean
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
}

export function ProductGrid({ products, showKenyaContext = false }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-bq-gray-400">No products available at this time.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="visible"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductCard product={product} showKenyaContext={showKenyaContext} />
        </motion.div>
      ))}
    </motion.div>
  )
}
