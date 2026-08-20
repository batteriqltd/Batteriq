-- ============================================================
-- 005 — Visa / Mastercard payments via Pesapal
--
-- Purely additive. No existing M-Pesa column is renamed, repurposed or
-- dropped: mpesa_checkout_request_id, mpesa_transaction_code and
-- mpesa_failure_reason keep working exactly as before.
--
-- Run this in the Supabase SQL editor BEFORE deploying the card checkout.
-- ============================================================

-- ── Pesapal transaction references (for reconciliation and support) ──────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pesapal_order_tracking_id  TEXT,
  ADD COLUMN IF NOT EXISTS pesapal_merchant_reference TEXT,
  ADD COLUMN IF NOT EXISTS pesapal_payment_method     TEXT,
  ADD COLUMN IF NOT EXISTS pesapal_confirmation_code  TEXT,
  ADD COLUMN IF NOT EXISTS pesapal_status_description TEXT;

-- ── Card fee breakdown ───────────────────────────────────────────────────────
-- subtotal_kes / total_kes keep their existing meaning: the order value, i.e.
-- exactly what an M-Pesa customer pays. The card fee is stored SEPARATELY so
-- accounting can always see order value vs. what the customer was charged.
--
--   total_kes         = order value  (unchanged, same as M-Pesa)
--   card_fee_kes      = pass-through Pesapal fee (card orders only)
--   total_charged_kes = total_kes + card_fee_kes (what Pesapal collected)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS card_fee_rate     NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS card_fee_kes      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_charged_kes NUMERIC(12,2);

COMMENT ON COLUMN orders.card_fee_kes IS
  'Pesapal card processing fee passed on to the customer. NULL for M-Pesa orders.';
COMMENT ON COLUMN orders.total_charged_kes IS
  'Amount actually charged to the card = total_kes + card_fee_kes. NULL for M-Pesa orders.';

-- ── Allow the card payment method ────────────────────────────────────────────
-- Extends the existing CHECK; every previously allowed value is retained.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'mpesa_now',
    'cod_cash',
    'cod_mpesa',
    'sales_confirmation',
    'pesapal_card'
  ));

-- ── Lookup indexes used by the IPN listener ──────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_pesapal_tracking_id
  ON orders (pesapal_order_tracking_id)
  WHERE pesapal_order_tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pesapal_merchant_reference
  ON orders (pesapal_merchant_reference)
  WHERE pesapal_merchant_reference IS NOT NULL;
