# CLAUDE.md — Batteriq Codebase Guide

Kenya's authorised EcoFlow & Bluetti e-commerce platform. Next.js 14 App Router, Supabase, M-Pesa STK Push, Gemini AI chat agent, Resend emails. Deployed on Vercel.

---

## Commands

```bash
npm run dev          # dev server (usually starts on :3002 — ports 3000/3001 often occupied)
npm run build        # production build — must pass with 0 TypeScript errors
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no emit, just type errors)
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
```

**Windows cache fix** — if `Cannot find module './XXXX.js'` appears at runtime:
```bash
rm -rf .next
rm -rf node_modules
npm cache clean --force
npm install --legacy-peer-deps
```
Webpack filesystem cache is permanently disabled in `next.config.mjs` (`config.cache = false`) to prevent stale chunk errors on Windows.

---

## Directory Structure

```
Batteriq/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout — fonts, global metadata, LD+JSON schemas, Analytics
│   ├── globals.css               # Tailwind directives + CSS variables + base styles
│   ├── page.tsx                  # Homepage
│   ├── about/page.tsx
│   ├── accessories/page.tsx
│   ├── bluetti/
│   │   ├── page.tsx              # Bluetti brand hub
│   │   └── [slug]/page.tsx       # Individual Bluetti product pages
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── contact/page.tsx
│   ├── ecoflow/
│   │   ├── page.tsx              # EcoFlow brand hub
│   │   └── [slug]/page.tsx       # Individual EcoFlow product pages
│   ├── ecoflow-kenya/page.tsx    # EcoFlow Kenya distributor landing page
│   ├── order-confirmation/[orderId]/page.tsx
│   ├── power-stations/page.tsx
│   ├── solar/page.tsx
│   ├── support/
│   │   ├── page.tsx              # Support hub (3 cards + contact strip)
│   │   ├── faq/page.tsx          # FAQ with accordion + JSON-LD FAQPage schema
│   │   ├── manuals/page.tsx      # Product manuals → ecoflow.com download centre
│   │   └── warranty/page.tsx     # Warranty registration form ('use client')
│   ├── track-order/page.tsx
│   └── api/
│       ├── admin/
│       │   ├── analytics/route.ts
│       │   └── pricing/route.ts
│       ├── ai/
│       │   ├── chat/route.ts     # Rule-based first, then Gemini 1.5 Pro fallback
│       │   └── sessions/route.ts
│       ├── cart/route.ts
│       ├── contact/route.ts
│       ├── mpesa/
│       │   ├── stkpush/route.ts  # Initiates M-Pesa STK Push (rate-limited)
│       │   └── callback/route.ts # Safaricom webhook — updates order payment_status
│       ├── newsletter/route.ts
│       ├── orders/
│       │   ├── route.ts
│       │   ├── [orderId]/route.ts
│       │   └── track/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   └── [slug]/route.ts
│       └── warranty/route.ts     # POST — validates, dedupes serial, emails confirmation
│
├── components/
│   ├── admin/
│   │   ├── Sidebar.tsx           # Admin nav — text logo, 6 nav items including Messages
│   │   └── StatsCard.tsx
│   ├── ai/
│   │   └── GeminiChatWidget.tsx  # Floating chat bubble — present on all pages
│   ├── checkout/
│   │   ├── MpesaWaiting.tsx
│   │   ├── OrderSummary.tsx
│   │   └── PaymentSelector.tsx
│   ├── home/
│   │   ├── BrandAnchor.tsx
│   │   ├── CategoryNav.tsx
│   │   ├── HeroSection.tsx
│   │   ├── HomepageNewsletter.tsx
│   │   └── TrustBanner.tsx
│   ├── layout/
│   │   ├── Header.tsx            # 'use client' — sticky header, 4 mega-menus
│   │   ├── Footer.tsx            # Dark footer — text logo, 4 columns, EcoFlow badge
│   │   ├── MobileNav.tsx         # 'use client' — slide-in drawer
│   │   ├── PageHero.tsx          # Reusable hero section (server component)
│   │   ├── CartBadge.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── NewsletterForm.tsx
│   │   └── SearchBar.tsx
│   ├── product/
│   │   ├── FilteredProductGrid.tsx  # 'use client' — filter tabs + framer-motion grid
│   │   ├── ProductCard.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── DiscountBadge.tsx
│   │   └── SpecBadge.tsx
│   ├── support/
│   │   └── FaqAccordion.tsx      # 'use client' — category tabs + collapsible items
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       └── Toast.tsx
│
├── lib/
│   ├── gemini.ts                 # Google Gemini 1.5 Pro client
│   ├── mpesa.ts                  # Daraja STK Push + env validation
│   ├── resend.ts                 # Email functions: order confirmation, contact, newsletter welcome
│   ├── utils.ts
│   ├── validators.ts             # Zod schemas (stkPushSchema, etc.)
│   └── supabase/
│       ├── types.ts              # Full Database type + convenience types
│       ├── admin.ts              # createAdminClient() — service role, server only
│       ├── server.ts             # createClient() — anon key, server components/route handlers
│       └── client.ts            # createClient() — anon key, browser/client components
│
├── store/
│   ├── cartStore.ts              # Zustand — persisted to localStorage as 'batteriq-cart'
│   └── uiStore.ts                # Zustand — cartOpen, mobileNavOpen, searchOpen, chatOpen
│
├── tests/
│   ├── e2e/homepage.spec.ts      # Playwright
│   └── unit/utils.test.ts        # Vitest
│
├── middleware.ts                 # Auth guard for /admin/* — uses @supabase/ssr
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── .env.example                  # Template — copy to .env.local
└── PROJECT.md                    # Business context, setup guides, roadmap
```

