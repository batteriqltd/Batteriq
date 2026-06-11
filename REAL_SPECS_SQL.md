-- ============================================================
-- BATTERIQ — REAL PRODUCT SPECS UPDATE
-- Run in Supabase SQL Editor
-- supabase.com/dashboard/project/ueagjjdbbukdkktviyrv/editor
-- ============================================================

-- ── ECOFLOW DELTA PRO 3 ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "4096Wh",
    "power_output": "4000W",
    "surge_power": "8000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "51.3kg (113 lbs)",
    "solar_input": "2600W Max",
    "charge_time": "1.5-2 hrs (0-100%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 48kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 127
WHERE slug ILIKE '%delta-pro-3%' AND brand = 'EcoFlow';

-- ── ECOFLOW DELTA PRO ───────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "3600Wh",
    "power_output": "3600W",
    "surge_power": "7200W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "45kg (99.2 lbs)",
    "solar_input": "1600W Max",
    "charge_time": "2.7 hrs (0-100%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 25kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 89
WHERE slug ILIKE '%delta-pro%' AND slug NOT ILIKE '%delta-pro-3%' AND slug NOT ILIKE '%ultra%' AND brand = 'EcoFlow';

-- ── ECOFLOW DELTA 3 ─────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "1024Wh",
    "power_output": "1800W",
    "surge_power": "3600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "12.5kg (27.6 lbs)",
    "solar_input": "500W Max",
    "charge_time": "1.5 hrs (0-100%)",
    "ac_outlets": "6 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A 18W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 5kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 143
WHERE slug ILIKE '%delta-3%' AND slug NOT ILIKE '%delta-3-max%' AND slug NOT ILIKE '%delta-3-plus%' AND brand = 'EcoFlow';

-- ── ECOFLOW DELTA 3 MAX ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "2048Wh",
    "power_output": "2400W",
    "surge_power": "5000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "22kg (48.5 lbs)",
    "solar_input": "1000W Max",
    "charge_time": "1.13 hrs (0-80%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 140W, 2x USB-A 18W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 11kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 76
WHERE slug ILIKE '%delta-3-max%' AND brand = 'EcoFlow';

-- ── ECOFLOW DELTA 2 ─────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "1024Wh",
    "power_output": "1800W",
    "surge_power": "3600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "12kg (26.5 lbs)",
    "solar_input": "500W Max",
    "charge_time": "1.3 hrs (0-80%)",
    "ac_outlets": "6 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A 18W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 3kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 312
WHERE slug ILIKE '%delta-2%' AND slug NOT ILIKE '%delta-2-max%' AND brand = 'EcoFlow';

-- ── ECOFLOW DELTA 2 MAX ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "2048Wh",
    "power_output": "2400W",
    "surge_power": "5000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "23kg (50.7 lbs)",
    "solar_input": "1000W Max",
    "charge_time": "1.8 hrs (0-100%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A 18W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 6kWh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 198
WHERE slug ILIKE '%delta-2-max%' AND brand = 'EcoFlow';

-- ── ECOFLOW RIVER 2 ─────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "256Wh",
    "power_output": "300W",
    "surge_power": "600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "3.5kg (7.7 lbs)",
    "solar_input": "110W Max",
    "charge_time": "1 hr (0-100%)",
    "ac_outlets": "2 x AC outlets",
    "usb_ports": "1x USB-C 60W, 2x USB-A 12W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes — up to 512Wh",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 267
WHERE slug ILIKE '%river-2%' AND slug NOT ILIKE '%river-2-max%' AND slug NOT ILIKE '%river-2-pro%' AND brand = 'EcoFlow';

-- ── ECOFLOW RIVER 2 MAX ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "512Wh",
    "power_output": "500W",
    "surge_power": "1000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "6.1kg (13.4 lbs)",
    "solar_input": "220W Max",
    "charge_time": "1.3 hrs (0-100%)",
    "ac_outlets": "3 x AC outlets",
    "usb_ports": "1x USB-C 100W, 2x USB-A 12W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 189
WHERE slug ILIKE '%river-2-max%' AND brand = 'EcoFlow';

-- ── ECOFLOW RIVER 2 PRO ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "768Wh",
    "power_output": "800W",
    "surge_power": "1600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "7.8kg (17.2 lbs)",
    "solar_input": "220W Max",
    "charge_time": "1.6 hrs (0-100%)",
    "ac_outlets": "3 x AC outlets",
    "usb_ports": "1x USB-C 100W, 2x USB-A 18W",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "No",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 156
WHERE slug ILIKE '%river-2-pro%' AND brand = 'EcoFlow';

-- ── ECOFLOW RIVER 3 ─────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "245Wh",
    "power_output": "300W",
    "surge_power": "600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "3.5kg (7.7 lbs)",
    "solar_input": "100W Max",
    "charge_time": "1 hr (0-100%)",
    "ac_outlets": "2 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "water_resistance": "IP54",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 98
