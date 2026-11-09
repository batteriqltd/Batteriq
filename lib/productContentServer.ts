// Server-only data for product-page content: the panels whose compatible_with
// spec can be matched against a power station.
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product } from '@/lib/supabase/types'

export async function getSolarPanels(): Promise<Product[]> {
  try {
    const { data } = await createAdminClient().from('products').select('*').eq('category', 'Solar Panels').order('sort_order')
    return (data ?? []) as Product[]
  } catch {
    return []
  }
}

export async function getPowerStations(): Promise<Product[]> {
  try {
    const { data } = await createAdminClient().from('products').select('*').eq('category', 'Power Stations').order('sort_order')
    return (data ?? []) as Product[]
  } catch {
    return []
  }
}
