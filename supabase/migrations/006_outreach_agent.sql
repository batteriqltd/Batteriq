-- ============================================================================
-- BATTERIQ — Migration 006: Outreach Agent (Leads, Campaigns, WhatsApp, DPA Compliance, Voice Stub)
-- Safe to run multiple times (idempotent) in Supabase SQL Editor.
-- Complies with Kenya Data Protection Act 2019: permanent opt-out suppression & immutable consent records.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure updated_at trigger helper exists (allows running standalone on a brand-new 2nd Supabase project!)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 0. OPTIONAL: EXTEND admin_users ROLE CONSTRAINT (SKIPPED ON STANDALONE 2ND SUPABASE) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_users'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check'
    ) THEN
      ALTER TABLE public.admin_users DROP CONSTRAINT admin_users_role_check;
    END IF;

    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (role IN ('super_admin', 'staff', 'outreach_admin'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 1. OPTIONAL: EXTEND contact_submissions IF PRESENT (SKIPPED ON STANDALONE 2ND SUPABASE) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contact_submissions'
  ) THEN
    ALTER TABLE public.contact_submissions
      ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS consent_text TEXT,
      ADD COLUMN IF NOT EXISTS human_contacted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS whatsapp_followup_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── 2. OUTREACH SETTINGS (SINGLETON ROW id = 'default') ──────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_settings (
  id                          TEXT PRIMARY KEY DEFAULT 'default',
  campaign_paused             BOOLEAN NOT NULL DEFAULT false,
  review_before_send          BOOLEAN NOT NULL DEFAULT false,
  daily_email_limit           INTEGER NOT NULL DEFAULT 50 CHECK (daily_email_limit >= 1 AND daily_email_limit <= 500),
  sender_name                 TEXT NOT NULL DEFAULT 'Batteriq Kenya Business Solutions',
  sender_email                TEXT NOT NULL DEFAULT 'sales@batteriq.com',
  reply_to_email              TEXT NOT NULL DEFAULT 'sale@batteriq.com',
  target_categories           TEXT[] NOT NULL DEFAULT ARRAY['hotels', 'schools', 'organizations', 'shops'],
  target_cities               TEXT[] NOT NULL DEFAULT ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Naivasha', 'Nanyuki', 'Malindi', 'Machakos'],
  discovery_cursor            INTEGER NOT NULL DEFAULT 0,
  followup_days               INTEGER NOT NULL DEFAULT 7 CHECK (followup_days >= 1 AND followup_days <= 90),
  whatsapp_followup_template  TEXT NOT NULL DEFAULT 'batteriq_inquiry_followup',
  whatsapp_default_template   TEXT NOT NULL DEFAULT 'batteriq_business_reply',
  calling_enabled             BOOLEAN NOT NULL DEFAULT false,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.outreach_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ── 3. OUTREACH LEADS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_leads (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name             TEXT NOT NULL,
  category                  TEXT NOT NULL DEFAULT 'other'
                            CHECK (category IN ('hotel', 'school', 'organization', 'shop', 'website_inquiry', 'other')),
  city                      TEXT,
  address                   TEXT,
  website_url               TEXT,
  domain                    TEXT,
  google_place_id           TEXT UNIQUE,
  email                     TEXT,
  phone_e164                TEXT,
  source                    TEXT NOT NULL
                            CHECK (source IN ('google_places', 'website_form', 'whatsapp_inbound', 'manual')),
  source_details            JSONB NOT NULL DEFAULT '{}',
  status                    TEXT NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'contacted', 'replied', 'interested', 'hot', 'customer', 'opted_out')),
  rating                    NUMERIC(3,2),
  business_summary          TEXT,
  whatsapp_opted_in         BOOLEAN NOT NULL DEFAULT false,
  whatsapp_last_inbound_at  TIMESTAMPTZ,
  human_contacted_at        TIMESTAMPTZ,
  followup_sent_at          TIMESTAMPTZ,
  last_emailed_at           TIMESTAMPTZ,
  email_count               INTEGER NOT NULL DEFAULT 0,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_leads_status ON public.outreach_leads (status);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON public.outreach_leads (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_outreach_leads_phone ON public.outreach_leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_domain ON public.outreach_leads (LOWER(domain));
CREATE INDEX IF NOT EXISTS idx_outreach_leads_source ON public.outreach_leads (source);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_created_at ON public.outreach_leads (created_at DESC);

-- ── 4. PERMANENT SUPPRESSION LIST (KENYA DPA 2019 OPT-OUT REGISTRY) ──────────
CREATE TABLE IF NOT EXISTS public.outreach_suppression_list (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE,
  phone_e164      TEXT UNIQUE,
  domain          TEXT,
  reason          TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'all'
                  CHECK (channel IN ('email', 'whatsapp', 'voice', 'all')),
  source_ip_hash  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT suppression_has_identifier CHECK (
    email IS NOT NULL OR phone_e164 IS NOT NULL OR domain IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_outreach_suppression_email ON public.outreach_suppression_list (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_outreach_suppression_phone ON public.outreach_suppression_list (phone_e164);
CREATE INDEX IF NOT EXISTS idx_outreach_suppression_domain ON public.outreach_suppression_list (LOWER(domain));

-- ── 5. IMMUTABLE CONSENT & OPT-OUT AUDIT RECORDS (KENYA DPA 2019) ────────────
CREATE TABLE IF NOT EXISTS public.outreach_consent_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 UUID REFERENCES public.outreach_leads(id) ON DELETE SET NULL,
  contact_submission_id   UUID,
  email                   TEXT,
  phone_e164              TEXT,
  channel                 TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'voice', 'all')),
  action                  TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out', 'legitimate_interest_b2b')),
  legal_basis             TEXT NOT NULL,
  consent_text            TEXT,
  source                  TEXT NOT NULL,
  metadata                JSONB NOT NULL DEFAULT '{}',
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_consent_lead_id ON public.outreach_consent_records (lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_consent_email ON public.outreach_consent_records (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_outreach_consent_phone ON public.outreach_consent_records (phone_e164);

-- ── 6. OUTREACH EMAILS (CAMPAIGN DRAFTS, REVIEW QUEUE & SENT LOG) ────────────
CREATE TABLE IF NOT EXISTS public.outreach_emails (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  to_email            TEXT NOT NULL,
  from_identity       TEXT NOT NULL,
  reply_to            TEXT,
  subject             TEXT NOT NULL,
  body_html           TEXT NOT NULL,
  body_text           TEXT NOT NULL,
  unsubscribe_token   TEXT UNIQUE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('pending_review', 'approved', 'queued', 'sent', 'failed', 'suppressed', 'rejected')),
  resend_message_id   TEXT,
  claude_model        TEXT,
  error_message       TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  unsubscribed_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON public.outreach_emails (status);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_sent_at ON public.outreach_emails (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_lead_id ON public.outreach_emails (lead_id);

-- ── 7. WHATSAPP CONVERSATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID REFERENCES public.outreach_leads(id) ON DELETE SET NULL,
  phone_e164            TEXT UNIQUE NOT NULL,
  contact_name          TEXT,
  mode                  TEXT NOT NULL DEFAULT 'ai'
                        CHECK (mode IN ('ai', 'human')),
  unread_count          INTEGER NOT NULL DEFAULT 0,
  last_inbound_at       TIMESTAMPTZ,
  last_outbound_at      TIMESTAMPTZ,
  last_message_preview  TEXT,
  opted_in              BOOLEAN NOT NULL DEFAULT false,
  escalated_reason      TEXT,
  escalated_at          TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'pending_human', 'closed', 'opted_out')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_conversations_updated_at ON public.outreach_conversations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_conversations_status ON public.outreach_conversations (status);

-- ── 8. WHATSAPP MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.outreach_conversations(id) ON DELETE CASCADE,
  lead_id           UUID REFERENCES public.outreach_leads(id) ON DELETE SET NULL,
  direction         TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('lead', 'ai', 'human', 'system_template')),
  message_type      TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'interactive', 'unsupported')),
  body              TEXT NOT NULL,
  template_name     TEXT,
  wa_message_id     TEXT UNIQUE,
  delivery_status   TEXT NOT NULL DEFAULT 'sent'
                    CHECK (delivery_status IN ('received', 'queued', 'sent', 'delivered', 'read', 'failed')),
  ai_metadata       JSONB NOT NULL DEFAULT '{}',
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_messages_conversation ON public.outreach_messages (conversation_id, created_at ASC);

-- ── 9. VOICE CALLING LOGS (PHASE 2 STUB — AFRICA'S TALKING VOICE) ────────────
CREATE TABLE IF NOT EXISTS public.outreach_call_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  phone_e164            TEXT NOT NULL,
  eligibility_reason    TEXT NOT NULL CHECK (eligibility_reason IN ('lead_replied', 'requested_contact')),
  ai_disclosure_script  TEXT NOT NULL,
  provider              TEXT NOT NULL DEFAULT 'africas_talking_stub',
  status                TEXT NOT NULL DEFAULT 'stub_queued'
                        CHECK (status IN ('stub_queued', 'initiated', 'completed', 'failed', 'blocked')),
  provider_session_id   TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_call_logs_created_at ON public.outreach_call_logs (created_at DESC);

-- ── 10. OPERATIONAL & ERROR LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      TEXT NOT NULL
              CHECK (module IN ('lead_finder', 'email_campaign', 'whatsapp', 'ai_takeover', 'followups', 'calling', 'compliance')),
  level       TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event       TEXT NOT NULL,
  message     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_created_at ON public.outreach_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_level ON public.outreach_logs (level);

-- ── 11. TRIGGERS FOR updated_at ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_outreach_leads_updated_at ON public.outreach_leads;
CREATE TRIGGER update_outreach_leads_updated_at
  BEFORE UPDATE ON public.outreach_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_outreach_conversations_updated_at ON public.outreach_conversations;
CREATE TRIGGER update_outreach_conversations_updated_at
  BEFORE UPDATE ON public.outreach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_outreach_settings_updated_at ON public.outreach_settings;
CREATE TRIGGER update_outreach_settings_updated_at
  BEFORE UPDATE ON public.outreach_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 12. ROW LEVEL SECURITY (SERVICE ROLE ONLY) ───────────────────────────────
ALTER TABLE public.outreach_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'outreach_settings',
    'outreach_leads',
    'outreach_suppression_list',
    'outreach_consent_records',
    'outreach_emails',
    'outreach_conversations',
    'outreach_messages',
    'outreach_call_logs',
    'outreach_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages %I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Service role manages %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;
