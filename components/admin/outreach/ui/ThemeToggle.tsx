'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'bq-console-theme'

export function useConsoleTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') setTheme(saved)
    } catch {
      /* storage unavailable */
    }
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return { theme, toggle }
}

export function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark' | null; onToggle: () => void }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="h-11 w-11 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface)] border border-[var(--bq-border)] flex items-center justify-center text-[var(--bq-text-secondary)] hover:text-[var(--bq-blue)] transition-colors"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
