// Delivery fee calculation by Kenyan county.
// Fees are tiered by distance from the Nairobi fulfilment hub.

export const COUNTY_DELIVERY_FEES: Record<string, number> = {
  // Zone 1 — Nairobi metro
  'Nairobi': 500,
  // Zone 2 — Neighbouring counties
  'Kiambu': 800,
  'Machakos': 800,
  'Kajiado': 800,
  'Murang\u0027a': 1000,
  // Zone 3 — Central / Rift near
  'Nakuru': 1200,
  'Nyeri': 1200,
  'Kirinyaga': 1200,
  'Nyandarua': 1200,
  'Embu': 1300,
  'Meru': 1500,
  'Tharaka-Nithi': 1500,
  'Laikipia': 1400,
  'Narok': 1300,
  'Kericho': 1500,
  'Bomet': 1500,
  'Baringo': 1600,
  'Nandi': 1600,
  'Uasin Gishu': 1500,
  'Elgeyo-Marakwet': 1700,
  'Trans Nzoia': 1700,
  'West Pokot': 1900,
  // Zone 4 — Western / Nyanza
  'Kisumu': 1500,
  'Kisii': 1600,
  'Nyamira': 1600,
  'Homa Bay': 1700,
  'Migori': 1800,
  'Siaya': 1700,
  'Kakamega': 1600,
  'Vihiga': 1600,
  'Bungoma': 1700,
  'Busia': 1800,
  // Zone 5 — Coast
  'Mombasa': 1500,
  'Kilifi': 1700,
  'Kwale': 1800,
  'Taita-Taveta': 1700,
  'Tana River': 2000,
  'Lamu': 2200,
  // Zone 6 — Eastern / North
  'Kitui': 1400,
  'Makueni': 1200,
  'Garissa': 2200,
  'Wajir': 2500,
  'Mandera': 2800,
  'Isiolo': 1800,
  'Marsabit': 2400,
  'Samburu': 2000,
  'Turkana': 2500,
}

export const KENYAN_COUNTIES = Object.keys(COUNTY_DELIVERY_FEES).sort()

const DEFAULT_FEE = 1500

/** Returns the delivery fee in KES for a given county (case-insensitive). */
export function getDeliveryFee(county: string): number {
  if (!county) return DEFAULT_FEE
  const normalized = county.trim().toLowerCase()
  const match = Object.keys(COUNTY_DELIVERY_FEES).find(
    c => c.toLowerCase() === normalized
  )
  return match ? COUNTY_DELIVERY_FEES[match] : DEFAULT_FEE
}
