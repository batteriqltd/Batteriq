-- ============================================================
-- BATTERIQ — Bluetti Level C price update
-- Source: Bluetti Kenya Distributor Price List (updated 20260701)
-- Run in Supabase SQL Editor. Only touches Bluetti product prices.
-- ============================================================

-- Portable Power Stations
UPDATE products SET price_kes = 33500  WHERE brand = 'Bluetti' AND name ILIKE '%AC50P%';
UPDATE products SET price_kes = 60000  WHERE brand = 'Bluetti' AND name ILIKE '%AC70P%';
UPDATE products SET price_kes = 34500  WHERE brand = 'Bluetti' AND name ILIKE '%Premium 30%';
UPDATE products SET price_kes = 72500  WHERE brand = 'Bluetti' AND name ILIKE '%Premium 100%';
UPDATE products SET price_kes = 76000  WHERE brand = 'Bluetti' AND name ILIKE '%AC180P%';
UPDATE products SET price_kes = 127500 WHERE brand = 'Bluetti' AND name ILIKE '%AC200PL%';
UPDATE products SET price_kes = 120000 WHERE brand = 'Bluetti' AND name ILIKE '%Premium 200%';

-- Solar Panels
-- Price list row "PV100 — Solar Panel 120W" = KES 16,500.
-- The store's 120W panel is listed as PV120, so both patterns are covered.
UPDATE products SET price_kes = 16500  WHERE brand = 'Bluetti' AND (name ILIKE '%PV100%' OR name ILIKE '%PV120%');
UPDATE products SET price_kes = 27500  WHERE brand = 'Bluetti' AND name ILIKE '%PV200%';
UPDATE products SET price_kes = 70000  WHERE brand = 'Bluetti' AND name ILIKE '%PV350%';

-- Refresh old "KES xx,xxx" prices baked into SEO meta text for these products
UPDATE products
SET
  meta_title = regexp_replace(meta_title, 'KES [0-9,]+', 'KES ' || to_char(price_kes, 'FM999,999,999'), 'g'),
  meta_description = regexp_replace(meta_description, 'KES [0-9,]+', 'KES ' || to_char(price_kes, 'FM999,999,999'), 'g')
WHERE brand = 'Bluetti'
  AND (
    name ILIKE '%AC50P%' OR name ILIKE '%AC70P%' OR name ILIKE '%AC180P%' OR name ILIKE '%AC200PL%'
    OR name ILIKE '%Premium 30%' OR name ILIKE '%Premium 100%' OR name ILIKE '%Premium 200%'
    OR name ILIKE '%PV100%' OR name ILIKE '%PV120%' OR name ILIKE '%PV200%' OR name ILIKE '%PV350%'
  );

-- Verify
SELECT name, sku, price_kes, in_stock
FROM products
WHERE brand = 'Bluetti'
ORDER BY name;
