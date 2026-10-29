-- =============================================================================
-- Migration 007: Autonomous 30-Minute Multi-Sector Autopilot & KES Proforma Engine
-- =============================================================================
-- Target: 2nd Supabase Project (Outreach Agent Database)
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- 1. Add Autopilot & Proforma columns to outreach_settings
ALTER TABLE public.outreach_settings
  ADD COLUMN IF NOT EXISTS auto_attach_proforma       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_enabled          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (autopilot_interval_minutes >= 5 AND autopilot_interval_minutes <= 1440),
  ADD COLUMN IF NOT EXISTS auto_cold_whatsapp         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_cold_template     TEXT NOT NULL DEFAULT 'batteriq_quote_ready',
  ADD COLUMN IF NOT EXISTS last_autopilot_at          TIMESTAMPTZ;

-- Upgrade default target_categories to cover ALL Kenyan sectors (Schools, NGOs, Parastatals .go.ke, Retail & Baby Shops, Hospitals, Hotels, Orgs)
UPDATE public.outreach_settings
SET target_categories = ARRAY[
  'schools & universities',
  'ngos & foundations',
  'government parastatals',
  'retail & baby shops',
  'hospitals & clinics',
  'hotels & lodges',
  'organizations & saccos'
]
WHERE id = 'default'
  AND target_categories = ARRAY['hotels', 'schools', 'organizations', 'shops'];

-- 2. Expand outreach_leads.category CHECK constraint for all Kenyan sectors
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'outreach_leads'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.outreach_leads DROP CONSTRAINT IF EXISTS %I;', con_name);
  END LOOP;
END $$;

ALTER TABLE public.outreach_leads
  ADD CONSTRAINT outreach_leads_category_check
  CHECK (
    category IN (
      'hotel',
      'school',
      'ngo',
      'government',
      'hospital',
      'retail',
      'organization',
      'shop',
      'website_inquiry',
      'other'
    )
  );

-- 3. Expand outreach_logs.module CHECK constraint to include autopilot & proforma
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'outreach_logs'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%module%'
  LOOP
    EXECUTE format('ALTER TABLE public.outreach_logs DROP CONSTRAINT IF EXISTS %I;', con_name);
  END LOOP;
END $$;

ALTER TABLE public.outreach_logs
  ADD CONSTRAINT outreach_logs_module_check
  CHECK (
    module IN (
      'lead_finder',
      'email_campaign',
      'whatsapp',
      'ai_takeover',
      'followups',
      'calling',
      'compliance',
      'autopilot',
      'proforma'
    )
  );

-- 4. Add Proforma Invoice tracking columns to outreach_emails
ALTER TABLE public.outreach_emails
  ADD COLUMN IF NOT EXISTS proforma_number    TEXT,
  ADD COLUMN IF NOT EXISTS proforma_total_kes NUMERIC(12,2);
