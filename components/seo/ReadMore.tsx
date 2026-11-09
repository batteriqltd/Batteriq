import type { ReactNode } from 'react'

/**
 * Long-text pattern: the first part is always shown; the rest sits in a native
 * <details>, so it is in the server HTML (indexable) and opens with "Read more".
 */
export function ReadMore({ lead, children }: { lead: ReactNode; children?: ReactNode }) {
  return (
    <div className="space-y-4">
      {lead}
      {children ? (
        <details className="group">
          <summary className="list-none cursor-pointer inline-flex text-blue-600 font-semibold text-sm hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Read more</span>
            <span className="hidden group-open:inline">Show less</span>
          </summary>
          <div className="space-y-4 mt-4">{children}</div>
        </details>
      ) : null}
    </div>
  )
}
