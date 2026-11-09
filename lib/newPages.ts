// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 pages and their publish switch.
//
// A page that is not yet published can be opened at its URL for the owner to
// review, but it is noindex, left out of the sitemap and not linked from any
// existing page. Flip it to true once the owner approves it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo'

export const NEW_PAGES = {
  '/solar-generators': false,
  '/home-backup-power': false,
  '/compare/ecoflow-delta-2-vs-delta-3': false,
  '/compare/ecoflow-delta-pro-vs-delta-pro-3': false,
  '/compare/ecoflow-river-2-vs-bluetti-ac2p': false,
  '/anker-kenya': false,
  '/soundcore-kenya': false,
  '/eufy-kenya': false,
  '/answers/what-size-power-station': false,
} as const satisfies Record<string, boolean>

export type NewPagePath = keyof typeof NEW_PAGES

export const isPublished = (path: string) => (NEW_PAGES as Record<string, boolean>)[path] === true

/** Canonical + Open Graph as usual; noindex until the page is published. */
export function newPageMetadata(path: NewPagePath, meta: Metadata): Metadata {
  return withCanonical(path, {
    ...meta,
    ...(isPublished(path) ? {} : { robots: { index: false, follow: true } }),
  })
}

/** Published Phase 5 pages, for the sitemap. */
export const publishedNewPages = () => (Object.keys(NEW_PAGES) as NewPagePath[]).filter(isPublished)
