-- ============================================================
-- 009 — Visa / Mastercard payments via Paystack
--
-- Purely additive. No M-Pesa column is touched, and existing Pesapal orders keep
-- their columns and their 'pesapal_card' value so their history stays intact.
--
-- Run this in the Supabase SQL editor BEFORE deploying the Paystack checkout:
-- until it has run, new card orders are rejected by the CHECK constraint.
-- Fees reuse the existing card_fee_rate / card_fee_kes / total_charged_kes columns.
-- ============================================================

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paystack_reference          TEXT,
  ADD COLUMN IF NOT EXISTS paystack_transaction_id     TEXT,
  ADD COLUMN IF NOT EXISTS paystack_card_type          TEXT,
  ADD COLUMN IF NOT EXISTS paystack_status_description TEXT;

COMMENT ON COLUMN orders.paystack_reference IS
  'Our reference for the latest Paystack attempt, saved before calling Paystack. NULL on non-Paystack orders.';

-- Extends the existing CHECK; every previously allowed value is retained.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'mpesa_now',
    'cod_cash',
    'cod_mpesa',
    'sales_confirmation',
    'pesapal_card',
    'paystack_card'
  ));

-- Used by the webhook and the callback page to find the order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paystack_reference
  ON orders (paystack_reference)
  WHERE paystack_reference IS NOT NULL;

COMMIT;
