import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createStoreAdminClientSafe,
  fetchStoreCatalogProductsSafe,
  hasOutreachSupabaseConfig,
  resolveOutreachSupabaseCredentials,
} from '@/lib/outreach/supabase'

describe('Dual-Supabase Outreach Support', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses dedicated OUTREACH_SUPABASE_URL + OUTREACH_SUPABASE_SERVICE_ROLE_KEY when configured (even without Store Supabase)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'https://outreach-second-db.supabase.co')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'eyJ_outreach_service_role_key')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds).toEqual({
      url: 'https://outreach-second-db.supabase.co',
      serviceRoleKey: 'eyJ_outreach_service_role_key',
      isDedicatedProject: true,
    })
    expect(hasOutreachSupabaseConfig()).toBe(true)
    expect(createStoreAdminClientSafe()).toBeNull()
  })

  it('prefers dedicated 2nd Supabase over Store Supabase when both are present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://main-store-db.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJ_store_service_role_key')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'https://outreach-second-db.supabase.co')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'eyJ_outreach_service_role_key')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds?.url).toBe('https://outreach-second-db.supabase.co')
    expect(creds?.isDedicatedProject).toBe(true)
    expect(createStoreAdminClientSafe()).not.toBeNull()
  })

  it('falls back cleanly to Store Supabase when OUTREACH_SUPABASE_* are unset or replace_me', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://main-store-db.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJ_store_service_role_key')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'replace_me')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'replace_me')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds).toEqual({
      url: 'https://main-store-db.supabase.co',
      serviceRoleKey: 'eyJ_store_service_role_key',
      isDedicatedProject: false,
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(await fetchStoreCatalogProductsSafe()).toEqual([])
  })
})
