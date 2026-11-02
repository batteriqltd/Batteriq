import type { MetadataRoute } from 'next'

const PRIVATE_PATHS = ['/admin/', '/outreach-admin/', '/api/', '/cart', '/checkout', '/order-confirmation/']

// AEO: answer engines only cite pages their crawlers may read. `*` already
// allows them, but naming each bot explicitly makes the intent unambiguous and
// survives any future tightening of the default rule.
const ANSWER_ENGINE_BOTS = [
  'GPTBot', // OpenAI training
  'OAI-SearchBot', // ChatGPT search
  'ChatGPT-User', // ChatGPT browsing on a user's behalf
  'ClaudeBot', // Anthropic
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot', // Perplexity
  'Perplexity-User',
  'Google-Extended', // Gemini / AI Overviews grounding
  'Applebot', // Siri / Spotlight
  'Applebot-Extended', // Apple Intelligence
  'Bingbot', // Bing + Microsoft Copilot
  'DuckAssistBot', // DuckDuckGo AI answers
  'meta-externalagent', // Meta AI
  'Amazonbot', // Alexa
  'CCBot', // Common Crawl (feeds many models)
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: ANSWER_ENGINE_BOTS, allow: ['/', '/llms.txt'], disallow: PRIVATE_PATHS },
    ],
    sitemap: 'https://batteriq.com/sitemap.xml',
    host: 'https://batteriq.com',
  }
}
