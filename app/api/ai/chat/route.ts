import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getRuleBasedResponse(message: string): string | null {
  const m = message.toLowerCase().trim()

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy|hiya|sup)\b/.test(m)) {
    return "Hi there! 👋 I'm the Batteriq AI assistant. I can help you find the right EcoFlow or Bluetti power station, answer questions about M-Pesa payment, delivery, or warranty. What are you looking for today?"
  }

  if (/delta pro\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'The EcoFlow DELTA Pro (3600Wh, 3600W) is KES 291,399, and the DELTA Pro 3 (4096Wh, 4000W) is KES 461,799. Both include the official 24-month EcoFlow warranty. Would you like more specs or to add one to your cart?'
  }

  if (/delta 2\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'The EcoFlow DELTA 2 (1024Wh, 1800W) starts from KES 85,539, and the DELTA 2 Max (2048Wh, 2400W) is KES 157,799. Both support fast solar charging. Want me to compare them for you?'
  }

  if (/river\b/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'EcoFlow RIVER 2 starts from KES 27,259 — perfect for laptops, phones, and small appliances. The RIVER 2 Pro (768Wh) is KES 59,049. Great for camping or as a laptop power bank. Want the full RIVER range?'
  }

  if (/mpesa|m-pesa|mpesa|pay|payment|checkout/.test(m)) {
    return 'Yes! Batteriq supports instant M-Pesa STK Push checkout. At checkout, enter your Safaricom number and you\'ll receive a payment prompt on your phone — confirm with your PIN and payment is instant. We also offer Cash on Delivery and M-Pesa on Delivery.'
  }

  if (/deliver|shipping|nairobi|ship|how long/.test(m)) {
    return 'We offer same-day and next-day delivery within Nairobi for orders placed before 12pm. Nationwide shipping across Kenya typically takes 2–5 business days. Delivery is FREE on orders over KES 50,000.'
  }

  if (/warranty|guarantee|genuine|fake|original/.test(m)) {
    return 'All EcoFlow products from Batteriq come with the official manufacturer warranty — 24 months for power stations and 12 months for accessories. Batteriq is EcoFlow\'s authorised distributor in Kenya, so every product is 100% genuine.'
  }

  if (/solar panel|solar/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'EcoFlow solar panels start from KES 7,599 for the 45W portable panel, up to KES 71,240 for the 400W portable panel. All panels are IP68 waterproof and compatible with any EcoFlow power station. Want a recommendation based on your power needs?'
  }

  if (/bluetti/.test(m) && /price|cost|how much|bei/.test(m)) {
    return 'Bluetti AC180P (1440Wh, 1800W) is KES 76,000, and the AC200PL (2304Wh, 2400W) is KES 127,500. Great alternatives to EcoFlow for home backup. Want a comparison with EcoFlow models?'
  }

  if (/recommend|best|which one|suggest|advise|help me choose/.test(m)) {
    return 'Happy to help! Could you tell me: (1) what you want to power (fridge, TV, laptop?), (2) how many hours of backup you need, and (3) your rough budget? That way I can recommend the perfect power station for you.'
  }

  if (/contact|whatsapp|call|phone|reach you/.test(m)) {
    return 'You can reach the Batteriq team via WhatsApp (0716822014), email (info@batteriq.com), or our contact page at batteriq.com/contact. We typically respond within a few hours during business hours (Mon–Sat, 8am–6pm EAT).'
  }

  if (/track|order status|where is my order/.test(m)) {
    return 'You can track your order at batteriq.com/track-order — just enter your order number and email address. If you need urgent help, WhatsApp us directly and we\'ll check your order status immediately.'
  }

  return null
}

export async function POST(req: Request) {
  try {
    const { message, sessionHistory } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ reply: 'Please type a message.' }, { status: 400 })
    }

    const ruleReply = getRuleBasedResponse(message)
    if (ruleReply) {
      return NextResponse.json({ reply: ruleReply })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    let productContext = ''
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('products')
        .select('name, brand, price_kes, specs, in_stock')
        .eq('in_stock', true)
        .limit(30)

      if (data) {
        productContext = data
          .map((p) => `${p.brand} ${p.name}: KES ${p.price_kes} | ${JSON.stringify(p.specs)}`)
          .join('\n')
      }
    } catch {
      productContext = 'Product catalog temporarily unavailable.'
    }

    const chat = model.startChat({
      history: (sessionHistory || []).slice(-10),
      generationConfig: { maxOutputTokens: 400 },
    })

    const systemMessage = `You are Batteriq AI, an energy solutions expert for Batteriq Kenya.
Be helpful, concise, and conversational. Max 3 sentences per reply unless asked for details.
Current inventory:\n${productContext}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await Promise.race([
      chat.sendMessage(`${systemMessage}\n\nCustomer: ${message}`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 12000)
      ),
    ])

    const reply = result.response.text()

    return NextResponse.json({ reply: reply || "I didn't catch that — please try again." })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    console.error('Gemini error:', msg)

    if (msg.includes('timeout') || (error instanceof Error && error.name === 'AbortError')) {
      return NextResponse.json({
        reply: "I'm taking too long to respond — please try again in a moment.",
      })
    }

    return NextResponse.json({
      reply: 'I had a hiccup. Try asking again or WhatsApp us directly for help.',
    })
  }
}
