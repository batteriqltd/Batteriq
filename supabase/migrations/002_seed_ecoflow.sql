-- ============================================================
-- BATTERIQ — EcoFlow Seed Data
-- Run AFTER 001_initial.sql
-- ============================================================

-- ============================================================
-- ECOFLOW POWER STATIONS
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  '5004501016', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA Pro', 'delta-pro',
  'The EcoFlow DELTA Pro is a high-capacity LFP power station delivering 3600W AC output with a massive 3600Wh capacity. Perfect for home backup power, off-grid living, and professional use in Kenya.',
  '{"ac_output":"3600W (surge 7200W)","capacity":"3600Wh","chemistry":"LFP","weight":"45kg","ports":13,"solar_input":"1600W max","charge_time_ac":"1.8 hours","ac_outlets":6,"usb_ports":6,"car_output":"12.6V/30A","dimensions":"63.5 x 28.3 x 42.4 cm"}',
  291399, true, 10, true, 1, 4.9, 48,
  'Buy EcoFlow DELTA Pro in Kenya — Price KES 291,399 | Batteriq',
  'Buy the EcoFlow DELTA Pro in Kenya for KES 291,399. 3600Wh LFP, 3600W AC output, 13 ports. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5013701013', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA Pro 3', 'delta-pro-3',
  'The EcoFlow DELTA Pro 3 is EcoFlow''s most powerful portable power station, featuring 4096Wh LFP capacity and 4000W AC output. Built for demanding home backup and professional applications.',
  '{"ac_output":"4000W (surge 8000W)","capacity":"4096Wh","chemistry":"LFP","weight":"51.5kg","ports":12,"solar_input":"2000W max","charge_time_ac":"1.5 hours","ac_outlets":5,"usb_ports":6}',
  461799, true, 5, true, 2, 4.9, 22,
  'Buy EcoFlow DELTA Pro 3 in Kenya — Price KES 461,799 | Batteriq',
  'Buy the EcoFlow DELTA Pro 3 in Kenya for KES 461,799. 4096Wh LFP, 4000W AC output. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5009701010', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA 2 Max', 'delta-2-max',
  'The EcoFlow DELTA 2 Max delivers 2048Wh of LFP capacity with 2400W AC output. Expandable up to 6144Wh with extra batteries. The ideal mid-range backup power solution in Kenya.',
  '{"ac_output":"2400W (surge 4800W)","capacity":"2048Wh","chemistry":"LFP","weight":"23kg","ports":13,"solar_input":"1000W max","charge_time_ac":"1.8 hours","expandable":"Yes, up to 6144Wh"}',
  157799, true, 15, true, 3, 4.8, 35,
  'Buy EcoFlow DELTA 2 Max in Kenya — Price KES 157,799 | Batteriq',
  'Buy the EcoFlow DELTA 2 Max in Kenya for KES 157,799. 2048Wh LFP, 2400W AC output, expandable. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5003601023', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA 2', 'delta-2',
  'The EcoFlow DELTA 2 is the perfect home backup power station. With 1024Wh LFP capacity and 1800W AC output, it powers essential appliances during outages. Fast M-Pesa checkout.',
  '{"ac_output":"1800W (surge 2700W)","capacity":"1024Wh","chemistry":"LFP","weight":"12kg","ports":13,"solar_input":"500W max","charge_time_ac":"1.8 hours","ac_outlets":4,"usb_ports":6}',
  85539, true, 25, true, 4, 4.8, 67,
  'Buy EcoFlow DELTA 2 in Kenya — Price KES 85,539 | Batteriq',
  'Buy the EcoFlow DELTA 2 in Kenya for KES 85,539. 1024Wh LFP, 1800W AC output, 13 ports. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5016301007', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA 3', 'delta-3',
  'The EcoFlow DELTA 3 brings next-generation LFP technology to the 1024Wh class. With 1800W output, UPS functionality, and 3600W surge capacity, it handles virtually any appliance.',
  '{"ac_output":"1800W (surge 3600W)","capacity":"1024Wh","chemistry":"LFP","weight":"12.5kg","ports":13,"solar_input":"500W max","ups_function":"Yes","charge_time_ac":"1.4 hours"}',
  97199, true, 20, true, 5, 4.9, 18,
  'Buy EcoFlow DELTA 3 in Kenya — Price KES 97,199 | Batteriq',
  'Buy the EcoFlow DELTA 3 in Kenya for KES 97,199. 1024Wh LFP, 1800W AC output, UPS function. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5016201005', 'EcoFlow', 'Power Stations', 'EcoFlow DELTA 3 Plus', 'delta-3-plus',
  'The EcoFlow DELTA 3 Plus takes the DELTA 3 further with enhanced capacity, faster charging, and superior power management. The benchmark mid-range power station in Kenya.',
  '{"ac_output":"1800W (surge 3600W)","capacity":"1024Wh","chemistry":"LFP","weight":"12.5kg","ports":13,"solar_input":"500W max","ups_function":"Yes","charge_time_ac":"1.3 hours"}',
  109399, true, 18, true, 6, 4.9, 14,
  'Buy EcoFlow DELTA 3 Plus in Kenya — Price KES 109,399 | Batteriq',
  'Buy the EcoFlow DELTA 3 Plus in Kenya for KES 109,399. 1024Wh LFP, 1800W AC, UPS, upgraded. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5025101001', 'EcoFlow', 'Power Stations', 'EcoFlow EFE2000', 'efe2000',
  'The EcoFlow EFE2000 provides 2000Wh of reliable LFP power with 2000W AC output. Designed for demanding environments and extended off-grid use across Kenya.',
  '{"ac_output":"2000W","capacity":"2000Wh","chemistry":"LFP","solar_input":"800W max"}',
  149999, true, 8, false, 7, 4.7, 9,
  'Buy EcoFlow EFE2000 in Kenya — Price KES 149,999 | Batteriq',
  'Buy the EcoFlow EFE2000 in Kenya for KES 149,999. 2000Wh LFP, 2000W AC output. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5005301008', 'EcoFlow', 'Power Stations', 'EcoFlow RIVER 2', 'river-2',
  'The EcoFlow RIVER 2 is the most affordable EcoFlow power station in Kenya. Weighing just 3.5kg with 256Wh capacity and 300W AC output, it''s perfect for camping, travel, and emergency backup.',
  '{"ac_output":"300W (surge 600W)","capacity":"256Wh","chemistry":"LFP","weight":"3.5kg","ports":5,"solar_input":"110W max","charge_time_ac":"1 hour","usb_ports":3}',
  27259, true, 40, false, 8, 4.7, 92,
  'Buy EcoFlow RIVER 2 in Kenya — Price KES 27,259 | Batteriq',
  'Buy the EcoFlow RIVER 2 in Kenya for KES 27,259. 256Wh LFP, 300W AC output, 3.5kg. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5005401025', 'EcoFlow', 'Power Stations', 'EcoFlow RIVER 2 Max', 'river-2-max',
  'The EcoFlow RIVER 2 Max doubles the capacity of the RIVER 2 with 512Wh and 500W output. The perfect portable power companion for camping and small home backup needs in Kenya.',
  '{"ac_output":"500W (surge 1000W)","capacity":"512Wh","chemistry":"LFP","weight":"6.1kg","ports":9,"solar_input":"220W max","charge_time_ac":"1.5 hours"}',
  41499, true, 30, false, 9, 4.8, 54,
  'Buy EcoFlow RIVER 2 Max in Kenya — Price KES 41,499 | Batteriq',
  'Buy the EcoFlow RIVER 2 Max in Kenya for KES 41,499. 512Wh LFP, 500W AC output. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5005501028', 'EcoFlow', 'Power Stations', 'EcoFlow RIVER 2 Pro', 'river-2-pro',
  'The EcoFlow RIVER 2 Pro is the most capable RIVER series power station with 768Wh capacity and 800W AC output. Supports X-Boost technology for powering high-wattage devices.',
  '{"ac_output":"800W (surge 1600W)","capacity":"768Wh","chemistry":"LFP","weight":"7.8kg","ports":10,"solar_input":"220W max","charge_time_ac":"1.7 hours","x_boost":"Yes"}',
  59049, true, 22, false, 10, 4.8, 41,
  'Buy EcoFlow RIVER 2 Pro in Kenya — Price KES 59,049 | Batteriq',
  'Buy the EcoFlow RIVER 2 Pro in Kenya for KES 59,049. 768Wh LFP, 800W AC, X-Boost. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5015001024', 'EcoFlow', 'Power Stations', 'EcoFlow RIVER 3', 'river-3',
  'The next-generation EcoFlow RIVER 3 features 245Wh capacity, ultra-fast 10ms UPS switching, and 300W AC output. The most reliable portable power station for sensitive electronics.',
  '{"ac_output":"300W (surge 600W)","capacity":"245Wh","chemistry":"LFP","weight":"3.7kg","ports":5,"ups_switch_time":"10ms","solar_input":"110W max"}',
  31999, true, 35, false, 11, 4.9, 16,
  'Buy EcoFlow RIVER 3 in Kenya — Price KES 31,999 | Batteriq',
  'Buy the EcoFlow RIVER 3 in Kenya for KES 31,999. 245Wh, 300W AC, 10ms UPS. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  '5015601028', 'EcoFlow', 'Power Stations', 'EcoFlow RIVER 3 Plus', 'river-3-plus',
  'The EcoFlow RIVER 3 Plus delivers 286Wh capacity with 600W AC output and sub-10ms UPS switching. Expandable with extra batteries for extended power on the go.',
  '{"ac_output":"600W (surge 1200W)","capacity":"286Wh","chemistry":"LFP","weight":"4.2kg","ports":7,"ups_switch_time":"<10ms","expandable":"Yes"}',
  40599, true, 28, false, 12, 4.9, 11,
  'Buy EcoFlow RIVER 3 Plus in Kenya — Price KES 40,599 | Batteriq',
  'Buy the EcoFlow RIVER 3 Plus in Kenya for KES 40,599. 286Wh, 600W AC, <10ms UPS, expandable. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5020001004', 'EcoFlow', 'Power Stations', 'EcoFlow E980', 'e980',
  'The EcoFlow E980 offers 1000Wh of reliable power with 1000W AC output, optimised for small business and home office backup in Kenya.',
  '{"ac_output":"1000W","capacity":"1000Wh","ports":8,"solar_input":"400W max"}',
  63799, true, 12, false, 13, 4.7, 8,
  'Buy EcoFlow E980 in Kenya — Price KES 63,799 | Batteriq',
  'Buy the EcoFlow E980 in Kenya for KES 63,799. 1000Wh, 1000W AC output, 8 ports. Authorised EcoFlow dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
);

