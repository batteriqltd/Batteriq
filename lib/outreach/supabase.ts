import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { CatalogProductSummary } from './claude'

function isValidEnvValue(val: string | undefined): val is string {
  if (!val) return false
  const trimmed = val.trim()
  if (!trimmed || trimmed === 'replace_me') return false
  if (trimmed.includes('<your-project-ref>') || trimmed.includes('<your-domain>')) return false
  return true
}

/**
 * Resolves credentials for the Outreach Agent Supabase database.
 * Supports Dual-Supabase setups out of the box:
 *  - Dedicated 2nd Supabase: OUTREACH_SUPABASE_URL + OUTREACH_SUPABASE_SERVICE_ROLE_KEY
 *  - Automatic fallback to Store Supabase: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
export function resolveOutreachSupabaseCredentials(): {
  url: string
  serviceRoleKey: string
  isDedicatedProject: boolean
} | null {
  const dedicatedUrl = process.env.OUTREACH_SUPABASE_URL
  const dedicatedKey =
    process.env.OUTREACH_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.OUTREACH_SUPABASE_SECRET_KEY

  if (isValidEnvValue(dedicatedUrl) && isValidEnvValue(dedicatedKey)) {
    return {
      url: dedicatedUrl.trim(),
      serviceRoleKey: dedicatedKey.trim(),
      isDedicatedProject: true,
    }
  }

  const storeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const storeKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (isValidEnvValue(storeUrl) && isValidEnvValue(storeKey)) {
    return {
      url: storeUrl.trim(),
      serviceRoleKey: storeKey.trim(),
      isDedicatedProject: false,
    }
  }

  return null
}

export function hasOutreachSupabaseConfig(): boolean {
  return resolveOutreachSupabaseCredentials() !== null
}

/**
 * Server-only Supabase admin client for all `outreach_*` tables.
 * Uses OUTREACH_SUPABASE_URL + OUTREACH_SUPABASE_SERVICE_ROLE_KEY when set,
 * otherwise falls back to NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
export function createOutreachAdminClient(): SupabaseClient<Database> {
  const creds = resolveOutreachSupabaseCredentials()
  if (!creds) {
    throw new Error(
      'Missing Outreach Supabase credentials. Set OUTREACH_SUPABASE_URL and OUTREACH_SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).'
    )
  }

  return createClient<Database>(creds.url, creds.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Optional safe accessor for the main Batteriq Store Supabase project
 * (`products`, `contact_submissions`, `newsletter_subscribers`).
 * Returns `null` instead of throwing when Store Supabase env vars are absent
 * (e.g. local dev running ONLY against the dedicated 2nd Outreach Supabase).
 */
export function createStoreAdminClientSafe(): SupabaseClient<Database> | null {
  const storeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const storeKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isValidEnvValue(storeUrl) || !isValidEnvValue(storeKey)) {
    return null
  }

  return createClient<Database>(storeUrl.trim(), storeKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Safely fetches in-stock Batteriq catalog products from Store Supabase
 * to ground Claude email & WhatsApp replies. Gracefully returns `[]` if
 * Store Supabase is unavailable so Claude uses its built-in Batteriq knowledge.
 */
export async function fetchStoreCatalogProductsSafe(
  limit = 10,
  categories?: string[]
): Promise<CatalogProductSummary[]> {
  const storeDb = createStoreAdminClientSafe()
  if (!storeDb) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (storeDb.from('products') as any)
      .select('name, brand, category, price_kes, slug')
      .eq('in_stock', true)
      .order('featured', { ascending: false })
      .limit(limit)

    if (categories && categories.length > 0) {
      query = query.in('category', categories)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as CatalogProductSummary[]
  } catch {
    return []
  }
}
