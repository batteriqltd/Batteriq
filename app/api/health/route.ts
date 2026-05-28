import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateEnv } from '@/lib/validateEnv'

export async function GET() {
  validateEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const checks = {
    supabaseUrl: url?.startsWith('https://') ? '✅' : `❌ Invalid: ${url?.slice(0, 30)}`,
    supabaseKey: (key?.length ?? 0) > 100 ? '✅' : '❌ Missing or short',
    mpesaKey: (process.env.MPESA_CONSUMER_KEY?.length ?? 0) > 10 ? '✅' : '❌ Missing',
    mpesaEnv: process.env.MPESA_ENVIRONMENT ?? '❌ Not set',
    resendKey: process.env.RESEND_API_KEY?.startsWith('re_') ? '✅' : '❌ Missing',
  }

  let dbStatus = '⏳ Testing...'
  try {
    const supabase = createClient(url!, key!)
    const start = Date.now()
    const { error } = await supabase.from('products').select('id').limit(1)
    const ms = Date.now() - start
    dbStatus = error ? `❌ ${error.message}` : `✅ Connected (${ms}ms)`
  } catch (e: unknown) {
    dbStatus = `❌ Exception: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    status: 'Batteriq Health Check',
    timestamp: new Date().toISOString(),
    environment: checks,
    database: dbStatus,
  }, { status: 200 })
}
