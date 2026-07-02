-- ============================================================================
--  BATTERIQ — Newsletter + Live Visitors database setup
--  Run this ENTIRE script once in:  Supabase → SQL Editor → New query → Run
--  It is safe to run multiple times (idempotent — nothing is dropped/deleted).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) NEWSLETTER SUBSCRIBERS
--    Every person who subscribes on batteriq.com lands here.
--    Admin → Newsletter shows this list.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT,
  status     TEXT        NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already existed from before, make sure the columns exist:
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS status     TEXT        NOT NULL DEFAULT 'active';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- ----------------------------------------------------------------------------
-- 2) NEWSLETTER BROADCAST HISTORY
--    Each time you email subscribers about new products, a row is saved here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  subject     TEXT        NOT NULL,
  intro_text  TEXT,
  product_ids UUID[],
  sent_count  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- 3) LIVE VISITOR SESSIONS
--    One row per active browser session. Updated every ~15s while a visitor is
--    on the site. Admin → Live Visitors shows rows seen in the last 60 seconds.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitor_sessions (
  visitor_id TEXT        PRIMARY KEY,
  page       TEXT,
  page_label TEXT,
  device     TEXT,
  referrer   TEXT,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen
  ON visitor_sessions (last_seen DESC);


-- ----------------------------------------------------------------------------
-- 4) SECURITY (Row Level Security)
--    All reads/writes go through Batteriq's own server API routes using the
--    Supabase SERVICE-ROLE key, which bypasses RLS. Turning RLS on with NO
--    public policies means nobody can read or write these tables directly from
--    a browser — only your server can. This is the secure default.
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 5) PUSH SUBSCRIPTIONS (Web Push / PWA notifications)
--    One row per admin device that has enabled notifications. The server sends
--    Web Push messages to every row here when an order, payment, or customer
--    message arrives. `endpoint` is unique so re-enabling on the same device
--    just refreshes the existing row instead of duplicating it.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id     TEXT,
  endpoint          TEXT        NOT NULL UNIQUE,
  subscription_json JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already existed, make sure the columns exist:
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS admin_user_id     TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint          TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS subscription_json JSONB;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- ----------------------------------------------------------------------------
-- 6) MANUAL INVOICES (invoices created in Admin -> Create Invoice)
--    Optional history/tracking. The invoice PDF + email still work without it,
--    but running this lets "Recent Invoices" list what has been generated.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_invoices (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT        NOT NULL UNIQUE,
  customer_name  TEXT        NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items          JSONB       NOT NULL DEFAULT '[]',
  subtotal_kes   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_kes      NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT        NOT NULL DEFAULT 'pending',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- SECURITY (Row Level Security)
-- ----------------------------------------------------------------------------
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_broadcasts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_invoices        ENABLE ROW LEVEL SECURITY;

-- Done. You should now be able to:
--   • Subscribe on the site  → appears in Admin → Newsletter → Subscribers
--   • See people live         → Admin → Live Visitors
--   • Enable notifications    → Admin top bar → get push alerts on your phone
