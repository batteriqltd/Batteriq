import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Product } from './supabase/types'

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
}

function buildSystemPrompt(products: Product[]): string {
  const catalog = products
    .filter((p) => p.in_stock)
    .map(
      (p) =>
        `- ${p.name} (${p.brand}, ${p.category}): KES ${p.price_kes.toLocaleString()}. Specs: ${JSON.stringify(p.specs)}`
    )
    .join('\n')

  return `You are "Batteriq AI", an expert energy solutions consultant and sales agent for Batteriq Kenya — the authorised EcoFlow and Bluetti dealer in Kenya. Your tagline is "Guarantee your Uptime."

Your role is to help customers find the perfect power backup or solar solution, answer technical questions, compare products, and guide them to purchase.

CURRENT PRODUCT CATALOG (prices in KES, all in stock):
${catalog}

GUIDELINES:
- Be conversational, expert, and solution-focused
- Always recommend products by name with prices in KES
- When comparing products, create clear bullet-point comparisons
- For home backup questions, ask: how many hours of backup, which appliances, budget
- For solar questions, ask: location, roof type, power consumption
- When a customer is ready to buy, ask for their name, phone number, and delivery address
- After collecting phone number, confirm you will initiate M-Pesa STK Push
- Format prices with comma separators (e.g. KES 85,539)
- Never make up products or prices not in the catalog above
- Keep responses concise but complete — no walls of text
- Use light markdown (bold for product names, bullet points for specs/comparisons)`
}

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

export async function streamGeminiResponse({
  message,
  history,
  products,
}: {
  message: string
  history: GeminiMessage[]
  products: Product[]
}): Promise<ReadableStream<Uint8Array>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(products),
  })

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  })

  const result = await chat.sendMessageStream(message)

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()
    },
  })
}

export async function getGeminiResponse({
  message,
  history,
  products,
}: {
  message: string
  history: GeminiMessage[]
  products: Product[]
}): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(products),
  })

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  })

  const result = await chat.sendMessage(message)
  return result.response.text()
}
