export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

export function sanitizeEmail(email: string): string {
  return sanitizeString(email, 254).toLowerCase()
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').slice(0, 15)
}

export function sanitizeNumber(value: unknown): number {
  const num = Number(value)
  return isNaN(num) || num < 0 ? 0 : num
}
