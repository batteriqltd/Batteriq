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

/** Products in any of these categories, in display (sort_order) order. */
export async function getProductsByCategories(categories: string[]): Promise<Product[]> {
  try {
    const { data } = await createAdminClient().from('products').select('*').in('category', categories).order('sort_order')
    return (data ?? []) as Product[]
  } catch {
    return []
  }
}

export async function getProductsByBrand(brand: string): Promise<Product[]> {
  try {
    const { data } = await createAdminClient().from('products').select('*').eq('brand', brand).order('sort_order')
    return (data ?? []) as Product[]
  } catch {
    return []
  }
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  try {
    const { data } = await createAdminClient().from('products').select('*').in('slug', slugs)
    const rows = (data ?? []) as Product[]
    return slugs.map((s) => rows.find((p) => p.slug === s)).filter(Boolean) as Product[]
  } catch {
    return []
  }
}
