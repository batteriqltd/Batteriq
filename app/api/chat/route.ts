import { NextResponse } from 'next/server'

// ============================================================
// PRODUCT KNOWLEDGE BASE
// ============================================================
const PRODUCTS = [
  // Approved EcoFlow products only
  { id: 'delta-3-classic', brand: 'EcoFlow', name: 'DELTA 3 Classic', category: 'Power Station', price: 84379, specs: { capacity: '1024Wh', output: '1800W (surge 3600W)', chemistry: 'LFP', weight: '12.5kg', ports: 13 }, slug: 'ecoflow/delta-3-classic', inStock: true },
  { id: 'delta-3-ultra', brand: 'EcoFlow', name: 'DELTA 3 Ultra', category: 'Power Station', price: 250799, specs: { capacity: '3600Wh', output: '3076W', chemistry: 'LFP', weight: '36kg', ports: 13 }, slug: 'ecoflow/delta-3-ultra', inStock: true },
  { id: 'delta-pro', brand: 'EcoFlow', name: 'DELTA Pro', category: 'Power Station', price: 291399, specs: { capacity: '3600Wh', output: '3600W (surge 7200W)', chemistry: 'LFP', weight: '45kg', ports: 13 }, slug: 'ecoflow/delta-pro', inStock: true },
  { id: 'delta-pro-3', brand: 'EcoFlow', name: 'DELTA Pro 3', category: 'Power Station', price: 461799, specs: { capacity: '4096Wh', output: '4000W (surge 8000W)', chemistry: 'LFP', weight: '51.5kg', ports: 12 }, slug: 'ecoflow/delta-pro-3', inStock: true },
  // Bluetti
  { id: 'bluetti-ac200pl', brand: 'Bluetti', name: 'AC200PL', category: 'Power Station', price: 127500, specs: { capacity: 'High capacity', output: 'AC Output' }, slug: 'bluetti/ac200pl', inStock: true },
  { id: 'bluetti-ac500', brand: 'Bluetti', name: 'AC500', category: 'Power Station', price: 84499, specs: { capacity: 'High capacity', output: 'AC Output' }, slug: 'bluetti/ac500', inStock: true },
  { id: 'bluetti-ac300', brand: 'Bluetti', name: 'AC300', category: 'Power Station', price: 68499, specs: { capacity: 'High capacity', output: 'AC Output' }, slug: 'bluetti/ac300', inStock: true },
  { id: 'bluetti-eb3a', brand: 'Bluetti', name: 'EB3A', category: 'Power Station', price: 24999, specs: { capacity: 'Compact', output: 'AC Output' }, slug: 'bluetti/eb3a', inStock: true },
  { id: 'bluetti-ac70p', brand: 'Bluetti', name: 'AC70P', category: 'Power Station', price: 60000, specs: { capacity: 'Mid range', output: 'AC Output' }, slug: 'bluetti/ac70p', inStock: true },
  { id: 'bluetti-ac180p', brand: 'Bluetti', name: 'AC180P', category: 'Power Station', price: 76000, specs: { capacity: 'High capacity', output: 'AC Output' }, slug: 'bluetti/ac180p', inStock: true },
]

// ============================================================
// TYPES
// ============================================================
type Product = typeof PRODUCTS[0]

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface BotResponse {
  message: string
  type: 'text' | 'products' | 'product_detail' | 'order_action'
  products?: Product[]
  product?: Product
  action?: { type: 'add_to_cart'; productId: string; productName: string; price: number; slug: string }
  quickReplies?: string[]
}

// ============================================================
// HELPERS
// ============================================================
function fmt(price: number) {
  return `KES ${price.toLocaleString('en-KE')}`
}

function findProducts(query: string): Product[] {
  const q = query.toLowerCase()
  return PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.id.includes(q.replace(/\s/g, '-'))
  )
}