---

## Supabase Client — Which to Use Where

| Context | Import | Function |
|---|---|---|
| Server Components, Route Handlers | `@/lib/supabase/server` | `await createClient()` — anon key |
| Client Components (`'use client'`) | `@/lib/supabase/client` | `createClient()` — anon key |
| Admin actions, bypassing RLS | `@/lib/supabase/admin` | `createAdminClient()` — service role |
| Middleware | `@supabase/ssr` directly | `createServerClient(...)` |

**NEVER** use `@supabase/auth-helpers-nextjs` — it is NOT installed. The installed package is `@supabase/ssr`.

---

## Admin Auth Architecture

The admin section (`/admin/*`) uses a two-layer guard:

1. **`middleware.ts`** — runs at the edge, redirects unauthenticated users to `/admin/login`. Redirects already-logged-in users away from `/admin/login`.
2. **`app/admin/layout.tsx`** — checks auth and renders `<AdminSidebar>` if authenticated. Returns `<>{children}</>` with NO redirect when unauthenticated (middleware already handles that). Never call `redirect()` in the admin layout — doing so creates an infinite loop on the login page.

Admin users require a row in the `admin_users` table. Auth alone is not enough — the layout checks `admin_users` and falls back to `<>{children}</>` if the row is missing.

---

## Page Layout Pattern

There is **no shared layout** that wraps pages with Header/Footer. Every page includes them individually:

```tsx
export default function SomePage() {
  return (
    <>
      <Header />
      <ToastContainer />
      <PageHero ... />
      <section>...</section>
      <Footer />
      <GeminiChatWidget />
    </>
  )
}
```

`Header`, `Footer`, `GeminiChatWidget`, and `ToastContainer` appear on every customer-facing page. Admin pages use the admin layout (`AdminSidebar`) instead.

---

## Tailwind Design Tokens

Custom colors (defined in `tailwind.config.ts`):
```
bq-black      #0a0a0a    — page backgrounds (dark)
bq-white      #FFFFFF
bq-navy       #00004d    — deep navy for gradients
bq-blue       #2563eb    — primary action colour
bq-blue-dim   #1d4ed8    — hover state for bq-blue
bq-blue-light #eff6ff    — light blue tint (hover backgrounds)
bq-gray-900   #0a0a0a
bq-gray-800   #141414
bq-gray-600   #404040
bq-gray-400   #888888
```

Custom utilities:
- `max-w-8xl` → `1440px` (site max width, used as `max-w-8xl mx-auto`)
- `shadow-blue-glow`, `shadow-blue-glow-lg`, `shadow-card-hover`
- `animate-pulse-blue`, `animate-float`, `animate-fade-in`, `animate-slide-up`

Fonts (loaded via `next/font/google` in `app/layout.tsx`):
- `font-sans` → DM Sans (body default)
- `font-display` → Space Grotesk (headings)
- `font-mono` → JetBrains Mono (prices, codes)

