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
  'The EcoFlow DELTA 3 Classic is EcoFlow’s best-value 1kWh portable power station for Kenyan homes, outdoor work and everyday backup. With 1024Wh LiFePO4 capacity and 1800W AC output (3600W surge, X-Boost to 2400W), it powers essentials like lights, Wi‑Fi, TVs, fridges and power tools. Charges 0–80% in 45 mins via 1400W AC, 500W solar max, 10ms UPS switchover, 5 outlets, whisper-quiet 30dB operation.',
  '{"capacity":"1024Wh","ac_output":"1800W (Surge 3600W)","x_boost":"2400W","chemistry":"LFP (LiFePO4)","battery_life":"4000 cycles to 80%","solar_input":"500W Max","ac_charging":"1400W (0-80% in 45 mins)","ups_mode":"Yes (10ms switchover)","outlets":"5","weight":"12.1kg","dimensions":"398 x 200 x 283mm","expandable":"No","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-3-classic.png']::text[],
  84379, true, 10, false, 10,
  'EcoFlow DELTA 3 Classic Kenya — 1024Wh KES 84,379 | Batteriq',
  'Buy the EcoFlow DELTA 3 Classic in Kenya for KES 84,379. 1024Wh LFP, 1800W AC output, 10ms UPS. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5024201005', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 Ultra', 'delta-3-ultra',
  'The EcoFlow DELTA 3 Ultra is the 3072Wh whole-home backup station for bigger Kenyan homes and businesses. With 3600W AC output (7200W surge, X-Boost to 4600W), 10ms UPS auto-switch, 4 charging methods (0-80% in 89 mins via AC), whisper-quiet 25dB operation and OASIS app control with Storm Guard, it keeps fridges, microwaves, office loads and essentials running through long outages.',
  '{"capacity":"3072Wh","ac_output":"3600W (Surge 7200W)","x_boost":"4600W","chemistry":"LFP (LiFePO4)","battery_life":"4000 cycles to 80%","solar_input":"1600W Max","ac_charging":"0-80% in 89 mins","ups_mode":"Yes (10ms switchover)","expandable":"No","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-3-ultra-plus.png']::text[],
  250799, true, 10, false, 11,
  'EcoFlow DELTA 3 Ultra Kenya — 3072Wh KES 250,799 | Batteriq',
  'Buy the EcoFlow DELTA 3 Ultra in Kenya for KES 250,799. 3072Wh LFP, 3600W AC output, whole-home backup. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5004501016', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA Pro', 'delta-pro',
  'The EcoFlow DELTA Pro is a serious home backup battery for Kenyan homes, offices and light commercial setups. With 3600Wh of LiFePO4 storage and 3600W AC output, it runs major appliances during outages, recharges fast, and can be expanded with additional batteries for longer runtime.',
  '{"capacity":"3600Wh","ac_output":"3600W (Surge 7200W)","chemistry":"LFP (LiFePO4)","solar_input":"1600W Max","ports":"13","weight":"45kg","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-pro.jpg']::text[],
  291399, true, 10, false, 12,
  'EcoFlow DELTA Pro Kenya — 3600Wh KES 291,399 | Batteriq',
  'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5013701013', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA Pro 3', 'delta-pro-3',
  'The EcoFlow DELTA Pro 3 is the premium DELTA model built for demanding backup applications. Its 4096Wh LiFePO4 battery and 4000W AC output make it a strong fit for heavy-duty household backup, offices and small commercial sites that need dependable power when the grid fails.',
  '{"capacity":"4096Wh","ac_output":"4000W (Surge 8000W)","chemistry":"LFP (LiFePO4)","solar_input":"2000W Max","ports":"12","weight":"51.5kg","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-pro-3.jpg']::text[],
  461799, true, 10, false, 13,
  'EcoFlow DELTA Pro 3 Kenya — 4096Wh KES 461,799 | Batteriq',
  'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output, 12 ports. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
),
(
  '5016501003', 'EcoFlow', 'Power Stations', 'DELTA Series',
  'EcoFlow DELTA 3 Max', 'delta-3-max',
  'The EcoFlow DELTA 3 Max is the 2048Wh mid-range backup station for Kenyan homes and small businesses. With 2400W AC output (5000W surge, X-Boost to 3400W), 1000W solar input, fast 2000W AC charging (0–80% in about an hour), expandability to 6kWh and sub-30ms UPS switchover, it covers fridges, microwaves, TVs, Wi‑Fi and office loads through long outages.',
  '{"capacity":"2048Wh","ac_output":"2400W (Surge 5000W)","x_boost":"3400W","chemistry":"LFP (LiFePO4)","battery_life":"3500+ cycles to 80%","solar_input":"1000W Max","ac_charging":"2000W (0-80% in ~1.1 hrs)","ups_mode":"Yes (<30ms switchover)","usb_c":"2 x USB-C 140W","usb_a":"2 x USB-A 18W","expandable":"Yes — up to 6kWh","weight":"22kg","dimensions":"497 x 264 x 360mm","warranty":"24 months"}'::jsonb,
  ARRAY['/products/ecoflow/delta-3-max.png']::text[],
  148199, true, 10, false, 14,
  'EcoFlow DELTA 3 Max Kenya — 2048Wh KES 148,199 | Batteriq',
  'Buy the EcoFlow DELTA 3 Max in Kenya for KES 148,199. 2048Wh LFP, 2400W AC output, expandable to 6kWh. Authorised EcoFlow dealer. M-Pesa checkout. 24-month warranty.'
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
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'delta-3-max') THEN
    RAISE EXCEPTION 'delta-3-max missing — SKU 5016501003 may be owned by another product; resolve manually before re-running.';
  END IF;
END $$;

COMMIT;

SELECT sku, slug, name, price_kes, in_stock, images
FROM products
WHERE slug IN ('delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3', 'delta-3-max')
ORDER BY sort_order;
