# BATTERIQ — Kenya's #1 EcoFlow & Bluetti Power Solutions Platform

> "Guarantee your Uptime."

## Project Overview

Batteriq is Kenya's authorised distributor for EcoFlow and Bluetti power stations, solar panels, and energy accessories. This platform is a production-grade e-commerce web application built on Next.js 14 (App Router) with Supabase, M-Pesa Daraja STK Push payments, and a Gemini-powered AI sales agent.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 with custom design tokens |
| State Management | Zustand (cart, auth, UI) |
| Backend / API | Next.js Route Handlers (`/app/api/`) |
| Database | Supabase (PostgreSQL) — Supabase JS SDK v2 |
| Auth | Supabase Auth — email/password + Google OAuth |
| File Storage | Supabase Storage (product images) |
| Payments | Safaricom Daraja M-Pesa API (STK Push + Callback) |
| AI Sales Agent | Google Gemini 1.5 Pro via `@google/generative-ai` |
| Email | Resend (transactional) |
| Deployment | Vercel (edge config, `vercel.json`) |
| Analytics | Vercel Analytics + Speed Insights |
| Image Optimization | Next.js `<Image />` — WebP/AVIF, lazy loading |
| Icons | Lucide React |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Playwright |

---

## Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js 14 App Router                   │   │
│  │                                                      │   │
│  │  /app/page.tsx (Homepage - SSG)                      │   │
│  │  /app/(store)/[brand]/[slug]/page.tsx (SSG)          │   │
│  │  /app/cart /checkout /order-confirmation             │   │
│  │  /app/admin/* (Server Components + Auth Guard)       │   │
│  │                                                      │   │
│  │  /app/api/products          → Supabase DB            │   │
│  │  /app/api/orders            → Supabase DB            │   │
│  │  /app/api/mpesa/stkpush     → Safaricom Daraja       │   │
│  │  /app/api/mpesa/callback    ← Safaricom webhook      │   │
│  │  /app/api/ai/chat           → Google Gemini          │   │
│  │  /app/api/newsletter        → Supabase DB            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    Supabase              Safaricom             Google
   PostgreSQL              Daraja              Gemini AI
   Auth/Storage           M-Pesa               1.5 Pro
   Realtime              STK Push
```

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account (free tier works)
- Safaricom Developer account (for M-Pesa sandbox)
- Google AI Studio account (for Gemini API key)
- Resend account (free tier works)
- Vercel account (for deployment)

### Step 1 — Clone & Install
```bash
cd batteriq
npm install
```

### Step 2 — Environment Variables
```bash
cp .env.example .env.local
# Fill in all values — see Environment Variables section below
```

### Step 3 — Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and anon key into `.env.local`
3. Copy your service role key into `.env.local`
4. Run migrations (see Database Migration Instructions below)

### Step 4 — Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

### Step 5 — Run Tests
```bash
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E tests
```

---

## Environment Variables

All variables must be present. Server-side only variables must NEVER be prefixed with `NEXT_PUBLIC_`.

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | Yes |
| `MPESA_CONSUMER_KEY` | Daraja app consumer key | Yes |
| `MPESA_CONSUMER_SECRET` | Daraja app consumer secret | Yes |
| `MPESA_BUSINESS_SHORTCODE` | M-Pesa business short code (till/paybill) | Yes |
| `MPESA_PASSKEY` | Daraja STK push passkey | Yes |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | Yes |
| `MPESA_CALLBACK_URL` | Public URL for M-Pesa callbacks | Yes |
| `GEMINI_API_KEY` | Google AI Studio API key | Yes |
| `RESEND_API_KEY` | Resend transactional email API key | Yes |
| `RESEND_FROM_EMAIL` | Verified sender email (e.g. orders@batteriq.com) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Full site URL (https://batteriq.com) | Yes |
| `NEXT_PUBLIC_SITE_NAME` | Site name (Batteriq) | Yes |
| `ADMIN_EMAIL` | Admin account email | Yes |

---

## Database Migration Instructions

### Running Migrations via Supabase Dashboard
1. Go to your Supabase project → SQL Editor
2. Run `supabase/migrations/001_initial.sql` first (schema + RLS)
3. Run `supabase/migrations/002_seed_ecoflow.sql` (EcoFlow products)
4. Run `supabase/migrations/003_seed_bluetti.sql` (Bluetti products)

### Running via Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## Supabase Setup Guide

1. Create project at https://supabase.com/dashboard
2. Note: Project URL, Anon Key, Service Role Key (Settings → API)
3. Enable Google OAuth: Authentication → Providers → Google → enable
4. Create storage bucket named `product-images` (public read)
5. Run all SQL migrations in order

---

## M-Pesa Daraja Setup Guide

### Sandbox (Testing)
1. Register at https://developer.safaricom.co.ke
2. Create an app → note Consumer Key and Consumer Secret
3. Use test credentials:
   - Shortcode: 174379
   - Passkey: from Daraja portal
   - Test phone: 254708374149
4. Use ngrok to expose localhost for callback: `ngrok http 3000`
5. Set `MPESA_CALLBACK_URL=https://YOUR_NGROK_URL/api/mpesa/callback`

### Production
1. Apply for go-live at Safaricom Developer Portal
2. Complete KYC and compliance steps
3. Get production Consumer Key, Secret, Shortcode, Passkey
4. Set `MPESA_ENVIRONMENT=production`

---

## Gemini API Setup Guide

1. Go to https://aistudio.google.com
2. Create API key
3. Set `GEMINI_API_KEY=your_key_here`
4. Model used: `gemini-1.5-pro`

---

## Vercel Deployment Guide

1. Push code to GitHub
2. Go to https://vercel.com/new → import repository
3. Framework: Next.js (auto-detected)
4. Add all environment variables in Vercel dashboard
5. Deploy
6. Set up custom domain: batteriq.com
7. Add `www.batteriq.com` redirect to apex domain

---

## Admin Account Creation

1. Go to https://batteriq.com/admin/login
2. Sign up with your admin email
3. In Supabase SQL Editor, run:
```sql
INSERT INTO admin_users (id, role, name)
SELECT id, 'super_admin', 'Admin Name'
FROM auth.users
WHERE email = 'admin@batteriq.com';
```

---

## Known Limitations & Future Roadmap

### Current Limitations
- M-Pesa sandbox only supports specific test phone numbers
- Product images are placeholder URLs — replace with actual product photos in Supabase Storage
- Gemini AI chat does not persist across browser sessions without login

### Future Roadmap
- WhatsApp Business API integration for order notifications
- Loyalty/rewards program
- Multi-currency support (USD for exports)
- EcoFlow API integration for real-time stock sync
- Review and ratings system
- Blog/content section for SEO
- Affiliate partner portal
- Kenya-wide delivery tracking integration (Sendy, Fargo)