-- ============================================================
-- ECOFLOW SOLAR PANELS
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  '5018201001', 'EcoFlow', 'Solar Panels', 'EcoFlow Solar Panel 45W', 'solar-panel-45w',
  'Lightweight 45W monocrystalline solar panel with 25% efficiency. Ideal for charging RIVER series power stations on the go. IP65 waterproof rating.',
  '{"power":"45W","efficiency":"25%","weight":"1.4kg","ip_rating":"IP65","type":"Monocrystalline","connector":"XT60"}',
  7599, true, 50, false, 20,  4.7, 21,
  'Buy EcoFlow Solar Panel 45W in Kenya — Price KES 7,599 | Batteriq',
  'Buy the EcoFlow Solar Panel 45W in Kenya for KES 7,599. 25% efficiency, IP65, 1.4kg. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5018101001', 'EcoFlow', 'Solar Panels', 'EcoFlow Portable Solar Panel 60W', 'solar-panel-60w',
  'The EcoFlow 60W portable solar panel folds flat for easy transport. IP68 waterproof, 21-22% efficiency. Compatible with all EcoFlow power stations.',
  '{"power":"60W","efficiency":"21-22%","weight":"2kg","ip_rating":"IP68","foldable":"Yes","connector":"XT60"}',
  9699, true, 45, false, 21, 4.8, 18,
  'Buy EcoFlow Portable Solar Panel 60W in Kenya — Price KES 9,699 | Batteriq',
  'Buy the EcoFlow 60W Portable Solar Panel in Kenya for KES 9,699. IP68, 21-22% efficiency, foldable. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5005901004', 'EcoFlow', 'Solar Panels', 'EcoFlow Portable Solar Panel 110W', 'solar-panel-110w',
  'The EcoFlow 110W portable solar panel delivers serious solar charging for DELTA and RIVER series. IP68 rated with 22.8% cell efficiency.',
  '{"power":"110W","efficiency":"22.8%","weight":"4kg","ip_rating":"IP68","foldable":"Yes","connector":"XT60"}',
  16399, true, 40, true, 22, 4.8, 44,
  'Buy EcoFlow Portable Solar Panel 110W in Kenya — Price KES 16,399 | Batteriq',
  'Buy the EcoFlow 110W Portable Solar Panel in Kenya for KES 16,399. 22.8% efficiency, IP68. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5006401005', 'EcoFlow', 'Solar Panels', 'EcoFlow Portable Solar Panel 160W', 'solar-panel-160w',
  'The EcoFlow 160W portable solar panel offers high-output charging for DELTA series power stations. Foldable, lightweight, and IP68 waterproof for all weather use in Kenya.',
  '{"power":"160W","efficiency":"21-22%","weight":"5.6kg","ip_rating":"IP68","foldable":"Yes","connector":"XT60"}',
  20999, true, 30, false, 23, 4.8, 29,
  'Buy EcoFlow Portable Solar Panel 160W in Kenya — Price KES 20,999 | Batteriq',
  'Buy the EcoFlow 160W Portable Solar Panel in Kenya for KES 20,999. 160W, IP68, foldable. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5006501003', 'EcoFlow', 'Solar Panels', 'EcoFlow Portable Solar Panel 220W', 'solar-panel-220w',
  'The EcoFlow 220W bifacial portable solar panel generates power from both sides for up to 25% more energy. Perfect for DELTA Pro and large setups in Kenya.',
  '{"power":"220W Bifacial","efficiency":"22-23%","weight":"9.5kg","ip_rating":"IP68","foldable":"Yes","bifacial":"Yes"}',
  31399, true, 20, true, 24, 4.9, 17,
  'Buy EcoFlow Portable Solar Panel 220W in Kenya — Price KES 31,399 | Batteriq',
  'Buy the EcoFlow 220W Bifacial Portable Solar Panel in Kenya for KES 31,399. Bifacial, IP68. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5006701010', 'EcoFlow', 'Solar Panels', 'EcoFlow Portable Solar Panel 400W', 'solar-panel-400w',
  'EcoFlow''s most powerful portable solar panel at 400W. IP68 rated with 22.6% efficiency, designed for DELTA Pro, DELTA Pro 3, and PowerKit installations.',
  '{"power":"400W","efficiency":"22.6%","weight":"16kg","ip_rating":"IP68","foldable":"Yes","connector":"MC4"}',
  67399, true, 15, false, 25, 4.9, 12,
  'Buy EcoFlow Portable Solar Panel 400W in Kenya — Price KES 67,399 | Batteriq',
  'Buy the EcoFlow 400W Portable Solar Panel in Kenya for KES 67,399. 400W, 22.6% efficiency, IP68. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5020701004', 'EcoFlow', 'Solar Panels', 'EcoFlow Rigid Solar Panel 125W x2', 'rigid-solar-panel-125w-x2',
  'Two 125W rigid monocrystalline solar panels with 23% efficiency for permanent rooftop or ground-mount installations. Ideal for EcoFlow PowerKit systems.',
  '{"power":"125W x2","efficiency":"23%","weight":"6.2kg each","type":"Rigid Monocrystalline","quantity":2}',
  41399, true, 10, false, 26, 4.8, 8,
  'Buy EcoFlow Rigid Solar Panel 125W x2 in Kenya — Price KES 41,399 | Batteriq',
  'Buy EcoFlow Rigid Solar Panel 125W x2 in Kenya for KES 41,399. 23% efficiency, permanent mount. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5006001001', 'EcoFlow', 'Solar Panels', 'EcoFlow Flexible Solar Panel 100W', 'flexible-solar-panel-100w',
  'Ultra-thin flexible 100W solar panel with 23% efficiency. Ideal for curved surfaces on RVs, boats, and custom solar installations in Kenya.',
  '{"power":"100W","efficiency":"23%","weight":"2.3kg","type":"Flexible","bendable":"Up to 30 degrees","ip_rating":"IP67"}',
  13199, true, 18, false, 27, 4.7, 14,
  'Buy EcoFlow Flexible Solar Panel 100W in Kenya — Price KES 13,199 | Batteriq',
  'Buy the EcoFlow 100W Flexible Solar Panel in Kenya for KES 13,199. 23% efficiency, bendable. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
);