---

## PageHero Component

`components/layout/PageHero.tsx` — server component, purely presentational, safe to import in client components.

```tsx
<PageHero
  title="Page Title"
  subtitle="Optional subtitle text"
  breadcrumb={[
    { label: 'Home', href: '/' },
    { label: 'Parent', href: '/parent' },
    { label: 'Current', href: '/current' },
  ]}
  bgGradient="linear-gradient(135deg, #000033 0%, #00004d 60%, #000099 100%)"
  height="small"   // 'full' | 'medium' | 'small'
  align="left"     // 'left' | 'center'
/>
```

---

## Supabase Types

Key types from `lib/supabase/types.ts`:

```ts
// Product categories (complete union — must stay in sync):
category: 'Power Stations' | 'Solar Panels' | 'Accessories' | 'Batteries' | 'Appliances' | 'Solar Home Systems' | 'Power Banks'

// Order payment methods:
payment_method: 'mpesa_now' | 'cod_cash' | 'cod_mpesa'

// Order payment status:
payment_status: 'pending' | 'paid' | 'failed' | 'refunded'

// Order fulfillment status:
fulfillment_status: 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// Admin roles:
role: 'super_admin' | 'staff'
```

Convenience type aliases: `Product`, `Order`, `AiChatSession`, `AdminUser`, `NewsletterSubscriber`, `PriceAuditLog`, `CartItem`, `CheckoutFormData`, `ChatMessage`.

Note: `warranty_registrations` table exists in Supabase but is NOT in `lib/supabase/types.ts` — API routes cast to `any` when inserting.

---

## API Route Patterns

All API routes use `createAdminClient()` (service role) for DB operations. Pattern:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // validate with Zod...
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('table_name') as any).insert({...})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

The `as any` cast is needed for tables not in `Database` type (like `warranty_registrations`, `contact_submissions`).

---

## AI Chat Route

`app/api/ai/chat/route.ts` runs a rule-based function (`getRuleBasedResponse`) FIRST. If it matches (greeting, price queries, M-Pesa, delivery, warranty, etc.), it returns immediately without hitting Gemini. This reduces API costs and latency for common queries.

```ts
const ruleReply = getRuleBasedResponse(message)
if (ruleReply) return NextResponse.json({ reply: ruleReply })
// ... then Gemini 1.5 Pro
```

---

## M-Pesa Flow

1. User submits checkout → `POST /api/mpesa/stkpush` → Safaricom STK Push prompt on user's phone
2. User confirms with PIN → Safaricom sends callback to `POST /api/mpesa/callback`
3. Callback updates `orders.payment_status` to `'paid'` and stores `mpesa_transaction_code`

Rate limit on STK Push: 5 requests per IP per minute (in-memory map, reset to Redis in production).

---

## Zustand Stores

**`useCartStore`** — persisted to `localStorage` as `'batteriq-cart'`:
- `items: CartItem[]`
- `addItem`, `removeItem`, `updateQuantity`, `clearCart`
- `totalItems()`, `subtotal()`

**`useUIStore`** — ephemeral (no persistence):
- `cartOpen`, `mobileNavOpen`, `searchOpen`, `chatOpen`
- `openCart/closeCart/toggleCart`, `openMobileNav/closeMobileNav`, `openSearch/closeSearch`, `openChat/closeChat/toggleChat`

---

## Email (Resend)

Functions in `lib/resend.ts`:
- `sendOrderConfirmationEmail(order)` — triggered on successful payment
- `sendContactEmail({firstName, lastName, email, ...})` — notifies team + auto-reply to customer
- `sendNewsletterWelcomeEmail(email, name?)` — on newsletter subscription

Warranty confirmation email is inline in `app/api/warranty/route.ts` (not in `lib/resend.ts`).

All email sends are fire-and-forget — wrapped in `.catch()` so email failure never breaks the primary request.

`RESEND_FROM_EMAIL` must be a verified sender domain in Resend. Currently `orders@batteriq.com`.

---

## Header Navigation

`components/layout/Header.tsx` — `'use client'`, fixed top, `z-50`.

Four mega-menus: `'power-stations'` | `'solar-panels'` | `'accessories'` | `'support'`

