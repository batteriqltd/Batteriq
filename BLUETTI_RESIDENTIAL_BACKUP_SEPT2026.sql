-- ============================================================
-- BATTERIQ — Bluetti Sept 2026 distributor list sync
-- Source: Bluetti Kenya Distributor Price List (Updated On 20260920)
-- Customer prices = RRP (portable) / Level C (residential).
--
-- NOTE: no SQL run is required. The storefront renders these rows from
-- code fallbacks (lib/bluetti-residential.ts), and Admin → Products →
-- "Apply Bluetti sync" persists them to the DB in one click.
-- This file is kept for manual runs / audit only.
-- ============================================================

BEGIN;

-- ── Missing rows: insert all 8 (newest lead via sort_order) ──
INSERT INTO products (
  sku, brand, category, subcategory, name, slug, description, specs, images,
  price_kes, in_stock, stock_qty, featured, sort_order,
  discount_badge, meta_title, meta_description
) VALUES
(
  'BLUETTI-HOMESTAR-3', 'Bluetti', 'Power Stations', 'Residential Backup',
  'Bluetti Homestar 3', 'bluetti-homestar-3',
  'The Bluetti Homestar 3 is an all-in-one residential backup system with 2.0kW continuous output and 3.01kWh battery storage. A fixed home backup unit that keeps lights, fridge, WiFi, TV and phone charging running through KPLC outages in Kenya.',
  '{"capacity":"3014Wh","ac_output":"2000W (Surge 3000W)","chemistry":"LFP (LiFePO4)","solar_input":"2000W Max","voltage":"230V single-phase","grid_protection":"140V-280V","noise":"<=50dB","type":"All-in-One ESS"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-homestar-3.webp']::text[],
  111500, true, 10, true, 80, 'NEW',
  'Buy Bluetti Homestar 3 in Kenya — Price KES 111,500 | Batteriq',
  'Buy the Bluetti Homestar 3 in Kenya for KES 111,500. 2.0kW all-in-one residential backup with 3.01kWh storage. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-HV6K', 'Bluetti', 'Power Stations', 'Residential Backup',
  'Bluetti HV6K Inverter', 'bluetti-hv6k',
  'The Bluetti HV6K is a 6.2kW hybrid inverter for residential battery backup in Kenya. Pairs with HB500 5.12kWh battery modules and solar panels (6.5kW max PV), with sub-10ms backup switching.',
  '{"ac_output":"6.2kW","pv_input":"6.5kW Max","pv_range":"90-450Vdc","battery_voltage":"51.2V","max_current":"118A charge/discharge","chemistry":"LiFePO4 (HB500)","switching":"<10ms","compatible":"HB500 battery modules"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-hv6k.png']::text[],
  57500, true, 10, false, 81, 'NEW',
  'Buy Bluetti HV6K Inverter in Kenya — Price KES 57,500 | Batteriq',
  'Buy the Bluetti HV6K 6.2kW hybrid inverter in Kenya for KES 57,500. Residential backup inverter, pairs with HB500 batteries. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-HV10K', 'Bluetti', 'Power Stations', 'Residential Backup',
  'Bluetti HV10K Inverter', 'bluetti-hv10k',
  'The Bluetti HV10K is a 10kW hybrid inverter for whole-house battery backup in Kenya. Pairs with HB500 5.12kWh battery modules, accepts up to 14kW of solar, with sub-10ms backup switching.',
  '{"ac_output":"10kW","pv_input":"14kW Max","pv_range":"90-450Vdc","battery_voltage":"51.2V","max_current":"230A charge/discharge","chemistry":"LiFePO4 (HB500)","switching":"<10ms","compatible":"HB500 battery modules"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-hv10k.png']::text[],
  111500, true, 8, false, 82, 'NEW',
  'Buy Bluetti HV10K Inverter in Kenya — Price KES 111,500 | Batteriq',
  'Buy the Bluetti HV10K 10kW hybrid inverter in Kenya for KES 111,500. Whole-house backup inverter, pairs with HB500 batteries. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-HB500', 'Bluetti', 'Batteries', 'Residential Backup',
  'Bluetti HB500 Battery', 'bluetti-hb500',
  'The Bluetti HB500 is a 5.12kWh LiFePO4 battery module for HV6K and HV10K residential backup systems in Kenya. Rated for 6000+ cycles, expandable up to 64 units.',
  '{"capacity":"5.12kWh (51.2V 100Ah)","chemistry":"LiFePO4","compatible":"Bluetti HV6K, HV10K","max_parallel":"64 units","max_system":"327.68kWh","cycles":"6000+","max_discharge":"100A"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-hb500.png']::text[],
  116500, true, 10, false, 83, 'NEW',
  'Buy Bluetti HB500 Battery in Kenya — Price KES 116,500 | Batteriq',
  'Buy the Bluetti HB500 5.12kWh battery in Kenya for KES 116,500. Expansion battery for HV6K/HV10K systems. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-PV100', 'Bluetti', 'Solar Panels', NULL,
  'Bluetti PV100 Solar Panel 100W', 'bluetti-pv100',
  'The Bluetti PV100 is a 100W foldable monocrystalline solar panel for Bluetti power stations and residential backup systems in Kenya. Lightweight and portable with MC4 connector.',
  '{"power":"100W","type":"Monocrystalline","foldable":"Yes","connector":"MC4","compatible":"Bluetti power stations"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-pv120.jpg']::text[],
  16000, true, 15, false, 133, NULL,
  'Buy Bluetti PV100 Solar Panel 100W in Kenya — Price KES 16,000 | Batteriq',
  'Buy the Bluetti PV100 100W solar panel in Kenya for KES 16,000. Foldable monocrystalline, MC4 connector. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-BASE-B500', 'Bluetti', 'Accessories', 'Residential Backup',
  'Bluetti Base for B500 Battery', 'bluetti-base-b500',
  'The Bluetti Base is the mounting base accessory for the Bluetti B500 5kWh battery module. Genuine Bluetti accessory from the authorised dealer.',
  '{"compatible":"Bluetti B500 battery","type":"Mounting base"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-b500.jpg']::text[],
  11000, true, 10, false, 140, NULL,
  'Buy Bluetti Base for B500 Battery in Kenya — Price KES 11,000 | Batteriq',
  'Buy the Bluetti Base for B500 battery in Kenya for KES 11,000. Genuine mounting base accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-METER-EP760', 'Bluetti', 'Accessories', 'Residential Backup',
  'Bluetti Meter for EP760', 'bluetti-meter-ep760',
  'The Bluetti Meter is the energy meter accessory for the Bluetti EP760 residential backup system. Professional installation recommended. Genuine Bluetti accessory from the authorised dealer.',
  '{"compatible":"Bluetti EP760","type":"Energy meter"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-ep760.jpg']::text[],
  6600, true, 10, false, 141, NULL,
  'Buy Bluetti Meter for EP760 in Kenya — Price KES 6,600 | Batteriq',
  'Buy the Bluetti Meter for EP760 in Kenya for KES 6,600. Genuine energy meter accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-EMS-EP760', 'Bluetti', 'Accessories', 'Residential Backup',
  'Bluetti EMS for EP760', 'bluetti-ems-ep760',
  'The Bluetti EMS is the energy management accessory for the Bluetti EP760 residential backup system. Professional installation recommended. Genuine Bluetti accessory from the authorised dealer.',
  '{"compatible":"Bluetti EP760","type":"Energy management"}'::jsonb,
  ARRAY['/products/bluetti/bluetti-ep760.jpg']::text[],
  24000, true, 8, false, 142, NULL,
  'Buy Bluetti EMS for EP760 in Kenya — Price KES 24,000 | Batteriq',
  'Buy the Bluetti EMS for EP760 in Kenya for KES 24,000. Genuine energy management accessory. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
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
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order,
  discount_badge = EXCLUDED.discount_badge,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