-- ============================================================
-- ECOFLOW EXTRA BATTERIES
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  '5015601060', 'EcoFlow', 'Batteries', 'EcoFlow EB300 Extra Battery (RIVER 3)', 'eb300-extra-battery-river-3',
  'Expand your EcoFlow RIVER 3 capacity with the EB300 extra battery. Adds 288Wh of LFP storage, more than doubling your RIVER 3''s runtime.',
  '{"capacity":"288Wh","compatible_with":"EcoFlow RIVER 3","chemistry":"LFP"}',
  27899, true, 20, false, 40, 4.8, 7,
  'Buy EcoFlow EB300 Extra Battery in Kenya — Price KES 27,899 | Batteriq',
  'Buy the EcoFlow EB300 Extra Battery in Kenya for KES 27,899. 288Wh LFP, for RIVER 3. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5015601063', 'EcoFlow', 'Batteries', 'EcoFlow EB600 Extra Battery (RIVER 3 Plus)', 'eb600-extra-battery-river-3-plus',
  'Double the capacity of your EcoFlow RIVER 3 Plus with the EB600 extra battery. Adds 614Wh of LFP storage for extended backup power.',
  '{"capacity":"614Wh","compatible_with":"EcoFlow RIVER 3 Plus","chemistry":"LFP"}',
  44699, true, 15, false, 41, 4.8, 6,
  'Buy EcoFlow EB600 Extra Battery in Kenya — Price KES 44,699 | Batteriq',
  'Buy the EcoFlow EB600 Extra Battery in Kenya for KES 44,699. 614Wh LFP, for RIVER 3 Plus. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5003601001', 'EcoFlow', 'Batteries', 'EcoFlow Extra Battery for DELTA 2', 'delta-2-extra-battery',
  'Expand your EcoFlow DELTA 2 from 1024Wh to 2048Wh with this plug-and-play extra battery. LFP chemistry for long cycle life.',
  '{"capacity":"1024Wh","compatible_with":"EcoFlow DELTA 2","chemistry":"LFP","total_with_station":"2048Wh"}',
  74399, true, 12, false, 42, 4.8, 11,
  'Buy EcoFlow Extra Battery for DELTA 2 in Kenya — Price KES 74,399 | Batteriq',
  'Buy the EcoFlow DELTA 2 Extra Battery in Kenya for KES 74,399. 1024Wh LFP, plug-and-play. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5003301012', 'EcoFlow', 'Batteries', 'EcoFlow Extra Battery for DELTA Max', 'delta-max-extra-battery',
  'Expand your EcoFlow DELTA Max to 4096Wh with this compatible extra battery. Seamless integration with the DELTA Max ecosystem.',
  '{"capacity":"2016Wh","compatible_with":"EcoFlow DELTA Max","chemistry":"NMC","total_with_station":"4032Wh"}',
  101699, true, 8, false, 43, 4.7, 9,
  'Buy EcoFlow Extra Battery for DELTA Max in Kenya — Price KES 101,699 | Batteriq',
  'Buy the EcoFlow DELTA Max Extra Battery in Kenya for KES 101,699. 2016Wh, expands to 4032Wh. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5009701008', 'EcoFlow', 'Batteries', 'EcoFlow Extra Battery for DELTA 2 Max 2048Wh', 'delta-2-max-extra-battery-2048wh',
  'Expand your EcoFlow DELTA 2 Max to 4096Wh with this 2048Wh LFP extra battery. Supports further expansion for off-grid power independence.',
  '{"capacity":"2048Wh","compatible_with":"EcoFlow DELTA 2 Max","chemistry":"LFP","total_with_station":"4096Wh"}',
  110899, true, 10, false, 44, 4.9, 13,
  'Buy EcoFlow DELTA 2 Max Extra Battery 2048Wh in Kenya — Price KES 110,899 | Batteriq',
  'Buy the EcoFlow DELTA 2 Max Extra Battery in Kenya for KES 110,899. 2048Wh LFP. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5004501002', 'EcoFlow', 'Batteries', 'EcoFlow Extra Battery for DELTA Pro', 'delta-pro-extra-battery',
  'Expand your EcoFlow DELTA Pro capacity to 7200Wh with up to two extra batteries. Essential for whole-home backup power and off-grid systems.',
  '{"capacity":"3600Wh","compatible_with":"EcoFlow DELTA Pro","chemistry":"LFP","total_with_station":"7200Wh","max_expansion":"10800Wh with 2x"}',
  236599, true, 6, false, 45, 4.9, 19,
  'Buy EcoFlow DELTA Pro Extra Battery in Kenya — Price KES 236,599 | Batteriq',
  'Buy the EcoFlow DELTA Pro Extra Battery in Kenya for KES 236,599. 3600Wh LFP, expands to 7200Wh+. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5013701002', 'EcoFlow', 'Batteries', 'EcoFlow DELTA 3 Plus Smart Extra Battery', 'delta-3-plus-smart-extra-battery',
  'The smart extra battery for EcoFlow DELTA 3 Plus integrates active battery management for optimal charging cycles and longevity.',
  '{"capacity":"1024Wh","compatible_with":"EcoFlow DELTA 3 Plus","chemistry":"LFP","smart":"Yes, active BMS"}',
  60799, true, 14, false, 46, 4.9, 6,
  'Buy EcoFlow DELTA 3 Plus Smart Extra Battery in Kenya — Price KES 60,799 | Batteriq',
  'Buy the EcoFlow DELTA 3 Plus Smart Extra Battery in Kenya for KES 60,799. 1024Wh LFP, smart BMS. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5018501003', 'EcoFlow', 'Batteries', 'EcoFlow LiFePO4 Battery', 'lifepo4-battery',
  'Universal EcoFlow LiFePO4 battery module for compatible EcoFlow systems. LFP chemistry delivers 3500+ lifecycle counts for years of reliable service.',
  '{"capacity":"768Wh","chemistry":"LFP","cycles":"3500+","self_discharge":"Low"}',
  32999, true, 10, false, 47, 4.7, 5,
  'Buy EcoFlow LiFePO4 Battery in Kenya — Price KES 32,999 | Batteriq',
  'Buy the EcoFlow LiFePO4 Battery in Kenya for KES 32,999. 768Wh, 3500+ cycles. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
);