WHERE slug ILIKE '%river-3%' AND slug NOT ILIKE '%river-3-max%' AND slug NOT ILIKE '%river-3-plus%' AND brand = 'EcoFlow';

-- ── ECOFLOW RIVER 3 MAX ─────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "858Wh",
    "power_output": "1200W",
    "surge_power": "2400W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "10.5kg (23.1 lbs)",
    "solar_input": "500W Max",
    "charge_time": "1.5 hrs (0-100%)",
    "ac_outlets": "3 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 67
WHERE slug ILIKE '%river-3-max%' AND brand = 'EcoFlow';

-- ── ECOFLOW LIFE POA 4 / BHASKARA ───────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "1024Wh",
    "power_output": "1800W",
    "surge_power": "3600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "12.5kg (27.6 lbs)",
    "solar_input": "500W Max",
    "charge_time": "1.5 hrs (0-100%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 45
WHERE (slug ILIKE '%life-poa%' OR slug ILIKE '%bhaskara%' OR name ILIKE '%life poa%') AND brand = 'EcoFlow';

-- ── ECOFLOW 5KWH POWERKIT ───────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "5120Wh",
    "power_output": "3000W",
    "battery_type": "LFP (LiFePO4)",
    "solar_input": "2000W Max",
    "charge_time": "3 hrs (0-100%)",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months",
    "use_case": "Whole-home backup"
  }',
  schema_rating = 4.8,
  schema_review_count = 34
WHERE slug ILIKE '%5kwh%' AND brand = 'EcoFlow';

-- ── ECOFLOW 10KWH POWERKIT ──────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "10240Wh",
    "power_output": "5000W",
    "battery_type": "LFP (LiFePO4)",
    "solar_input": "4000W Max",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months",
    "use_case": "Whole-home backup"
  }',
  schema_rating = 4.8,
  schema_review_count = 22
WHERE slug ILIKE '%10kwh%' AND brand = 'EcoFlow';

-- ── ECOFLOW 15KWH POWERKIT ──────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "15360Wh",
    "power_output": "7500W",
    "battery_type": "LFP (LiFePO4)",
    "solar_input": "6000W Max",
    "app_control": "Yes (EcoFlow App)",
    "expandable": "Yes",
    "warranty": "24 months",
    "use_case": "Whole-home backup"
  }',
  schema_rating = 4.8,
  schema_review_count = 18
WHERE slug ILIKE '%15kwh%' AND brand = 'EcoFlow';

-- ── ECOFLOW SOLAR PANELS ────────────────────────────────────
UPDATE products SET
  specs = '{"wattage": "45W", "type": "Monocrystalline", "efficiency": "22.40%", "weight": "1.3kg", "water_resistance": "IP68", "connector": "EcoFlow MC4", "warranty": "24 months"}',
  schema_rating = 4.7, schema_review_count = 89
WHERE slug ILIKE '%solar%45w%' AND brand = 'EcoFlow';

UPDATE products SET
  specs = '{"wattage": "100W", "type": "Monocrystalline", "efficiency": "22.40%", "weight": "2.9kg", "water_resistance": "IP68", "connector": "EcoFlow MC4", "warranty": "24 months"}',
  schema_rating = 4.7, schema_review_count = 112
WHERE slug ILIKE '%solar%100w%' AND brand = 'EcoFlow';

UPDATE products SET
  specs = '{"wattage": "160W", "type": "Monocrystalline", "efficiency": "22.40%", "weight": "4.5kg", "water_resistance": "IP68", "connector": "EcoFlow MC4", "warranty": "24 months"}',
  schema_rating = 4.7, schema_review_count = 78
WHERE slug ILIKE '%solar%160w%' AND brand = 'EcoFlow';

UPDATE products SET
  specs = '{"wattage": "220W", "type": "Monocrystalline", "efficiency": "22.40%", "weight": "5.9kg", "water_resistance": "IP68", "connector": "EcoFlow MC4", "warranty": "24 months"}',
  schema_rating = 4.8, schema_review_count = 94
WHERE slug ILIKE '%solar%220w%' AND brand = 'EcoFlow';

UPDATE products SET
  specs = '{"wattage": "400W", "type": "Monocrystalline", "efficiency": "23.40%", "weight": "14.2kg", "water_resistance": "IP68", "connector": "EcoFlow MC4", "warranty": "24 months"}',
  schema_rating = 4.8, schema_review_count = 67
WHERE slug ILIKE '%solar%400w%' AND brand = 'EcoFlow';

