/* ── Product search engine ──────────────────────────────────────
 * Shared by the Pricing Engine and Stock & Price Control so both admin
 * screens rank results identically. Pure functions only — no React.
 */

/**
 * Lowercases and collapses every non-alphanumeric run to a single space, so
 * "DELTA 2 Max", "delta-2-max" and "delta2max" all reduce to comparable text.
 */
export function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Splits a raw search box value into the tokens scoreMatch expects. */
export function tokenize(query: string): string[] {
  return query ? query.split(' ').filter(Boolean) : []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildHaystack(p: any) {
  const name = normalize(p.name)
  const sku = normalize(p.sku)
  const category = normalize(p.category)
  const subcategory = normalize(p.subcategory)
  const all = `${name} ${sku} ${normalize(p.brand)} ${category} ${subcategory} ${normalize(p.slug)}`
  return { name, sku, category, subcategory, all, flat: all.replace(/ /g, '') }
}

export type Haystack = ReturnType<typeof buildHaystack>

/**
 * Relevance score for one product against the search tokens.
 * Every token must appear somewhere (AND semantics) — "delta max" will not
 * return a RIVER unit just because it matched "max". Returns 0 for no match.
 */
export function scoreMatch(hay: Haystack, tokens: string[], query: string): number {
  if (tokens.length === 0) return 1

  let score = 0
  for (const t of tokens) {
    if (!hay.all.includes(t) && !hay.flat.includes(t)) return 0

    if (hay.name === t) score += 120
    else if (hay.name.startsWith(t)) score += 60
    else if (new RegExp(`\\b${escapeRe(t)}`).test(hay.name)) score += 34
    else if (hay.name.includes(t)) score += 20
    else if (hay.sku.includes(t)) score += 16
    else if (hay.category.includes(t) || hay.subcategory.includes(t)) score += 9
    else score += 4
  }

  // Reward phrase matches so "delta 2" outranks a product that merely
  // contains "delta" and "2" in unrelated places.
  if (hay.name.startsWith(query)) score += 80
  else if (hay.name.includes(query)) score += 45
  else if (hay.flat.includes(query.replace(/ /g, ''))) score += 20

  return score
}
