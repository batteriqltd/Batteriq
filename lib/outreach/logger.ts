import { createOutreachAdminClient, hasOutreachSupabaseConfig } from './supabase'
import type { OutreachModule } from './types'

export async function logOutreachEvent(params: {
  module: OutreachModule
  level: 'info' | 'warn' | 'error'
  event: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { module, level, event, message, metadata = {} } = params

  const prefix = `[OUTREACH:${module.toUpperCase()}:${event}]`
  if (level === 'error') {
    console.error(prefix, message, metadata)
  } else if (level === 'warn') {
    console.warn(prefix, message, metadata)
  } else {
    console.log(prefix, message)
  }

  // Persist to Outreach Supabase outreach_logs if credentials exist (never throw)
  if (!hasOutreachSupabaseConfig()) {
    return
  }

  try {
    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_logs') as any).insert({
      module,
      level,
      event,
      message: message.slice(0, 2000),
      metadata,
    })
  } catch (err) {
    console.error('[OUTREACH:LOGGER] Failed to write outreach_logs row:', err)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void | Promise<void>
}

export function isTransientError(err: unknown): boolean {
  if (!err) return false
  const status = (err as { status?: number; statusCode?: number }).status ??
    (err as { statusCode?: number }).statusCode
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status === 529 || (status >= 500 && status < 600)
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('529') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  )
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3)
  const baseDelayMs = options.baseDelayMs ?? 600
  const maxDelayMs = options.maxDelayMs ?? 8000
  const shouldRetry = options.shouldRetry ?? ((err) => isTransientError(err))

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (attempt >= maxAttempts || !shouldRetry(err, attempt)) {
        throw err
      }
      const jitter = Math.floor(Math.random() * 200)
      const delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1) + jitter)
      if (options.onRetry) {
        await options.onRetry(err, attempt, delayMs)
      }
      await sleep(delayMs)
    }
  }
  throw lastError
}