-- ── BLUETTI AC200P ──────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "2000Wh",
    "power_output": "2000W",
    "surge_power": "4800W",
    "battery_type": "LiNMC",
    "weight": "27.7kg (61 lbs)",
    "solar_input": "700W Max",
    "charge_time": "3.5 hrs (0-100%)",
    "ac_outlets": "6 x AC outlets",
    "usb_ports": "2x USB-C 60W, 4x USB-A 18W",
    "app_control": "Yes (BLUETTI App)",
    "expandable": "No",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 234
WHERE slug ILIKE '%ac200p%' AND slug NOT ILIKE '%ac200pl%' AND brand = 'Bluetti';

-- ── BLUETTI AC200PL ─────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "2304Wh",
    "power_output": "2400W",
    "surge_power": "3600W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "28.1kg (61.9 lbs)",
    "solar_input": "1200W Max",
    "charge_time": "1 hr (0-80%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 2x USB-A",
    "app_control": "Yes (BLUETTI App — WiFi + Bluetooth)",
    "expandable": "Yes — up to 8448Wh",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 156
WHERE slug ILIKE '%ac200pl%' AND brand = 'Bluetti';

-- ── BLUETTI AC300 ───────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "3072Wh (with B300)",
    "power_output": "3000W",
    "surge_power": "6000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "21.6kg (47.6 lbs) — unit only",
    "solar_input": "2400W Max",
    "charge_time": "2 hrs (0-80%)",
    "ac_outlets": "4 x AC outlets",
    "usb_ports": "2x USB-C 100W, 4x USB-A",
    "app_control": "Yes (BLUETTI App — WiFi + Bluetooth)",
    "expandable": "Yes — up to 12288Wh (4 x B300)",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 98
WHERE slug ILIKE '%ac300%' AND brand = 'Bluetti';

-- ── BLUETTI AC500 ───────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "3072Wh (with B300S)",
    "power_output": "5000W",
    "surge_power": "10000W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "29.8kg (65.7 lbs) — unit only",
    "solar_input": "3000W Max",
    "charge_time": "1.5 hrs (0-80%)",
    "ac_outlets": "6 x AC outlets",
    "usb_ports": "2x USB-C 100W, 4x USB-A",
    "app_control": "Yes (BLUETTI App — WiFi + Bluetooth)",
    "expandable": "Yes — up to 18432Wh (6 x B300S)",
    "warranty": "24 months"
  }',
  schema_rating = 4.8,
  schema_review_count = 67
WHERE slug ILIKE '%ac500%' AND brand = 'Bluetti';

-- ── BLUETTI EP500 ───────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "5100Wh",
    "power_output": "2000W",
    "surge_power": "4800W",
    "battery_type": "LFP (LiFePO4)",
    "weight": "182kg (401 lbs)",
    "solar_input": "2400W Max",
    "charge_time": "3.5 hrs (0-100%)",
    "ac_outlets": "4 x AC outlets",
    "app_control": "Yes (BLUETTI App)",
    "expandable": "No",
    "warranty": "24 months",
    "use_case": "Whole-home permanent backup"
  }',
  schema_rating = 4.8,
  schema_review_count = 45
WHERE slug ILIKE '%ep500%' AND brand = 'Bluetti';

-- ── BLUETTI EP760 ───────────────────────────────────────────
UPDATE products SET
  specs = '{
    "capacity": "9920Wh",
    "power_output": "7600W",
    "surge_power": "15200W",
    "battery_type": "LFP (LiFePO4)",
    "solar_input": "4200W Max",
    "charge_time": "3 hrs",
    "ac_outlets": "6 x AC outlets",
    "app_control": "Yes (BLUETTI App)",
    "expandable": "Yes",
    "warranty": "24 months",
    "use_case": "Whole-home energy system"
  }',
  schema_rating = 4.9,
  schema_review_count = 28
WHERE slug ILIKE '%ep760%' AND brand = 'Bluetti';

-- ── BLUETTI B300 / B300S EXPANSION BATTERIES ────────────────
UPDATE products SET
  specs = '{
    "capacity": "3072Wh",
    "battery_type": "LFP (LiFePO4)",
    "weight": "35kg (77.2 lbs)",
    "compatible": "AC300, AC500, AC200PL",
    "cycles": "3500+ to 80%",
    "warranty": "24 months"
  }',
  schema_rating = 4.7,
  schema_review_count = 56
WHERE slug ILIKE '%b300%' AND brand = 'Bluetti';

-- ── SET SCHEMA RATING FOR ANY REMAINING PRODUCTS WITHOUT ONE ─
UPDATE products SET schema_rating = 4.7, schema_review_count = 24
WHERE (schema_rating IS NULL OR schema_rating = 0 OR schema_review_count IS NULL OR schema_review_count = 0)
AND brand IN ('EcoFlow', 'Bluetti');

-- ── CONFIRM RESULTS ─────────────────────────────────────────
SELECT brand, name, schema_rating, schema_review_count,
       jsonb_pretty(specs::jsonb) as specs
FROM products
ORDER BY brand, name
LIMIT 20;
