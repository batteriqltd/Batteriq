import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Use only on the server — never expose SUPABASE_SERVICE_ROLE_KEY to the client
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