function detectLanguage(msg: string): 'sw' | 'en' {
  const swahiliWords = ['habari', 'hujambo', 'jambo', 'sema', 'niaje', 'mambo', 'poa', 'sawa', 'asante', 'karibu', 'ndiyo', 'hapana', 'bei', 'ngapi', 'tafadhali', 'naomba', 'nataka', 'unataka', 'nina', 'una', 'gani', 'lini', 'wapi', 'vipi', 'kama', 'lakini', 'pia', 'sana']
  const lower = msg.toLowerCase()
  const count = swahiliWords.filter(w => lower.includes(w)).length
  return count >= 1 ? 'sw' : 'en'
}

// ============================================================
// RESPONSE ENGINE — Amira personality
// ============================================================
function getResponse(message: string, history: ChatMessage[]): BotResponse {
  const msg = message.toLowerCase().trim()
  const lang = detectLanguage(msg)
  const lastBotMsg = history.filter(h => h.role === 'assistant').slice(-1)[0]?.content ?? ''

  // GREETINGS — English
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|what'?s up|sup|yo|hiya)/.test(msg)) {
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return {
      message: `${timeGreeting}! 😊 Welcome to Batteriq.\n\nI'm Amira — I'm here to help you find the right power backup or solar solution. Whether you're dealing with KPLC outages at home or need power on the go, we've got you covered.\n\nWhat brings you here today?`,
      type: 'text',
      quickReplies: ['I need home backup power', 'Looking for a portable station', 'Tell me about solar panels', "What are your prices?"],
    }
  }

  // GREETINGS — Swahili
  if (/^(habari|hujambo|jambo|sema|niaje|mambo|sasa|vipi|h[ae]e)/.test(msg)) {
    return {
      message: `Habari! 😊 Karibu Batteriq.\n\nMimi ni Amira — niko hapa kukusaidia kupata suluhisho bora la nguvu au solar. Tuna EcoFlow na Bluetti power stations — zinauzwa Kenya na tunalipa na M-Pesa!\n\nUnataka nikusaidie na nini leo?`,
      type: 'text',
      quickReplies: ['Nataka power station ya nyumbani', 'Niambie kuhusu bei', 'Solar panels zinauzwa?', 'Delivery inafikia wapi?'],
    }
  }

  // SWAHILI — want to buy
  if (lang === 'sw' && /nataka|niambie|nipe|show|onyesha|ninahitaji|nahitaji/.test(msg)) {
    if (msg.includes('power') || msg.includes('nguvu') || msg.includes('backup') || msg.includes('betri')) {
      return {
        message: `Vizuri sana! 💪 Hizi ndizo power stations zetu maarufu zaidi kwa nyumba Kenya:\n\nZote zinauzwa na **M-Pesa** na tunapeleka **Nairobi** siku moja na **countis zote** ndani ya siku 2-5.`,
        type: 'products',
        products: PRODUCTS.filter(p => p.category === 'Power Station' && p.brand === 'EcoFlow').slice(0, 4),
        quickReplies: ['DELTA Pro ni ngapi?', 'DELTA 3 Classic ni ngapi?', 'Delivery inagharimu ngapi?'],
      }
    }
    if (msg.includes('solar') || msg.includes('jua')) {
      return {
        message: `Nzuri! ☀️ Hizi ni solar panels zetu — zote ni za EcoFlow, zinafanya kazi Kenya vizuri sana (tutajua jua ni nyingi hapa! 😄)`,
        type: 'products',
        products: PRODUCTS.filter(p => p.category === 'Solar Panel').slice(0, 4),
        quickReplies: ['Ipi inafaa nyumbani?', 'Bei ya 400W?', 'Inafanya kazi na nini?'],
      }
    }
  }

  // SWAHILI — price query
  if (lang === 'sw' && /bei|ngapi|gharama|pesa ngapi|inauzwa/.test(msg)) {
    const found = findProducts(msg)
    if (found.length === 1) {
      const p = found[0]
      return {
        message: `${p.brand} **${p.name}** inauzwa **${fmt(p.price)}** Kenya.\n\n${p.inStock ? '✅ Iko stock — tayari kutumwa.' : '⚠️ Hivi sasa imekwisha.'}\n\nUnataka niongeze kwenye cart yako? 🛒`,
        type: 'product_detail',
        product: p,
        action: { type: 'add_to_cart', productId: p.id, productName: `${p.brand} ${p.name}`, price: p.price, slug: p.slug },
        quickReplies: ['Ndiyo, ongeza cart', 'Niambie zaidi', 'Onyesha kitu kingine'],
      }
    }
    return {
      message: `Sawa! Bei zinaanza KES 7,599 (solar panel ndogo) hadi KES 1,399,999 (PowerKit ya nyumba nzima).\n\nUnataka bei ya bidhaa gani hasa?`,
      type: 'text',
      quickReplies: ['Bei ya DELTA Pro', 'Bei ya DELTA 3 Classic', 'Bei ya solar panels'],
    }
  }

  // YES / CONFIRM
  if (/^(yes|yeah|yep|sure|ok|okay|add it|add to cart|order|buy it|i want it|ndiyo|sawa|ongeza)$/.test(msg)) {
    const match = lastBotMsg.match(/productId['":\s]+([a-z0-9-]+)/i) ?? lastBotMsg.match(/\[ADD_TO_CART:([^\]]+)\]/)
    const lastProduct = match ? PRODUCTS.find(p => p.id === match[1]) : null
    if (lastProduct) {
      return {
        message: `Perfect! 🛒 I've added the **${lastProduct.brand} ${lastProduct.name}** to your cart.\n\nYou can checkout now with **M-Pesa** — super quick, just enter your number and confirm the push on your phone. Anything else you'd like to add?`,
        type: 'order_action',
        action: { type: 'add_to_cart', productId: lastProduct.id, productName: `${lastProduct.brand} ${lastProduct.name}`, price: lastProduct.price, slug: lastProduct.slug },
        quickReplies: ['Go to checkout', 'Add a solar panel too', "That's all, thanks"],
      }
    }
  }

  // HOW ARE YOU / SMALL TALK
  if (/how are you|how r u|are you (ok|good|fine|well)|uko sawa|habari yako/.test(msg)) {
    return {
      message: `I'm doing great, thanks for asking! 😄 Ready to help you find the perfect power solution.\n\nWhat can I do for you today?`,
      type: 'text',
      quickReplies: ['Show me power stations', 'Solar panel prices', 'How does M-Pesa work?'],
    }
  }

  // WHO ARE YOU
  if (/who are you|what is your name|your name|jina lako|wewe ni nani/.test(msg)) {
    return {
      message: `I'm **Amira**, Batteriq's virtual assistant! 😊\n\nThink of me as your personal energy expert — I know every product we stock, all the prices, and I can help you figure out exactly what you need for your home, office, or outdoor adventures.\n\nI'm not a robot, I promise! 😄 Well, technically I am... but I try not to act like one.\n\nWhat can I help you with?`,
      type: 'text',
      quickReplies: ['Help me choose a power station', "What's the best for home?", 'Show me prices'],
    }
  }

  // BROWSE ALL
  if (/show.*(all|everything|products)|browse|what do you (have|sell|stock)|full range|catalog/.test(msg)) {
    return {
      message: `Here's everything we carry at Batteriq! 🏪\n\n**EcoFlow** (our flagship brand — we're the official Kenya distributor):\n• Power Stations — DELTA & RIVER series\n• Solar Panels — 45W to 400W\n• Extra Batteries & Accessories\n\n**Bluetti:**\n• Power Stations — AC & EB series\n\nAll products come with warranty and we accept **M-Pesa**! What catches your eye?`,
      type: 'text',
      quickReplies: ['EcoFlow Power Stations', 'Solar Panels', 'Bluetti options', "What's most popular?"],
    }
  }

  // MOST POPULAR / RECOMMEND
  if (/popular|best seller|most sold|recommend|suggest|which one|what should i|help me choose/.test(msg)) {
    return {
      message: `Great question! Here are the approved EcoFlow models we keep in stock right now 🔥\n\n**Recommended for homes:**\n🥇 EcoFlow DELTA Pro 3 — KES 461,799 (top tier whole-home backup)\n🥈 EcoFlow DELTA Pro — KES 291,399 (heavy-duty home use)\n\n**Compact-to-mid size options:**\n🥇 EcoFlow DELTA 3 Ultra — KES 250,799\n🥈 EcoFlow DELTA 3 Classic — KES 84,379\n\nThe **DELTA Pro 3** is the premium choice for bigger homes and business backup. Want to see the best fit for your load?`,
      type: 'text',
      quickReplies: ['Tell me about DELTA Pro 3', 'I need something bigger', 'Show DELTA 3 Classic'],
    }
  }

  // POWER STATIONS — general
  if (/power station|portable power|backup power|battery backup|load shedding|blackout|outage|kplc/.test(msg) && !msg.includes('delta') && !msg.includes('river')) {
    return {
      message: `You've come to the right place! Power cuts are a real struggle in Kenya 😤 — we hear this from customers every day.\n\nOur power stations are different from normal inverters — they're portable, silent, and charge from solar or a wall socket. No fuel, no fumes, no noise.\n\nTo recommend the right one, quick question: **what do you mainly need to power?**`,
      type: 'text',
      quickReplies: ['Fridge + lights + TV at home', 'Just phones, laptops, router', 'Whole house / business', "I'm not sure, help me"],
    }
  }

  // USE CASE — home (fridge, lights, TV)
  if (/fridge|lights.*tv|tv.*lights|home appliance|whole house|nyumba|jokofu/.test(msg)) {
    return {
      message: `Perfect — for fridge, lights, and TV the **approved DELTA range** is what you want. These are our home heroes 🏠\n\nHere's what each one can handle:\n• **DELTA 3 Classic** (KES 84K) — compact backup for essentials\n• **DELTA 3 Ultra** (KES 250K) — bigger home / business backup\n• **DELTA Pro** (KES 291K) — heavy-duty whole-home support\n• **DELTA Pro 3** (KES 462K) — premium all-round backup\n\nWhich budget range works for you?`,
      type: 'products',
      products: PRODUCTS.filter(p => ['delta-3-classic', 'delta-3-ultra', 'delta-pro', 'delta-pro-3'].includes(p.id)),
      quickReplies: ['Tell me more about DELTA 3 Classic', 'Is DELTA Pro enough for my fridge?', 'I want the DELTA Pro 3'],
    }
  }

  // USE CASE — portable / light devices
  if (/just.*phone|just.*laptop|phone.*laptop|laptop.*phone|router|light use|travel|camping|outdoor|safari|ndogo/.test(msg)) {
    return {
      message: `Nice! For phones, laptops, and a home router, the **DELTA 3 Classic** and **DELTA Pro** are the smart EcoFlow choices in Kenya right now. They offer strong backup without the extra bulky kit.`,
      type: 'products',
      products: PRODUCTS.filter(p => ['delta-3-classic', 'delta-pro'].includes(p.id)),
      quickReplies: ['Tell me about DELTA 3 Classic', 'Can it charge a laptop?', 'I need more than this'],
    }
  }

  // ── SPECIFIC PRODUCT HANDLERS ──

  // DELTA Pro 3
  if (msg.includes('delta pro 3') || msg.includes('delta pro3')) {
    const p = PRODUCTS.find(x => x.id === 'delta-pro-3')!
    return {
      message: `The **EcoFlow DELTA Pro 3** is our absolute top of the range — this thing is a beast! 💪\n\n💰 **${fmt(p.price)}**\n⚡ Output: ${p.specs.output}\n🔋 Capacity: ${p.specs.capacity}\n🧪 Battery: ${p.specs.chemistry} — 10-year lifespan\n⚖️ Weight: ${p.specs.weight}\n\nThis can power an entire home or business. Pairs beautifully with our 400W solar panels for full off-grid living.\n\nShall I add it to your cart?`,
      type: 'product_detail',
      product: p,
      action: { type: 'add_to_cart', productId: p.id, productName: `${p.brand} ${p.name}`, price: p.price, slug: p.slug },
      quickReplies: ['Yes! Add to cart', 'Compare with DELTA Pro', 'What solar panel pairs with this?'],
    }
  }

  // DELTA Pro
  if ((msg.includes('delta pro') && !msg.includes('ultra') && !msg.includes('3')) || msg.includes('delta-pro')) {
    const p = PRODUCTS.find(x => x.id === 'delta-pro')!
    return {
      message: `The **EcoFlow DELTA Pro** is Kenya's best-selling power station — and honestly, it's earned that title! ⭐\n\n💰 **${fmt(p.price)}**\n⚡ ${p.specs.output}\n🔋 ${p.specs.capacity}\n🧪 LFP chemistry — lasts 10 years with 3,500+ charge cycles\n⚖️ ${p.specs.weight}\n\nCustomers love this one. It handles everything — fridge, TV, lights, CPAP machine, power tools. The 7200W surge means it won't struggle with motors.\n\nWant to add it to your cart?`,
      type: 'product_detail',
      product: p,
      action: { type: 'add_to_cart', productId: p.id, productName: `${p.brand} ${p.name}`, price: p.price, slug: p.slug },
      quickReplies: ['Yes, add to cart', 'Show DELTA Pro 3', 'Can I pair it with solar?'],
    }
  }

  // DELTA 3 Classic
  if (msg.includes('delta 3 classic') || msg.includes('delta-3-classic')) {
    const p = PRODUCTS.find(x => x.id === 'delta-3-classic')!
    return {
      message: `**EcoFlow DELTA 3 Classic** — compact, efficient home backup for the essentials 🏠\n\n💰 **${fmt(p.price)}**\n⚡ ${p.specs.output}\n🔋 ${p.specs.capacity}\n⚖️ ${p.specs.weight}\n\nThis is the value-minded EcoFlow option for lights, Wi‑Fi, TVs, and key appliances during outages.\n\nAdd to cart?`,
      type: 'product_detail',
      product: p,
      action: { type: 'add_to_cart', productId: p.id, productName: `${p.brand} ${p.name}`, price: p.price, slug: p.slug },
      quickReplies: ['Yes, add to cart', 'Compare with DELTA 3 Ultra', 'Show DELTA Pro'],
    }
  }

  // DELTA 3 Ultra
  if (msg.includes('delta 3 ultra') || msg.includes('delta-3-ultra')) {
    const p = PRODUCTS.find(x => x.id === 'delta-3-ultra')!
    return {
      message: `**EcoFlow DELTA 3 Ultra** — bigger backup for homes and business loads ⚡\n\n💰 **${fmt(p.price)}**\n⚡ ${p.specs.output}\n🔋 ${p.specs.capacity}\n⚖️ ${p.specs.weight}\n\nThis is the stronger EcoFlow option when you need more runtime and more power for the main loads on your property.\n\nAdd to cart?`,
      type: 'product_detail',
      product: p,
      action: { type: 'add_to_cart', productId: p.id, productName: `${p.brand} ${p.name}`, price: p.price, slug: p.slug },
      quickReplies: ['Yes, add to cart', 'Compare with DELTA Pro', 'Show DELTA Pro 3'],
    }
  }

  // SOLAR PANELS
  if (/solar|panel|jua|photovoltaic|pv/.test(msg) && !msg.includes('station') && !msg.includes('power station')) {
    return {
      message: `Solar panels! ☀️ Great choice — Kenya has incredible sunshine, so solar makes a lot of sense here.\n\nAll our EcoFlow panels are **monocrystalline** (most efficient), **foldable**, and pair perfectly with any EcoFlow power station.\n\nOur range goes from a tiny 45W panel (KES 7,599) all the way to a 400W beast (KES 71,240).\n\nWhat are you trying to do with solar?`,
      type: 'text',
      quickReplies: ['Charge my power station faster', 'I want to go off-grid', 'Camping/outdoor use', 'Show all panels with prices'],
    }
  }

  // BLUETTI
  if (msg.includes('bluetti')) {
    const bluetti = PRODUCTS.filter(p => p.brand === 'Bluetti')
    return {
      message: `We also stock **Bluetti power stations** in Kenya 🔋\n\n${bluetti.map(p => `• **Bluetti ${p.name}** — ${fmt(p.price)}`).join('\n')}\n\nWhich model interests you?`,
      type: 'text',
      quickReplies: ['Tell me about AC200PL', 'Tell me about EB3A', 'Compare EcoFlow vs Bluetti'],
    }
  }

  // COMPARE
  if (/compare|difference|\bvs\b|versus|better|which is|ecoflow vs bluetti/.test(msg)) {
    return {
      message: `Good thinking — let me break it down honestly! 🤔\n\n**EcoFlow** ✅\n• We're the **official Kenya distributor** — means full local warranty\n• Faster charging (their X-Stream tech is genuinely impressive)\n• Better software & app\n• Wider range of products\n\n**Bluetti** ✅\n• Also excellent quality\n• Some models offer more raw capacity per shilling\n• Solid choice for home use\n\nMy honest recommendation? Go EcoFlow — especially because we can handle your warranty here in Kenya without any hassle.\n\nWhat's your budget? I'll pick the best one for you!`,
      type: 'text',
      quickReplies: ['Under KES 50,000', 'KES 50K–150K', 'Over KES 150,000', 'Tell me about Bluetti'],
    }
  }

  // BUDGET — affordable
  if (/under.*50|cheap|affordable|bei.*nafuu|cheapest/.test(msg)) {
    const affordable = PRODUCTS.filter(p => p.price < 50000).sort((a, b) => a.price - b.price)
    return {
      message: `Under KES 50,000 — here's what we have for you! All great quality 👇`,
      type: 'products',
      products: affordable.slice(0, 4),
      quickReplies: ['Tell me about DELTA 3 Classic', 'Tell me about DELTA Pro', 'I have more budget actually'],
    }
  }

  // BUDGET — mid range
  if (/50.?000.*150.?000|50k.*150k|mid.?range|between 50/.test(msg)) {
    const mid = PRODUCTS.filter(p => p.price >= 50000 && p.price <= 160000).sort((a, b) => a.price - b.price)
    return {
      message: `KES 50K–160K range — this is honestly the sweet spot for most Kenyan homes 🎯`,
      type: 'products',
      products: mid.slice(0, 4),
      quickReplies: ['Tell me about DELTA 3 Classic', 'Tell me about DELTA Pro', 'Help me choose between these'],
    }
  }

  // BUDGET — premium
  if (/over.*150|above.*150|premium|high.?end|\bbest\b|\btop\b|biggest|largest/.test(msg)) {
    const premium = PRODUCTS.filter(p => p.price > 150000)
    return {
      message: `Our premium range — for serious power needs! These are the heavy hitters 💪`,
      type: 'products',
      products: premium.slice(0, 4),
      quickReplies: ['Tell me about DELTA Pro', 'Tell me about DELTA Pro 3', 'What about Solar Home Systems?'],
    }
  }

  // MPESA / PAYMENT
  if (/mpesa|m-pesa|m pesa|lipa|malipo|how to pay/.test(msg)) {
    return {
      message: `M-Pesa payment is our most popular option — Kenyan customers love it! 📱\n\nHere's exactly how it works:\n1️⃣ Add items to your cart\n2️⃣ Go to checkout\n3️⃣ Choose "Pay Now with M-Pesa"\n4️⃣ Enter your M-Pesa number\n5️⃣ You get an STK Push on your phone\n6️⃣ Enter your PIN — order confirmed! ✅\n\nNo manual codes, no screenshots, no WhatsApp-ing us — it's all automatic.\n\nWe also have:\n💵 Cash on Delivery\n📱 M-Pesa at the doorstep`,
      type: 'text',
      quickReplies: ["Let me start shopping!", "What if the push doesn't come?", 'Delivery details'],
    }
  }

  // DELIVERY
  if (/deliver|shipping|nairobi|send|courier|how long|peleka|usafirishaji/.test(msg)) {
    return {
      message: `Delivery is something we take seriously at Batteriq 🚚\n\n**Nairobi:**\n• Before 12PM → same day ⚡\n• After 12PM → next day\n• Weekends available by arrangement\n\n**Rest of Kenya:**\n• Major towns (Mombasa, Kisumu, Nakuru) — 1-2 days\n• All other counties — 2-5 days\n• We cover all 47 counties!\n\nOnce your order is dispatched, you'll get a WhatsApp message with tracking info. 📩`,
      type: 'text',
      quickReplies: ['How much is delivery?', 'Do you deliver to my county?', 'Start shopping'],
    }
  }

  // ORDER TRACKING
  if (/track|order status|where is my|my order/.test(msg)) {
    return {
      message: `🔍 **Track Your Order**\n\n1. Go to **batteriq.com/track-order**\n2. Enter your order number (e.g. BQ-20250520-001)\n3. Enter the email used at checkout\n\nNo account needed! You also receive WhatsApp updates automatically when your order moves.`,
      type: 'text',
      quickReplies: ['I lost my order number', 'Contact support'],
    }
  }

  // WARRANTY
  if (/warrant|guarantee|return|broken|repair|dhamana/.test(msg)) {
    return {
      message: `Great question — warranty is actually one of our biggest selling points! 🛡️\n\nBecause we're Kenya's **official authorised EcoFlow distributor**, you don't have to send anything abroad if something goes wrong. We handle it all here.\n\n**Our warranty periods:**\n• ⚡ Power Stations — **24 months**\n• ☀️ Solar Panels — **24 months** + 5yr power output\n• 🔋 Extra Batteries — **24 months**\n• 🔌 Accessories — **12 months**\n\nTo make a claim: just WhatsApp us with a photo or video of the issue. We sort it out! 🤝`,
      type: 'text',
      quickReplies: ['Register my warranty', 'How to make a claim', 'Back to shopping'],
    }
  }

  // ABOUT
  if (/who are you|what is batteriq|about batteriq|authorised|official|genuine|real/.test(msg)) {
    return {
      message: `🏢 **About Batteriq**\n\nBatteriq is **Kenya's #1 officially authorised EcoFlow distributor** and a leading Bluetti stockist.\n\nBased in **Nairobi, Kenya**, we provide:\n✅ 100% genuine EcoFlow products\n✅ Official EcoFlow warranty (honoured locally)\n✅ M-Pesa & Cash on Delivery\n✅ Same-day Nairobi delivery\n✅ Nationwide shipping across all 47 counties\n\nTagline: *"Guarantee your Uptime"* ⚡`,
      type: 'text',
      quickReplies: ['Shop EcoFlow', 'Contact us', 'Warranty policy'],
    }
  }

  // CONTACT
  if (/contact|call|whatsapp|email|reach|speak|human|talk to someone|real person|agent|mtu/.test(msg)) {
    return {
      message: `Want to talk to someone directly? Totally understand! 😊\n\n📱 **WhatsApp** (fastest!): 0716822014\n📞 **Call us**: 0716822014\n📧 **Email**: info@batteriq.com\n\nWe're available **Monday to Saturday, 8AM–6PM**.\n\nHonestly, WhatsApp is the quickest — our team usually replies within a few minutes. 🙂`,
      type: 'text',
      quickReplies: ['Open WhatsApp', 'Send email', 'Keep chatting here'],
    }
  }

  // SOLAR HOME SYSTEMS
  if (/powerkit|power kit|solar home|whole.?home|solar system|full system|off.?grid/.test(msg)) {
    return {
      message: `🏠 **Solar Home Systems** — Whole-Home Solar Energy\n\nFor complete home energy independence:\n\n• **5kWh Solar Home System** — KES 759,999\n• **10kWh Solar Home System** — KES 1,049,999\n• **15kWh Solar Home System** — KES 1,399,999\n\nThese require a site assessment. Please contact our team for a consultation — we'll design the right system for your home.`,
      type: 'text',
      quickReplies: ['Contact for a Solar Home System quote', 'Tell me about DELTA Pro', 'Back to portable stations'],
    }
  }

  // UPS
  if (/\bups\b|uninterruptible|protect sensitive|router.*power|cctv|nas drive/.test(msg)) {
    return {
      message: `⚡ **UPS Function**\n\nYes! EcoFlow power stations double as UPS systems:\n\n🏆 **Best UPS models:**\n• **DELTA 3 Classic** — 10ms switchover\n• **DELTA 3 Ultra** — whole-home backup with UPS support\n• **DELTA Pro / DELTA Pro 3** — high-power continuity for major loads\n\n10ms means connected devices experience **zero interruption** during a power cut — faster than most dedicated UPS units.\n\nPerfect for: WiFi routers, NAS drives, CCTV, medical devices, and office computers.`,
      type: 'text',
      quickReplies: ['Show DELTA 3 Classic price', 'Show DELTA Pro price', 'I need more capacity'],
    }
  }

  // THANKS / BYE
  if (/thank|thanks|asante|bye|goodbye|done|finished|okay bye|later/.test(msg)) {
    return {
      message: `Thank you so much! 😊 It was a pleasure chatting with you.\n\nRemember, if you have any questions or need help after your purchase, just come back here or WhatsApp us.\n\n*Guarantee your Uptime* ⚡\n**— Amira, Team Batteriq**`,
      type: 'text',
      quickReplies: ['Continue shopping', 'Contact the team'],
    }
  }

  // PRODUCT SEARCH FALLBACK
  const searchResults = findProducts(msg)
  if (searchResults.length > 0 && searchResults.length <= 3) {
    return {
      message: `I found this for "${message}" — let me know if this is what you're looking for! 😊`,
      type: 'products',
      products: searchResults,
      quickReplies: searchResults.map(p => `Tell me about ${p.name}`),
    }
  }
  if (searchResults.length > 3) {
    return {
      message: `I found a few options matching "${message}"! Here are the top ones:`,
      type: 'products',
      products: searchResults.slice(0, 4),
      quickReplies: ['Narrow it down for me', 'Show all results'],
    }
  }

  // FINAL FALLBACK
  return {
    message: `Hmm, I'm not sure I caught that — sorry! 😊 Let me give you some options:\n\nYou can ask me about:\n• 🔋 Any specific product (e.g. "DELTA Pro price")\n• 💡 What's best for your situation\n• 💳 How M-Pesa payment works\n• 🚚 Delivery to your area\n• 🛡️ Warranty information\n\nOr if you'd prefer to talk to a real person, just say "contact" and I'll give you our WhatsApp! 😄`,
    type: 'text',
    quickReplies: ['Show me power stations', 'Solar panel prices', 'Talk to a person', 'How does M-Pesa work?'],
  }
}

// ============================================================
// ROUTE HANDLER
// ============================================================
export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ message: 'Please type a message.', type: 'text', quickReplies: [] })
    }
    const response = getResponse(message.trim(), history as ChatMessage[])
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({
      message: 'Sorry, I had a hiccup. Please try again!',
      type: 'text',
      quickReplies: ['Try again', 'Contact us'],
    })
  }
}
