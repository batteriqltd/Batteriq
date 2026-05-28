'use client'
import { useAdminAutoLogout } from '@/hooks/useAdminAutoLogout'

export function AutoLogoutProvider() {
  useAdminAutoLogout()
  return null
}