-- ============================================================
-- ECOFLOW ACCESSORIES
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  '5015501001', 'EcoFlow', 'Accessories', 'EcoFlow Alternator Charger 800W', 'alternator-charger-800w',
  'Charge your EcoFlow power station from your vehicle alternator while driving. 800W output fills most EcoFlow stations in 2-3 hours of driving.',
  '{"output":"800W","compatible_with":"EcoFlow DELTA series","install":"DIY"}',
  36999, true, 12, false, 60, 4.7, 8,
  'Buy EcoFlow Alternator Charger 800W in Kenya — Price KES 36,999 | Batteriq',
  'Buy the EcoFlow Alternator Charger 800W in Kenya for KES 36,999. Charge while driving. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5011401005', 'EcoFlow', 'Accessories', 'EcoFlow PowerStream Micro Inverter 800W', 'powerstream-micro-inverter-800w',
  'The EcoFlow PowerStream micro inverter connects your EcoFlow power station to your home solar array. Feed excess power back to your home grid intelligently.',
  '{"power":"800W","compatible_with":"EcoFlow DELTA Pro, DELTA Max","smart":"Yes, app-controlled","solar_input":"200-2000W"}',
  41899, true, 8, false, 61, 4.8, 11,
  'Buy EcoFlow PowerStream Micro Inverter 800W in Kenya — Price KES 41,899 | Batteriq',
  'Buy the EcoFlow PowerStream Micro Inverter 800W in Kenya for KES 41,899. Smart home solar integration. Authorised EcoFlow dealer. M-Pesa payment. Batteriq.'
),
(
  '5011401003', 'EcoFlow', 'Accessories', 'EcoFlow PowerStream Smart Plug (UK)', 'powerstream-smart-plug-uk',
  'Monitor and control individual appliance power consumption with the EcoFlow Smart Plug. UK socket compatible, works with EcoFlow app.',
  '{"socket":"UK Type G","max_power":"2300W","app_control":"Yes","monitoring":"Real-time wattage"}',
  5899, true, 30, false, 62, 4.6, 14,
  'Buy EcoFlow PowerStream Smart Plug in Kenya — Price KES 5,899 | Batteriq',
  'Buy the EcoFlow PowerStream Smart Plug (UK) in Kenya for KES 5,899. App-controlled, 2300W. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5016801021', 'EcoFlow', 'Accessories', 'EcoFlow RAPID Magnetic Power Bank 10000mAh', 'rapid-power-bank-10000mah',
  'The EcoFlow RAPID Magnetic Power Bank with 10000mAh capacity. MagSafe-compatible wireless charging, USB-C 27W fast charge.',
  '{"capacity":"10000mAh","wireless":"MagSafe compatible","usbc_output":"27W","weight":"220g"}',
  11039, true, 25, false, 63, 4.7, 22,
  'Buy EcoFlow RAPID Magnetic Power Bank 10000mAh in Kenya — Price KES 11,039 | Batteriq',
  'Buy the EcoFlow RAPID 10000mAh Magnetic Power Bank in Kenya for KES 11,039. MagSafe, 27W. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5016801014', 'EcoFlow', 'Accessories', 'EcoFlow RAPID Magnetic Power Bank 5000mAh', 'rapid-power-bank-5000mah',
  'Slim 5000mAh magnetic power bank with MagSafe wireless charging. Perfect everyday carry for iPhone users in Kenya.',
  '{"capacity":"5000mAh","wireless":"MagSafe compatible","usbc_output":"20W","weight":"130g","slim":"Yes"}',
  7499, true, 30, false, 64, 4.7, 19,
  'Buy EcoFlow RAPID Magnetic Power Bank 5000mAh in Kenya — Price KES 7,499 | Batteriq',
  'Buy the EcoFlow RAPID 5000mAh Magnetic Power Bank in Kenya for KES 7,499. MagSafe, slim. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5020601001', 'EcoFlow', 'Accessories', 'EcoFlow Solar Panel Hat L', 'solar-panel-hat-l',
  'Innovative solar panel hat in size L that charges your devices while keeping you shaded. Built-in USB charging port, 3W solar panel.',
  '{"size":"L","solar_panel":"3W","usb_output":"Yes","uv_protection":"Yes"}',
  10699, true, 15, false, 65, 4.5, 7,
  'Buy EcoFlow Solar Panel Hat L in Kenya — Price KES 10,699 | Batteriq',
  'Buy the EcoFlow Solar Panel Hat (L) in Kenya for KES 10,699. 3W solar, USB charging. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5020601002', 'EcoFlow', 'Accessories', 'EcoFlow Solar Panel Hat XL', 'solar-panel-hat-xl',
  'Extra large solar panel hat with built-in 3W solar panel and USB charging. Ideal for outdoor activities and Kenya''s sunny climate.',
  '{"size":"XL","solar_panel":"3W","usb_output":"Yes","uv_protection":"Yes"}',
  10699, true, 15, false, 66, 4.5, 5,
  'Buy EcoFlow Solar Panel Hat XL in Kenya — Price KES 10,699 | Batteriq',
  'Buy the EcoFlow Solar Panel Hat (XL) in Kenya for KES 10,699. 3W solar, USB charging. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5008004057', 'EcoFlow', 'Accessories', 'EcoFlow MC4 to XT60 Solar Cable 3.5M', 'mc4-to-xt60-solar-cable',
  'Connect third-party MC4 solar panels to your EcoFlow power station with this 3.5M cable. Essential for expanding your solar setup.',
  '{"length":"3.5M","connector_a":"MC4","connector_b":"XT60","compatible":"All EcoFlow with XT60 solar input"}',
  3799, true, 50, false, 67, 4.7, 31,
  'Buy EcoFlow MC4 to XT60 Solar Cable 3.5M in Kenya — Price KES 3,799 | Batteriq',
  'Buy the EcoFlow MC4 to XT60 Solar Cable 3.5M in Kenya for KES 3,799. Connect MC4 panels to EcoFlow. Authorised dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '6001020001', 'EcoFlow', 'Accessories', 'EcoFlow Camp Torches', 'camp-torches',
  'EcoFlow Camp Torches power via your EcoFlow station''s DC output. Long-lasting, bright illumination for camping and emergency use.',
  '{"power_source":"EcoFlow DC output","brightness":"High/Low modes","use":"Camp and emergency lighting"}',
  4199, true, 25, false, 68, 4.6, 12,
  'Buy EcoFlow Camp Torches in Kenya — Price KES 4,199 | Batteriq',
  'Buy EcoFlow Camp Torches in Kenya for KES 4,199. Powered by EcoFlow DC. Authorised EcoFlow dealer. Instant M-Pesa payment. Nairobi delivery. Batteriq.'
);

