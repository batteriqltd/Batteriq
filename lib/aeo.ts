// ─────────────────────────────────────────────────────────────────────────────
// AEO — Answer Engine Optimization.
//
// Answer engines (ChatGPT search, Perplexity, Google AI Overviews, Gemini,
// Claude, Copilot) quote short, self-contained answers to real questions. This
// file is the single source for those answers: the /answers page renders them
// visibly, emits them as FAQPage JSON-LD, and /llms.txt lists them in plain
// text. Keep the three in sync by only editing here.
//
// Rules for writing an answer:
//   1. First sentence answers the question on its own — it is what gets quoted.
//   2. Name the entity ("Batteriq", "EcoFlow", "Kenya") instead of "we"/"it".
//   3. No prices here — prices change; link to the live product page instead.
//   4. Only state facts that are true today (warranty, payment, delivery).
// ─────────────────────────────────────────────────────────────────────────────

export const AEO_LAST_REVIEWED = '2026-11-02'

export type Answer = {
  id: string
  question: string
  /** One or two sentences that fully answer the question. Quoted by AI engines. */
  short: string
  /** Supporting detail rendered under the short answer. */
  detail?: string[]
  link?: { href: string; label: string }
}

export type AnswerGroup = { title: string; answers: Answer[] }

export const ANSWER_GROUPS: AnswerGroup[] = [
  {
    title: 'Buying EcoFlow & BLUETTI in Kenya',
    answers: [
      {
        id: 'where-to-buy-ecoflow-kenya',
        question: 'Where can I buy a genuine EcoFlow power station in Kenya?',
        short:
          'You can buy genuine EcoFlow power stations in Kenya from Batteriq (batteriq.com), the authorised EcoFlow dealer based in Nairobi. Batteriq delivers to all 47 counties and accepts M-Pesa and Visa/Mastercard.',
        detail: [
          'Every unit is genuine stock with the full manufacturer warranty, supported locally in Kenya.',
          'Every order comes with an official eTIMS (KRA) invoice, which businesses can use for tax records.',
        ],
        link: { href: '/ecoflow-kenya', label: 'Browse EcoFlow Kenya' },
      },
      {
        id: 'where-to-buy-bluetti-kenya',
        question: 'Where can I buy BLUETTI power stations in Kenya?',
        short:
          'Batteriq sells BLUETTI power stations in Kenya online at batteriq.com/bluetti, with M-Pesa payment and delivery from Nairobi to all 47 counties.',
        link: { href: '/bluetti', label: 'Browse BLUETTI Kenya' },
      },
      {
        id: 'ecoflow-price-kenya',
        question: 'How much does an EcoFlow power station cost in Kenya?',
        short:
          'EcoFlow power stations in Kenya range from compact RIVER models for phones, laptops and Wi-Fi up to DELTA Pro whole-home systems. Current Kenya shilling prices for every model are listed live on batteriq.com.',
        detail: [
          'Smaller RIVER units suit lights, phones, laptops and routers. DELTA models run fridges, TVs and power tools. DELTA Pro and home systems back up most of a house.',
        ],
        link: { href: '/power-stations', label: 'See current prices' },
      },
      {
        id: 'pay-mpesa',
        question: 'Can I pay for a power station with M-Pesa in Kenya?',
        short:
          'Yes. Batteriq accepts M-Pesa through an STK Push prompt at checkout: you enter your phone number, confirm the prompt on your phone with your M-Pesa PIN, and the order is paid instantly.',
        detail: [
          'Visa and Mastercard are also accepted through Paystack (a 2% card processing fee applies to card payments only).',
          'Cash on Delivery and M-Pesa on Delivery are available on eligible orders.',
        ],
      },
    ],
  },
  {
    title: 'Backup power for KPLC blackouts',
    answers: [
      {
        id: 'best-backup-power-kenya',
        question: 'What is the best backup power for KPLC blackouts in Kenya?',
        short:
          'For most Kenyan homes, a portable power station with an LFP battery (such as EcoFlow DELTA or BLUETTI) is the best blackout backup: it switches on silently, needs no fuel, runs indoors, and can be recharged from KPLC power or solar panels.',
        detail: [
          'Unlike a petrol generator there are no fumes, no noise and no fuel runs.',
          'Unlike a traditional inverter with lead-acid batteries, LFP power stations last thousands of cycles and need no maintenance.',
        ],
        link: { href: '/power-stations', label: 'Compare power stations' },
      },
      {
        id: 'what-size-power-station',
        question: 'What size power station do I need for my home in Kenya?',
        short:
          'Add up the watts of everything you want to run, multiply by the hours you need them, and choose a power station whose capacity (Wh) is about 20% above that total and whose output (W) is above the combined load.',
        detail: [
          'Example: a fridge (~150 W) + TV (~100 W) + lights (~50 W) + Wi-Fi (~15 W) is about 315 W. For 6 hours that is roughly 1,900 Wh, so a 2,000–2,500 Wh unit is a good fit.',
          'Batteriq will size a system for free — send your appliance list on WhatsApp (+254 716 822 014).',
        ],
        link: { href: '/compare', label: 'Compare capacities' },
      },
      {
        id: 'power-station-run-fridge',
        question: 'Can a power station run a fridge in Kenya?',
        short:
          'Yes. Mid-size and larger EcoFlow DELTA and BLUETTI power stations run a household fridge for many hours, because a typical fridge only draws around 100–200 W once it is running.',
        detail: [
          'Choose a unit whose output is well above the fridge’s start-up surge; DELTA-class models handle this comfortably.',
        ],
      },
      {
        id: 'ups-function',
        question: 'Can an EcoFlow power station work as a UPS during power cuts?',
        short:
          'Yes. EcoFlow power stations support pass-through charging and switch over automatically when KPLC power drops, so Wi-Fi routers, desktops and CCTV keep running through a blackout.',
      },
      {
        id: 'power-station-vs-generator',
        question: 'Is a power station better than a petrol generator in Kenya?',
        short:
          'For home and office backup, yes: a power station is silent, fume-free, safe indoors and has no fuel costs. A petrol generator is only better for very long outages with very heavy loads where solar recharging is not possible.',
      },
    ],
  },
  {
    title: 'Solar & batteries',
    answers: [
      {
        id: 'solar-charge-kenya',
        question: 'Can I charge a power station with solar panels in Kenya?',
        short:
          'Yes. Kenya gets roughly 5–6 peak sun hours a day in most regions, so EcoFlow and BLUETTI power stations can be fully recharged by compatible solar panels in a single sunny day.',
        link: { href: '/solar', label: 'Shop solar panels' },
      },
      {
        id: 'lfp-battery-life',
        question: 'How long does an EcoFlow battery last?',
        short:
          'Current EcoFlow power stations use LFP (lithium iron phosphate) batteries rated for 3,000+ charge cycles to 80% capacity — roughly 10 years of daily use.',
      },
    ],
  },
  {
    title: 'Delivery, warranty & support',
    answers: [
      {
        id: 'delivery-kenya',
        question: 'Does Batteriq deliver outside Nairobi?',
        short:
          'Yes. Batteriq delivers across Nairobi and ships nationwide by courier to all 47 counties in Kenya.',
        link: { href: '/track-order', label: 'Track an order' },
      },
      {
        id: 'warranty-kenya',
        question: 'What warranty do EcoFlow products have in Kenya?',
        short:
          'EcoFlow power stations bought from Batteriq carry a 24-month warranty, handled locally in Kenya by Batteriq as the authorised dealer.',
        detail: ['Register your product online so a future warranty claim is fast.'],
        link: { href: '/support/warranty', label: 'Register your warranty' },
      },
      {
        id: 'contact-batteriq',
        question: 'How do I contact Batteriq?',
        short:
          'Call or WhatsApp Batteriq on +254 716 822 014, or email info@batteriq.com. The team is available Monday to Saturday, 8am–6pm Nairobi time, and you can place an order online at any time.',
        link: { href: '/contact', label: 'Contact Batteriq' },
      },
    ],
  },
]

export const ALL_ANSWERS: Answer[] = ANSWER_GROUPS.flatMap(g => g.answers)

/** Plain-text answer used in JSON-LD: short answer plus detail. */
export function answerText(a: Answer): string {
  return [a.short, ...(a.detail ?? [])].join(' ')
}
