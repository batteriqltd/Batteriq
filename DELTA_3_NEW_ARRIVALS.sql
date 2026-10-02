-- BATTERIQ — EcoFlow DELTA approved replacements
-- Source: ECOFLOW T2 NEW SEPT 2026 PRICE LIST.xlsx
-- Scope: keep only the approved EcoFlow Delta range on the homepage and product routes.
-- Safe to re-run: inserts/updates only the exact approved SKUs and matches on sku.

BEGIN;

INSERT INTO products (
  sku, brand, category, subcategory, name, slug, description, specs, images,
  price_kes, in_stock, stock_qty, featured, sort_order,
  meta_title, meta_description
) VALUES
(
  '5025901009', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 Classic', 'delta-3-classic',
  'The EcoFlow DELTA 3 Classic is a compact backup station for homes and offices that need reliable power through everyday outages. With 1024Wh LiFePO4 capacity and 1800W AC output, it keeps lights, Wi‑Fi, TV and essential electronics running while the grid is down. The model supports fast charging, app control and UPS switchover for sensitive devices.',
  '{"capacity":"1024Wh","ac_output":"1800W (Surge 3600W)","chemistry":"LFP (LiFePO4)","battery_life":"3500+ cycles","solar_input":"500W Max","ups_mode":"Yes (10ms switchover)","weight":"12.5kg","warranty":"24 months"}'::jsonb,
  ARRAY[]::text[],
  84379, true, 10, false, 10,
  'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
  'Buy the EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5024201005', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 Ultra', 'delta-3-ultra',
  'The EcoFlow DELTA 3 Ultra is the larger-capacity DELTA 3 model for whole-home or business backup. It delivers 3600Wh of LiFePO4 storage and 3076W AC output, giving you stronger support for high-demand loads while keeping the EcoFlow app, fast charging and modern battery management in place.',
  '{"capacity":"3600Wh","ac_output":"3076W","chemistry":"LFP (LiFePO4)","solar_input":"Up to 5000W","battery_life":"3500+ cycles","weight":"36kg","ups_mode":"Yes","warranty":"24 months"}'::jsonb,
  ARRAY[]::text[],
  250799, true, 10, false, 11,
  'EcoFlow DELTA 3 Ultra Kenya — 3600Wh KES 250,799 | Batteriq',
  'Buy the EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3600Wh LFP, 3076W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5004501016', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA Pro', 'delta-pro',
  'The EcoFlow DELTA Pro is a serious home backup battery for Kenyan homes, offices and light commercial setups. With 3600Wh of LiFePO4 storage and 3600W AC output, it runs major appliances during outages, recharges fast, and can be expanded with additional batteries for longer runtime.',
  '{"capacity":"3600Wh","ac_output":"3600W (Surge 7200W)","chemistry":"LFP (LiFePO4)","solar_input":"1600W Max","ports":"13","weight":"45kg","warranty":"24 months"}'::jsonb,
  ARRAY[]::text[],
  291399, true, 10, false, 12,
  'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
  'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5013701013', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA Pro 3', 'delta-pro-3',
  'The EcoFlow DELTA Pro 3 is the premium DELTA model built for demanding backup applications. Its 4096Wh LiFePO4 battery and 4000W AC output make it a strong fit for heavy-duty household backup, offices and small commercial sites that need dependable power when the grid fails.',
  '{"capacity":"4096Wh","ac_output":"4000W (Surge 8000W)","chemistry":"LFP (LiFePO4)","solar_input":"2000W Max","ports":"12","weight":"51.5kg","warranty":"24 months"}'::jsonb,
  ARRAY[]::text[],
  461799, true, 10, false, 13,
  'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
  'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-3-classic') THEN
    RAISE EXCEPTION 'delta-3-classic missing — SKU 5025901009 may be owned by another product; resolve manually before re-running.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-3-ultra') THEN
    RAISE EXCEPTION 'delta-3-ultra missing — SKU 5024201005 may be owned by another product; resolve manually before re-running.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-pro') THEN
    RAISE EXCEPTION 'delta-pro missing — SKU 5004501016 may be owned by another product; resolve manually before re-running.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-pro-3') THEN
    RAISE EXCEPTION 'delta-pro-3 missing — SKU 5013701013 may be owned by another product; resolve manually before re-running.';
  END IF;
END $$;

COMMIT;

SELECT sku, slug, name, price_kes, in_stock, images
FROM products
WHERE slug IN ('delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3')
ORDER BY sort_order;