-- ============================================================
-- ECOFLOW POWERKITS
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  'PKIT-5KWH', 'EcoFlow', 'Solar Home Systems', 'EcoFlow 5kWh PowerKit', 'powerkit-5kwh',
  'The EcoFlow 5kWh PowerKit is a complete modular home energy system for Kenya. Includes 5kWh LFP storage, smart inverter, and distribution board. Perfect for whole-home backup and solar-first living.',
  '{"capacity":"5kWh","chemistry":"LFP","inverter":"Included","distribution_board":"Included","solar_compatible":"Yes, up to 6600W","scalable":"Yes, add extra batteries"}',
  759999, true, 3, true, 50, 4.9, 7,
  'Buy EcoFlow 5kWh PowerKit in Kenya — Price KES 759,999 | Batteriq',
  'Buy the EcoFlow 5kWh PowerKit in Kenya for KES 759,999. Complete home energy system, LFP, solar-ready. Authorised EcoFlow dealer. M-Pesa payment. Batteriq.'
),
(
  'PKIT-10KWH', 'EcoFlow', 'Solar Home Systems', 'EcoFlow 10kWh PowerKit', 'powerkit-10kwh',
  'The EcoFlow 10kWh PowerKit delivers serious whole-home backup for Kenyan homes and small businesses. Scalable, modular, and solar-ready with intelligent power management.',
  '{"capacity":"10kWh","chemistry":"LFP","inverter":"Included","distribution_board":"Included","solar_compatible":"Yes, up to 6600W","scalable":"Yes"}',
  1049999, true, 2, true, 51, 4.9, 5,
  'Buy EcoFlow 10kWh PowerKit in Kenya — Price KES 1,049,999 | Batteriq',
  'Buy the EcoFlow 10kWh PowerKit in Kenya for KES 1,049,999. 10kWh whole-home backup, solar-ready. Authorised EcoFlow dealer. M-Pesa payment. Batteriq.'
),
(
  'PKIT-15KWH', 'EcoFlow', 'Solar Home Systems', 'EcoFlow 15kWh PowerKit', 'powerkit-15kwh',
  'The EcoFlow 15kWh PowerKit is Kenya''s most comprehensive home energy system. Powers entire homes and small businesses with days of autonomy. Contact us for custom installation.',
  '{"capacity":"15kWh","chemistry":"LFP","inverter":"Included","distribution_board":"Included","solar_compatible":"Yes, up to 6600W","scalable":"Yes","recommended_for":"Large homes, small businesses"}',
  1399999, true, 2, true, 52, 5.0, 4,
  'Buy EcoFlow 15kWh PowerKit in Kenya — Price KES 1,399,999 | Batteriq',
  'Buy the EcoFlow 15kWh PowerKit in Kenya for KES 1,399,999. Complete 15kWh home energy system. Authorised EcoFlow dealer. M-Pesa payment. Batteriq.'
);

