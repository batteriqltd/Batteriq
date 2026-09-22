-- EcoFlow September 2026 price corrections
-- Source: ECOFLOW T2 NEW SEPT 2026 PRICE LIST.xlsx
-- Price-only migration. Safe to re-run: unchanged prices are skipped.

BEGIN;

WITH price_updates(product_match, new_price) AS (
  VALUES
    ('delta-3-classic', 84379),
    ('delta-3-max', 148199),
    ('delta-3-ultra', 250799)
), matched AS (
  SELECT p.id, p.price_kes, u.new_price
  FROM products p
  JOIN price_updates u ON p.slug ILIKE '%' || u.product_match || '%'
  WHERE p.brand = 'EcoFlow'
    AND (u.product_match = 'delta-3-classic'
      OR (u.product_match = 'delta-3-max' AND p.slug NOT ILIKE '%plus%')
      OR (u.product_match = 'delta-3-ultra' AND p.slug NOT ILIKE '%plus%'))
    AND p.price_kes IS DISTINCT FROM u.new_price
)
INSERT INTO price_audit_log (product_id, old_price, new_price, reason)
SELECT id, price_kes, new_price, 'EcoFlow T2 September 2026 price list'
FROM matched;

UPDATE products p
SET price_kes = u.new_price,
    updated_at = NOW()
FROM (VALUES
  ('delta-3-classic', 84379),
  ('delta-3-max', 148199),
  ('delta-3-ultra', 250799)
) AS u(product_match, new_price)
WHERE p.brand = 'EcoFlow'
  AND p.slug ILIKE '%' || u.product_match || '%'
  AND (u.product_match = 'delta-3-classic'
    OR (u.product_match = 'delta-3-max' AND p.slug NOT ILIKE '%plus%')
    OR (u.product_match = 'delta-3-ultra' AND p.slug NOT ILIKE '%plus%'))
  AND p.price_kes IS DISTINCT FROM u.new_price;

COMMIT;

-- Verify the three corrected prices:
-- SELECT slug, name, price_kes
-- FROM products
-- WHERE brand = 'EcoFlow'
--   AND (slug ILIKE '%delta-3-classic%' OR slug ILIKE '%delta-3-max%' OR slug ILIKE '%delta-3-ultra%');