Support dropdown links:
- `/support` — Support Hub
- `/support/faq` — FAQ
- `/support/manuals` — Product Manuals
- `/support/warranty` — Warranty Registration
- `/track-order` — Track My Order
- `/contact` — Contact Us

Power Stations mega-menu has three columns: DELTA Series, RIVER Series, SYSTEMS + BLUETTI. Bottom of third column has "All Power Stations →" (`/power-stations`) and "EcoFlow Kenya Hub →" (`/ecoflow-kenya`).

---

## Known Gotchas

- **No `/logo.png` file exists** — do not reference it anywhere. All logo appearances use the text pattern: `BATTERIQ` + superscript `™`. The admin login, sidebar, footer, and mobile nav all use text logos.
- **`@supabase/auth-helpers-nextjs` is NOT installed** — never use `createRouteHandlerClient`, `createServerComponentClient`, etc.
- **Admin layout must NOT call `redirect()`** — that causes an infinite loop on the login page. Middleware handles all redirects.
- **Webpack cache disabled** — `config.cache = false` in `next.config.mjs`. This is intentional and permanent on this Windows dev machine.
- **`as any` casts on unlisted tables** — tables not defined in `Database` type need `(supabase.from('table') as any)` to satisfy TypeScript. Acceptable pattern.
- **Port offset** — dev server often starts on `:3002` because `:3000` and `:3001` are occupied.

---

## Environment Variables

Defined in `.env.example`. Copy to `.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server only, never expose |
| `MPESA_CONSUMER_KEY` | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja app consumer secret |
| `MPESA_BUSINESS_SHORTCODE` | M-Pesa shortcode |
| `MPESA_PASSKEY` | Daraja STK Push passkey |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` |
| `MPESA_CALLBACK_URL` | Public HTTPS URL for M-Pesa callback |
| `GEMINI_API_KEY` | Google AI Studio key |
| `RESEND_API_KEY` | Resend transactional email key |
| `RESEND_FROM_EMAIL` | Verified sender (e.g. `orders@batteriq.com`) |
| `NEXT_PUBLIC_SITE_URL` | `https://batteriq.com` |
| `NEXT_PUBLIC_SITE_NAME` | `Batteriq` |
| `ADMIN_EMAIL` | Admin login email |

---

## Vercel Deployment

`vercel.json` sets extended function timeouts:
- `api/mpesa/callback` → 30s
- `api/ai/chat` → 60s
- `api/mpesa/stkpush` → 30s

Regions: `fra1`, `iad1`. `www.batteriq.com` redirects to apex domain via `next.config.mjs`.

---

## Supabase Tables (Summary)

| Table | Key columns |
|---|---|
| `products` | id, sku, brand, category, name, slug, price_kes, in_stock, featured |
| `orders` | id, order_number, items (JSON), total_kes, payment_method, payment_status, fulfillment_status |
| `ai_chat_sessions` | id, session_token, messages (JSON) |
| `admin_users` | id (= auth.users.id), role, name |
| `newsletter_subscribers` | id, email, name |
| `price_audit_log` | id, product_id, old_price, new_price, changed_by |
| `contact_submissions` | id, first_name, last_name, email, message, status |
| `warranty_registrations` | registration_number, serial_number, product_name, warranty_end, etc. |

---

## Complete Route Map

```
/                           Homepage
/power-stations             All power stations grid
/solar                      Solar panels grid
/accessories                Accessories grid
/ecoflow                    EcoFlow brand hub
/ecoflow/[slug]             EcoFlow product detail
/ecoflow-kenya              EcoFlow Kenya distributor page
/bluetti                    Bluetti brand hub
/bluetti/[slug]             Bluetti product detail
/cart                       Cart page
/checkout                   Checkout + M-Pesa STK Push
/order-confirmation/[id]    4-step order status tracker
/track-order                Track by order number + email
/contact                    Contact form
/about                      About Batteriq
/support                    Support hub (FAQ / Manuals / Warranty cards)
/support/faq                FAQ accordion — 6 categories
/support/manuals            Product manual links → ecoflow.com
/support/warranty           Warranty registration form
/admin                      Admin dashboard
/admin/login                Admin login (text logo, show/hide password)
/admin/products             Product management
/admin/orders               Order management
/admin/pricing              Pricing engine
/admin/ai-chat              AI chat monitor
/admin/messages             Contact messages
```
