// ─────────────────────────────────────────────────────────────────────────────
// Card processing fee (Pesapal / Visa / Mastercard only)
//
// Pesapal charges Batteriq a percentage on every card transaction. Company
// policy is to pass that cost on to the customer rather than absorb it, so the
// fee is added ON TOP of the order total for card payments.
//
// This applies ONLY to the Pesapal card flow. M-Pesa orders never touch this
// module and their totals are unchanged.
//
// The rate lives in one place — NEXT_PUBLIC_PESAPAL_CARD_FEE_RATE — so it can
// be changed without a code edit. It is NEXT_PUBLIC_ on purpose: the checkout
// page renders a live preview with the same rate the server charges. The rate
// is not a secret, and the amount actually charged is always recomputed
// server-side from the order stored in the database — never trusted from the
// browser.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CARD_FEE_RATE = 0.02

function parseRate(raw: string | undefined): number {
  const value = Number(raw)
  // Guard against a typo in env (e.g. "2" meaning 2%) silently charging 200%.
  if (!Number.isFinite(value) || value < 0 || value > 0.2) return DEFAULT_CARD_FEE_RATE
  return value
}

export const PESAPAL_CARD_FEE_RATE = parseRate(process.env.NEXT_PUBLIC_PESAPAL_CARD_FEE_RATE)

export type CardFeeBreakdown = {
  /** The order value — exactly what an M-Pesa customer would pay. */
  subtotalKes: number
  /** The pass-through Pesapal fee, rounded to cents. */
  feeKes: number
  /** subtotalKes + feeKes — the amount sent to Pesapal as `amount`. */
  totalChargedKes: number
  /** The rate used, stored on the order for accounting. */
  rate: number
  /** Rate as a display string, e.g. "2%". */
  ratePercentLabel: string
}

/**
 * Works in integer cents so subtotal + fee always sums exactly to the total —
 * no floating-point drift between what we show, what we store, and what
 * Pesapal charges.
 */
export function calculateCardFee(
  subtotal: number | string,
  rate: number = PESAPAL_CARD_FEE_RATE
): CardFeeBreakdown {
  const amount = Number(subtotal)
  const safeSubtotal = Number.isFinite(amount) && amount > 0 ? amount : 0

  const subtotalCents = Math.round(safeSubtotal * 100)
  const feeCents = Math.round(subtotalCents * rate)
  const totalCents = subtotalCents + feeCents

  return {
    subtotalKes: subtotalCents / 100,
    feeKes: feeCents / 100,
    totalChargedKes: totalCents / 100,
    rate,
    ratePercentLabel: `${Number((rate * 100).toFixed(2))}%`,
  }
}

/**
 * Money formatter that always shows cents. The site-wide `formatKES` rounds to
 * whole shillings, which would make a breakdown like 1,000 + 20.50 = 1,020.50
 * appear not to add up. Used for card fee rows only.
 */
export function formatKesExact(amount: number | string): string {
  const n = Number(amount)
  const safe = Number.isFinite(n) ? n : 0
  return `KES ${safe.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
