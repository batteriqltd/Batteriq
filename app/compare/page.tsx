import { createAdminClient } from '@/lib/supabase/admin'
import { withoutDeprecatedDelta } from '@/lib/delta-series'
import { CompareClient } from './CompareClient'
import type { Product } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'

export const metadata: Metadata = withCanonical('/compare', {
  // absolute: skips the root "%s | Batteriq" template, which doubled the brand
  title: { absolute: 'Compare EcoFlow & Bluetti Power Stations | Batteriq Kenya' },
  description: 'Compare EcoFlow and Bluetti power stations side by side: capacity, output, weight, solar input and Kenya prices, to find the right backup for your home.',
})

export default async function ComparePage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('products') as any)
    .select('*')
    .in('category', ['Power Stations', 'Solar Home Systems'])
    .eq('in_stock', true)
    .order('price_kes', { ascending: true })

  return <CompareClient products={withoutDeprecatedDelta((data ?? []) as Product[])} />
}
