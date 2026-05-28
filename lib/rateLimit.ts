const rateMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const existing = rateMap.get(key)

  if (!existing || now > existing.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  existing.count++
  return { allowed: true, remaining: maxRequests - existing.count }
}
