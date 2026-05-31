import { createAdminClient } from '@/lib/supabase/admin'
import { CompareClient } from './CompareClient'
import type { Product } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare Power Stations — EcoFlow & BLUETTI | Batteriq Kenya',
  description: 'Compare EcoFlow and BLUETTI power stations side by side. Specs, prices, battery capacity and more. Find the right power station for your needs in Kenya.',
}

export default async function ComparePage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('products') as any)
    .select('*')
    .in('category', ['Power Stations', 'Solar Home Systems'])
    .eq('in_stock', true)
    .order('price_kes', { ascending: true })

  return <CompareClient products={(data ?? []) as Product[]} />
}
