'use client'

import { escapeRe } from '@/lib/productSearch'

/** Wraps the matched search terms in the product name so hits are visible. */
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0 || !text) return <>{text}</>
  const pattern = tokens.slice().sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  let parts: string[]
  try {
    parts = text.split(new RegExp(`(${pattern})`, 'ig'))
  } catch {
    return <>{text}</>
  }
  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase())
          ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}
