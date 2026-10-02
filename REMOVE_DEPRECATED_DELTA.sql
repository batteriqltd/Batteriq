-- BATTERIQ — Remove deprecated DELTA 3 variants
-- Removes: DELTA 3 100 Air, DELTA 3 Max Plus, DELTA 3 Ultra Plus
-- Keeps: delta-3-classic, delta-3-ultra, delta-pro, delta-pro-3 (+ rest of catalogue)
-- Run in Supabase SQL Editor. Safe to re-run (DELETEs are idempotent).

BEGIN;

-- Preview what will be removed (run first):
-- SELECT slug, name, price_kes, in_stock
-- FROM products
-- WHERE brand = 'EcoFlow'
--   AND (
--     slug ILIKE '%100-air%'
--     OR slug ILIKE '%max-plus%'
--     OR slug ILIKE '%ultra-plus%'
--     OR name ILIKE '%100 Air%'
--     OR name ILIKE '%Max Plus%'
--     OR name ILIKE '%Ultra Plus%'
--   );

DELETE FROM products
WHERE brand = 'EcoFlow'
  AND (
    slug ILIKE '%100-air%'
    OR slug ILIKE '%max-plus%'
    OR slug ILIKE '%ultra-plus%'
    OR name ILIKE '%100 Air%'
    OR name ILIKE '%Max Plus%'
    OR name ILIKE '%Ultra Plus%'
  );

COMMIT;

-- Verify: should return 0 rows for deprecated variants
-- SELECT slug, name FROM products
-- WHERE brand = 'EcoFlow'
--   AND (slug ILIKE '%100-air%' OR slug ILIKE '%max-plus%' OR slug ILIKE '%ultra-plus%');

-- Verify: approved DELTA range still present (expect 4 rows)
-- SELECT slug, name, price_kes, in_stock
-- FROM products
-- WHERE slug IN ('delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3')
-- ORDER BY sort_order;
