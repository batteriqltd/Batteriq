'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon?: LucideIcon
  group: string
  keywords?: string
  onSelect: () => void
}

/**
 * Global Cmd/Ctrl+K palette. Desktop-focused (keyboard-driven), but works
 * fine tapped open from a mobile search icon too. Caller owns the item list
 * so it can mix static nav destinations with live client data.
 */
export function CommandPalette({ items }: { items: CommandItem[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key === 'k' || e.key === 'K'
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 30)
    return items
      .filter((it) =>
        `${it.label} ${it.sublabel ?? ''} ${it.keywords ?? ''}`.toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [items, query])

  function select(item: CommandItem) {
    setOpen(false)
    item.onSelect()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-10 w-56 px-3.5 rounded-[var(--bq-radius-lg)] bg-[var(--bq-surface-sunken)] border border-[var(--bq-border)] text-[var(--bq-text-tertiary)] text-[12px] font-medium transition-colors hover:border-[var(--bq-border-strong)]"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--bq-surface)] border border-[var(--bq-border)] text-[10px] font-bold">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'var(--bq-overlay)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="w-full max-w-lg rounded-[var(--bq-radius-2xl)] bg-[var(--bq-surface)] shadow-[var(--bq-shadow-4)] overflow-hidden border border-[var(--bq-border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--bq-border)]">
              <Search className="w-4 h-4 text-[var(--bq-text-tertiary)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIdx(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.max(0, i - 1))
                  } else if (e.key === 'Enter' && filtered[activeIdx]) {
                    e.preventDefault()
                    select(filtered[activeIdx])
                  }
                }}
                placeholder="Search clients, quotes, or jump to a section…"
                className="flex-1 bg-transparent outline-none text-[14px] text-[var(--bq-text-primary)] placeholder:text-[var(--bq-text-tertiary)]"
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-10 text-center bq-text-body text-[var(--bq-text-tertiary)]">
                  No matches.
                </p>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon
                  const active = idx === activeIdx
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => select(item)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--bq-radius-md)] text-left transition-colors ${
                        active ? 'bg-[var(--bq-blue-light)]' : ''
                      }`}
                    >
                      {Icon && (
                        <span className="h-8 w-8 rounded-[var(--bq-radius-md)] bg-[var(--bq-surface-sunken)] text-[var(--bq-blue)] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block bq-text-body font-semibold text-[var(--bq-text-primary)] truncate">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="block bq-text-caption text-[var(--bq-text-tertiary)] truncate">
                            {item.sublabel}
                          </span>
                        )}
                      </span>
                      {active && <CornerDownLeft className="w-3.5 h-3.5 text-[var(--bq-text-tertiary)] flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
