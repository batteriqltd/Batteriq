-- BATTERIQ — DELTA 3 new arrivals (DELTA 3 Max + DELTA 3 2000 Air)
-- Source: ECOFLOW T2 NEW SEPT 2026 PRICE LIST.xlsx
-- Images: public/products/ecoflow/delta-3-max.png, public/products/ecoflow/delta-3-2000-air.jpg
-- Run this file in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/ueagjjdbbukdkktviyrv/editor
-- Scope: inserts the two products linked from the homepage NewProductsSpotlight
-- section so /ecoflow/delta-3-max and /ecoflow/delta-3-2000-air return 200.
-- Safe to re-run: matched on sku; unchanged rows are skipped.

BEGIN;

INSERT INTO products (
  sku, brand, category, subcategory, name, slug, description, specs, images,
  price_kes, in_stock, stock_qty, featured, sort_order,
  meta_title, meta_description
) VALUES
(
  '5016501003', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 Max', 'delta-3-max',
  'The EcoFlow DELTA 3 Max delivers 2048Wh of LFP capacity and 2400W continuous AC output (5000W surge) with X-Boost to 3400W. Recharge to 80% in about 1.1 hours, add up to 6kWh with a smart extra battery, and monitor everything from the EcoFlow app. Built for Kenyan homes and businesses that need serious backup without a permanent installation.',
  '{"capacity":"2048Wh","ac_output":"2400W (Surge 5000W)","chemistry":"LFP (LiFePO4)","x_boost":"3400W","cycle_life":"3500+ cycles to 80%","weight":"22kg","dimensions":"497 x 264 x 360mm","solar_input":"1000W Max (11-60V, 15A)","ac_charging":"2000W Max, 0-80% in 1.1 hrs","usb_c":"2 x USB-C 140W","usb_a":"2 x USB-A 18W","expandable":"Yes — up to 6kWh","app_control":"Yes (Wi-Fi & Bluetooth)","ups_mode":"Yes (<30ms switchover)","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-3-max.png']::text[],
  148199, true, 10, false, 10,
  'EcoFlow DELTA 3 Max Kenya — 2048Wh KES 148,199 | Batteriq',
  'Buy the EcoFlow DELTA 3 Max in Kenya for KES 148,199. 2048Wh LFP, 2400W AC output, app control. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5023701006', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 2000 Air', 'delta-3-2000-air',
  'The EcoFlow DELTA 3 2000 Air pairs 1920Wh of LFP capacity with 1000W of pure sine wave output in a compact, apartment-friendly frame. X-Stream charging reaches a full charge in about 2 hours, 800W solar input tops it up off-grid, and 10ms UPS switchover keeps fridge, router and lights on through outages. Quiet, portable backup for Kenyan homes.',
  '{"capacity":"1920Wh","ac_output":"1000W (Surge 2000W)","chemistry":"LFP (LiFePO4)","cycle_life":"3000+ cycles to 80%","solar_input":"800W Max","ac_charging":"Up to 1600W, full in ~2 hrs","usb_c":"2 x USB-C 100W","usb_a":"2 x USB-A 18W","ups_mode":"Yes (10ms switchover)","noise":"Below 44 dB","app_control":"Yes (Wi-Fi & Bluetooth)","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-3-2000-air.jpg']::text[],
  106725, true, 10, false, 11,
  'EcoFlow DELTA 3 2000 Air Kenya — 1920Wh KES 106,725 | Batteriq',
  'Buy the EcoFlow DELTA 3 2000 Air in Kenya for KES 106,725. 1920Wh LFP, 1000W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
)
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
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
  meta_description = EXCLUDED.meta_description,
  updated_at = NOW()
WHERE products.slug = EXCLUDED.slug
   OR products.name = EXCLUDED.name;

-- If the SKU already belonged to a different product, the conflict update above
-- is skipped (WHERE guard). Ensure the target slugs exist exactly once:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-3-max') THEN
    RAISE EXCEPTION 'delta-3-max missing — SKU 5016501003 may be owned by another product; resolve manually before re-running.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-3-2000-air') THEN
    RAISE EXCEPTION 'delta-3-2000-air missing — SKU 5023701006 may be owned by another product; resolve manually before re-running.';
  END IF;
END $$;

COMMIT;

-- Verification: both rows must return with in_stock = true and the new image paths.
SELECT sku, slug, name, subcategory, price_kes, in_stock, images, meta_title
FROM products
WHERE slug IN ('delta-3-max', 'delta-3-2000-air')
ORDER BY sort_order;
