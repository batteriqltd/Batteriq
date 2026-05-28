-- ============================================================
-- BATTERIQ — Bluetti Seed Data
-- Run AFTER 002_seed_ecoflow.sql
-- ============================================================

INSERT INTO products (sku, brand, category, name, slug, description, specs, price_kes, in_stock, stock_qty, featured, sort_order, schema_rating, schema_review_count, meta_title, meta_description) VALUES
(
  'BLUETTI-AC2P', 'Bluetti', 'Power Stations', 'Bluetti AC2P', 'bluetti-ac2p',
  'The Bluetti AC2P is an ultra-compact and affordable power station. Lightweight and portable, perfect for phone charging, small appliances, and emergency use in Kenya.',
  '{"ac_output":"300W","capacity":"204Wh","chemistry":"LFP","weight":"2.7kg"}',
  18499, true, 20, false, 100, 4.6, 14,
  'Buy Bluetti AC2P in Kenya — Price KES 18,499 | Batteriq',
  'Buy the Bluetti AC2P in Kenya for KES 18,499. 204Wh, 300W AC output. Authorised Bluetti dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC50P', 'Bluetti', 'Power Stations', 'Bluetti AC50P', 'bluetti-ac50p',
  'The Bluetti AC50P delivers 500W AC output with 403Wh capacity. A versatile mid-range portable power station for outdoor use and home backup in Kenya.',
  '{"ac_output":"500W","capacity":"403Wh","chemistry":"LFP","weight":"5.4kg"}',
  31499, true, 18, false, 101, 4.6, 19,
  'Buy Bluetti AC50P in Kenya — Price KES 31,499 | Batteriq',
  'Buy the Bluetti AC50P in Kenya for KES 31,499. 403Wh, 500W AC output. Authorised Bluetti dealer. Instant M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC70P', 'Bluetti', 'Power Stations', 'Bluetti AC70P', 'bluetti-ac70p',
  'The Bluetti AC70P offers 768Wh LFP capacity with 1000W AC output. An excellent choice for camping, overlanding, and power backup in Kenya.',
  '{"ac_output":"1000W","capacity":"768Wh","chemistry":"LFP","weight":"10.2kg","solar_input":"200W max"}',
  52999, true, 15, false, 102, 4.7, 22,
  'Buy Bluetti AC70P in Kenya — Price KES 52,999 | Batteriq',
  'Buy the Bluetti AC70P in Kenya for KES 52,999. 768Wh LFP, 1000W AC output. Authorised Bluetti dealer. M-Pesa payment. Fast Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-EB3A', 'Bluetti', 'Power Stations', 'Bluetti EB3A', 'bluetti-eb3a',
  'The Bluetti EB3A is one of the most compact and fast-charging power stations available in Kenya. 268Wh with 600W AC output and 430W AC fast charging.',
  '{"ac_output":"600W (X-Boost 1200W)","capacity":"268Wh","chemistry":"LFP","weight":"4.6kg","fast_charge":"430W AC"}',
  24999, true, 25, false, 103, 4.7, 38,
  'Buy Bluetti EB3A in Kenya — Price KES 24,999 | Batteriq',
  'Buy the Bluetti EB3A in Kenya for KES 24,999. 268Wh LFP, 600W AC, 430W fast charging. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC180P', 'Bluetti', 'Power Stations', 'Bluetti AC180P', 'bluetti-ac180p',
  'The Bluetti AC180P delivers 1440Wh LFP capacity with 1800W AC output. Ultra-fast 1440W turbo charging gets it from 0-80% in 45 minutes. The benchmark home backup power station in Kenya.',
  '{"ac_output":"1800W (surge 2700W)","capacity":"1440Wh","chemistry":"LFP","weight":"17.5kg","turbo_charge":"1440W, 0-80% in 45 min","solar_input":"500W max"}',
  71499, true, 12, true, 104, 4.8, 41,
  'Buy Bluetti AC180P in Kenya — Price KES 71,499 | Batteriq',
  'Buy the Bluetti AC180P in Kenya for KES 71,499. 1440Wh LFP, 1800W AC, turbo charging. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC200PL', 'Bluetti', 'Power Stations', 'Bluetti AC200PL', 'bluetti-ac200pl',
  'The Bluetti AC200PL is a powerhouse with 2048Wh LFP capacity and 2400W AC output. Expandable to 8192Wh with up to four B300S batteries. The go-to solution for whole-home backup in Kenya.',
  '{"ac_output":"2400W (surge 3600W)","capacity":"2048Wh","chemistry":"LFP","weight":"28kg","expandable":"Up to 8192Wh with B300S","solar_input":"1200W max","ac_outlets":6}',
  115499, true, 8, true, 105, 4.9, 27,
  'Buy Bluetti AC200PL in Kenya — Price KES 115,499 | Batteriq',
  'Buy the Bluetti AC200PL in Kenya for KES 115,499. 2048Wh LFP, 2400W AC, expandable. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC300', 'Bluetti', 'Power Stations', 'Bluetti AC300', 'bluetti-ac300',
  'The Bluetti AC300 is a modular inverter unit that pairs with Bluetti B300 batteries for scalable home energy storage. 3000W AC output, no built-in battery — pure modular power.',
  '{"ac_output":"3000W (surge 6000W)","chemistry":"N/A (requires B300 battery)","weight":"22.8kg","solar_input":"2400W max","modular":"Yes, pairs with B300/B300S"}',
  68499, true, 6, false, 106, 4.8, 15,
  'Buy Bluetti AC300 in Kenya — Price KES 68,499 | Batteriq',
  'Buy the Bluetti AC300 in Kenya for KES 68,499. 3000W AC, modular, pairs with B300 battery. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-AC500', 'Bluetti', 'Power Stations', 'Bluetti AC500', 'bluetti-ac500',
  'The Bluetti AC500 is a high-capacity modular home energy system. 5000W AC output pairs with B300S batteries for up to 18,432Wh total storage. Enterprise-grade power for Kenyan homes and businesses.',
  '{"ac_output":"5000W (surge 10000W)","weight":"30.5kg","solar_input":"3000W max","modular":"Yes, pairs with B300S","max_capacity":"18432Wh with 6x B300S"}',
  84499, true, 4, false, 107, 4.9, 9,
  'Buy Bluetti AC500 in Kenya — Price KES 84,499 | Batteriq',
  'Buy the Bluetti AC500 in Kenya for KES 84,499. 5000W AC, expandable to 18kWh. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-B300S', 'Bluetti', 'Batteries', 'Bluetti B300S Extra Battery', 'bluetti-b300s',
  'The Bluetti B300S is a 3072Wh LFP expansion battery for AC300 and AC500 systems. Stack up to 6 units for massive off-grid energy storage in Kenya.',
  '{"capacity":"3072Wh","chemistry":"LFP","compatible_with":"Bluetti AC300, AC500","stackable":"Up to 6 units","weight":"28kg"}',
  91999, true, 8, false, 120, 4.8, 12,
  'Buy Bluetti B300S Extra Battery in Kenya — Price KES 91,999 | Batteriq',
  'Buy the Bluetti B300S Extra Battery in Kenya for KES 91,999. 3072Wh LFP, for AC300/AC500. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-B300K', 'Bluetti', 'Batteries', 'Bluetti B300K Extra Battery', 'bluetti-b300k',
  'The Bluetti B300K is a 3072Wh expansion battery compatible with the Bluetti KIT home energy system. LFP chemistry ensures long-life reliable storage.',
  '{"capacity":"3072Wh","chemistry":"LFP","compatible_with":"Bluetti KIT systems","weight":"27.5kg"}',
  84499, true, 6, false, 121, 4.8, 7,
  'Buy Bluetti B300K Extra Battery in Kenya — Price KES 84,499 | Batteriq',
  'Buy the Bluetti B300K Extra Battery in Kenya for KES 84,499. 3072Wh LFP. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-EP760', 'Bluetti', 'Power Stations', 'Bluetti EP760', 'bluetti-ep760',
  'The Bluetti EP760 is a three-phase hybrid inverter and energy management system for solar integration. 7600W output, designed for Kenyan homes and businesses seeking energy independence.',
  '{"ac_output":"7600W three-phase","solar_input":"6000W max","compatible_batteries":"B300S","weight":"75kg","grid_tie":"Yes","installation":"Professional required"}',
  111999, true, 3, false, 108, 4.9, 6,
  'Buy Bluetti EP760 in Kenya — Price KES 111,999 | Batteriq',
  'Buy the Bluetti EP760 in Kenya for KES 111,999. 7600W three-phase hybrid inverter, solar-ready. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-B500', 'Bluetti', 'Batteries', 'Bluetti B500 Extra Battery', 'bluetti-b500',
  'The Bluetti B500 is a massive 4960Wh LFP expansion battery for the Bluetti EP760 system. The largest Bluetti battery module for maximum home energy storage.',
  '{"capacity":"4960Wh","chemistry":"LFP","compatible_with":"Bluetti EP760","weight":"50kg","cycles":"3500+"}',
  124999, true, 4, false, 122, 4.9, 4,
  'Buy Bluetti B500 Extra Battery in Kenya — Price KES 124,999 | Batteriq',
  'Buy the Bluetti B500 Extra Battery in Kenya for KES 124,999. 4960Wh LFP, for EP760. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-PV200', 'Bluetti', 'Solar Panels', 'Bluetti PV200 Solar Panel 200W', 'bluetti-pv200',
  'The Bluetti PV200 is a 200W foldable monocrystalline solar panel with 23.4% efficiency. Compatible with all Bluetti power stations via MC4 connector.',
  '{"power":"200W","efficiency":"23.4%","weight":"4.1kg","type":"Monocrystalline","foldable":"Yes","connector":"MC4","ip_rating":"IP65"}',
  25999, true, 20, false, 130, 4.8, 16,
  'Buy Bluetti PV200 Solar Panel 200W in Kenya — Price KES 25,999 | Batteriq',
  'Buy the Bluetti PV200 200W Solar Panel in Kenya for KES 25,999. 23.4% efficiency, IP65. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-PV350', 'Bluetti', 'Solar Panels', 'Bluetti PV350 Solar Panel 350W', 'bluetti-pv350',
  'The Bluetti PV350 delivers 350W of high-efficiency monocrystalline solar power. Large format for fast charging of AC200PL, AC300, and AC500 systems in Kenya''s abundant sunshine.',
  '{"power":"350W","efficiency":"23.4%","weight":"9.5kg","type":"Monocrystalline","foldable":"Yes","connector":"MC4","ip_rating":"IP65"}',
  61499, true, 12, false, 131, 4.9, 11,
  'Buy Bluetti PV350 Solar Panel 350W in Kenya — Price KES 61,499 | Batteriq',
  'Buy the Bluetti PV350 350W Solar Panel in Kenya for KES 61,499. 23.4% efficiency, high output. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-B230', 'Bluetti', 'Batteries', 'Bluetti B230 Extra Battery', 'bluetti-b230',
  'The Bluetti B230 is a 2048Wh LFP expansion battery compatible with Bluetti AC200P and AC200PL power stations. Doubles your storage for extended off-grid capability.',
  '{"capacity":"2048Wh","chemistry":"LFP","compatible_with":"Bluetti AC200P, AC200PL","weight":"22.7kg","cycles":"2500+"}',
  67499, true, 7, false, 123, 4.7, 9,
  'Buy Bluetti B230 Extra Battery in Kenya — Price KES 67,499 | Batteriq',
  'Buy the Bluetti B230 Extra Battery in Kenya for KES 67,499. 2048Wh LFP, for AC200P/PL. Authorised Bluetti dealer. M-Pesa payment. Nairobi delivery. Batteriq.'
),
(
  'BLUETTI-PV120', 'Bluetti', 'Solar Panels', 'Bluetti PV120 Solar Panel 120W', 'bluetti-pv120',
  'The Bluetti PV120 is a 120W foldable monocrystalline solar panel. Currently out of stock — contact us to be notified when available.',
  '{"power":"120W","efficiency":"23.4%","type":"Monocrystalline","foldable":"Yes","connector":"MC4"}',
  0, false, 0, false, 132, 4.8, 8,
  'Bluetti PV120 Solar Panel 120W in Kenya | Batteriq',
  'Bluetti PV120 120W Solar Panel — currently out of stock in Kenya. Contact Batteriq to be notified when available. Authorised Bluetti dealer. Nairobi delivery.'
);