-- ── Price sync for existing Residential Backup rows (same Sept 2026 list) ──
UPDATE products AS p
SET
  price_kes = v.price_kes,
  in_stock = v.in_stock,
  stock_qty = CASE WHEN v.in_stock THEN GREATEST(p.stock_qty, 1) ELSE 0 END
FROM (
  VALUES
    ('BLUETTI-AC300', 72500::numeric, true),
    ('BLUETTI-AC500', 89500::numeric, true),
    ('BLUETTI-B300K', 124500::numeric, false),
    ('BLUETTI-EP760', 119000::numeric, true),
    ('BLUETTI-B500', 145000::numeric, true)
) AS v(sku, price_kes, in_stock)
WHERE p.sku = v.sku;

-- B300K on this list is the 2764Wh battery and is out of stock
UPDATE products
SET specs = COALESCE(specs, '{}'::jsonb) || '{"capacity":"2764Wh"}'::jsonb
WHERE sku = 'BLUETTI-B300K';

-- Refresh baked-in KES prices in SEO text for the synced rows
UPDATE products
SET
  meta_title = regexp_replace(meta_title, 'KES [0-9,]+', 'KES ' || to_char(price_kes, 'FM999,999,999'), 'g'),
  meta_description = regexp_replace(meta_description, 'KES [0-9,]+', 'KES ' || to_char(price_kes, 'FM999,999,999'), 'g')
WHERE sku IN ('BLUETTI-AC300', 'BLUETTI-AC500', 'BLUETTI-B300K', 'BLUETTI-EP760', 'BLUETTI-B500');

COMMIT;

-- Verification: every row of the Sept 2026 list
SELECT sku, name, price_kes, in_stock, sort_order
FROM products
WHERE brand = 'Bluetti'
ORDER BY sort_order, name;