-- ============================================================
-- ECOFLOW APPLIANCES
-- ============================================================
INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  '5009001005', 'EcoFlow', 'Appliances', 'EcoFlow GLACIER Portable Fridge Freezer', 'glacier-portable-fridge-freezer',
  'The EcoFlow GLACIER is a portable fridge-freezer that runs efficiently on EcoFlow power stations. Dual zone: one fridge, one freezer. Ideal for Kenyan camping, overlanding, and home use during power cuts.',
  '{"capacity":"38L total (two zones)","temperature_range":"-25°C to 10°C","compressor":"Variable speed","power_consumption":"35W avg","solar_compatible":"Yes","app_control":"Yes","weight":"17.5kg"}',
  149469, true, 8, true, 70, 4.8, 16,
  'Buy EcoFlow GLACIER Portable Fridge Freezer in Kenya — Price KES 149,469 | Batteriq',
  'Buy the EcoFlow GLACIER Portable Fridge Freezer in Kenya for KES 149,469. 38L dual-zone, solar-compatible. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  '5010201023', 'EcoFlow', 'Appliances', 'EcoFlow WAVE 2 Smart Portable Air Conditioner', 'wave-2-portable-air-conditioner',
  'The EcoFlow WAVE 2 is the world''s most portable air conditioner designed for use with EcoFlow power stations. Heat and cool anywhere in Kenya — perfect for outdoor events, camping, and backup home cooling.',
  '{"cooling_capacity":"5100 BTU (1.5kW)","heating_capacity":"6100 BTU (1.8kW)","power_consumption":"1.1kW cooling mode","weight":"10.4kg","noise":"52dB","smart":"Yes, app + voice control","solar_compatible":"Yes"}',
  149469, true, 6, true, 71, 4.8, 13,
  'Buy EcoFlow WAVE 2 Portable Air Conditioner in Kenya — Price KES 149,469 | Batteriq',
  'Buy the EcoFlow WAVE 2 Portable Air Conditioner in Kenya for KES 149,469. 5100 BTU, solar-ready. Authorised EcoFlow dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
);
