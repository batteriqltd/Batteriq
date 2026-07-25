-- BATTERIQ — Bluetti distributor list sync
-- Source: Bluetti Kenya Distributor Price List, updated 2026-07-01.
-- Run this file in the Supabase SQL Editor.
-- Scope: adds the three missing Bluetti Premium V2 power stations and
-- synchronizes only the price/availability fields represented on that list.

BEGIN;

-- Missing products: add them to the existing Power Stations category.
-- Official Bluetti product images are stored in public/products/bluetti/.
INSERT INTO products (
  sku, brand, category, name, slug, description, specs, images,
  price_kes, in_stock, stock_qty, featured, sort_order,
  meta_title, meta_description
) VALUES
(
  'BLUETTI-PREMIUM-30-V2', 'Bluetti', 'Power Stations',
  'Bluetti Premium 30 V2', 'bluetti-premium-30-v2',
  'The Bluetti Premium 30 V2 is a compact 320Wh LiFePO4 portable power station with 600W AC output, fast charging, solar input, and a 10ms UPS mode for everyday backup power in Kenya.',
  '{"capacity":"320Wh","ac_output":"600W","chemistry":"LiFePO4","solar_input":"200W max","ac_charge":"380W max","ups":"10ms","weight":"4.3kg"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-premium-30-v2.png']::text[],
  34500, true, 10, false, 103,
  'Buy Bluetti Premium 30 V2 in Kenya — KES 34,500 | Batteriq',
  'Buy the Bluetti Premium 30 V2 in Kenya for KES 34,500. 320Wh LiFePO4 capacity and 600W AC output with fast charging and UPS backup.'
),
(
  'BLUETTI-PREMIUM-100-V2', 'Bluetti', 'Power Stations',
  'Bluetti Premium 100 V2', 'bluetti-premium-100-v2',
  'The Bluetti Premium 100 V2 provides 1024Wh of LiFePO4 capacity and 2000W AC output in a portable design for home backup, camping, and road trips in Kenya.',
  '{"capacity":"1024Wh","ac_output":"2000W","chemistry":"LiFePO4","solar_input":"1000W max","ac_charge":"1200W max","weight":"11.5kg"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-premium-100-v2.webp']::text[],
  72500, true, 10, false, 104,
  'Buy Bluetti Premium 100 V2 in Kenya — KES 72,500 | Batteriq',
  'Buy the Bluetti Premium 100 V2 in Kenya for KES 72,500. 1024Wh LiFePO4 capacity and 2000W AC output for reliable portable backup power.'
),
(
  'BLUETTI-PREMIUM-200-V2', 'Bluetti', 'Power Stations',
  'Bluetti Premium 200 V2', 'bluetti-premium-200-v2',
  'The Bluetti Premium 200 V2 delivers 2073.6Wh of LiFePO4 capacity and 2700W AC output, with fast AC charging, up to 1000W solar input, and app control for high-demand backup power in Kenya.',
  '{"capacity":"2073.6Wh","ac_output":"2700W","chemistry":"LiFePO4","solar_input":"1000W max","ac_charge":"1800W max","ups":"15ms","weight":"24.2kg"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-premium-200-v2.png']::text[],
  120000, true, 8, false, 106,
  'Buy Bluetti Premium 200 V2 in Kenya — KES 120,000 | Batteriq',
  'Buy the Bluetti Premium 200 V2 in Kenya for KES 120,000. 2073.6Wh LiFePO4 capacity and 2700W AC output with fast charging and solar input.'
)
ON CONFLICT (sku) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  images = EXCLUDED.images,
  price_kes = EXCLUDED.price_kes,
  in_stock = EXCLUDED.in_stock,
  stock_qty = EXCLUDED.stock_qty,
  sort_order = EXCLUDED.sort_order,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

-- Existing products from the same distributor list: update only price and stock status.
UPDATE products AS p
SET
  price_kes = v.price_kes,
  in_stock = v.in_stock,
  stock_qty = CASE WHEN v.in_stock THEN GREATEST(p.stock_qty, 1) ELSE 0 END
FROM (
  VALUES
    ('BLUETTI-AC50P', 33500::numeric, false),
    ('BLUETTI-AC70P', 60000::numeric, true),
    ('BLUETTI-AC180P', 76000::numeric, true),
    ('BLUETTI-AC200PL', 127500::numeric, false),
    ('BLUETTI-PV120', 16500::numeric, true),
    ('BLUETTI-PV200', 27500::numeric, true),
    ('BLUETTI-PV350', 70000::numeric, true)
) AS v(sku, price_kes, in_stock)
WHERE p.sku = v.sku;

COMMIT;

-- Verification: should return the ten products represented on the source list.
SELECT sku, name, category, price_kes, in_stock, images
FROM products
WHERE sku IN (
  'BLUETTI-AC50P', 'BLUETTI-AC70P', 'BLUETTI-PREMIUM-30-V2',
  'BLUETTI-PREMIUM-100-V2', 'BLUETTI-AC180P', 'BLUETTI-AC200PL',
  'BLUETTI-PREMIUM-200-V2', 'BLUETTI-PV120', 'BLUETTI-PV200', 'BLUETTI-PV350'
)
ORDER BY category, sort_order, name;
