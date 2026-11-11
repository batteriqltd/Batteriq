-- =============================================================================
-- Migration 008: Voice Calling — Agent Presence, Calls, Call Events
-- =============================================================================
-- Target: 2nd Supabase Project (Outreach Agent Database)
-- Safe to run multiple times (idempotent).
--
-- This is infrastructure for the WebRTC-based call center (outbound dialer +
-- inbound ring group via Africa's Talking). It does NOT touch the existing
-- outreach_call_logs table, which belongs to the separate AI-outbound-call
-- stub (lib/outreach/calling-stub.ts) — these are two different systems:
-- outreach_call_logs is for future AI-initiated calls, outreach_calls below
-- is for real human-operated WebRTC calls (inbound ring group + outbound
-- dialer).
-- =============================================================================

-- ── 1. AGENT PRESENCE ─────────────────────────────────────────────────────
-- One row per admin user. Only 'available' agents get rung on an inbound call.
CREATE TABLE IF NOT EXISTS public.agent_presence (
  admin_user_id   UUID PRIMARY KEY REFERENCES public.admin_users(id) ON DELETE CASCADE,
  admin_email     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('available', 'busy', 'away', 'offline')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. CALLS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_calls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction            TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number          TEXT,
  to_number            TEXT,
  status               TEXT NOT NULL DEFAULT 'ringing'
                       CHECK (status IN ('ringing', 'in_progress', 'completed', 'no_answer', 'failed', 'missed')),
  lead_id              UUID REFERENCES public.outreach_leads(id) ON DELETE SET NULL,
  answered_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  answered_by_type     TEXT CHECK (answered_by_type IN ('human', 'ai')),
  duration_seconds     INTEGER,
  recording_url        TEXT,
  session_id           TEXT,
  outcome              TEXT,
  notes                TEXT,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at          TIMESTAMPTZ,
  ended_at             TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_calls_started_at ON public.outreach_calls (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_calls_session_id ON public.outreach_calls (session_id);
CREATE INDEX IF NOT EXISTS idx_outreach_calls_lead_id ON public.outreach_calls (lead_id);

-- ── 3. CALL EVENTS (granular log per call) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_call_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id     UUID NOT NULL REFERENCES public.outreach_calls(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_call_events_call_id ON public.outreach_call_events (call_id);

-- ── 4. Allow 'voice' in outreach_logs.module (was missing from the original list) ──
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
  CHECK (module IN ('lead_finder', 'email_campaign', 'whatsapp', 'ai_takeover', 'followups', 'calling', 'compliance', 'autopilot', 'proforma', 'voice'));

-- ── 5. TRIGGER FOR updated_at ────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_agent_presence_updated_at ON public.agent_presence;
CREATE TRIGGER update_agent_presence_updated_at
  BEFORE UPDATE ON public.agent_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6. ROW LEVEL SECURITY (SERVICE ROLE ONLY) ────────────────────────────
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_call_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'agent_presence',
    'outreach_calls',
    'outreach_call_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages %I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Service role manages %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ── 7. REALTIME — ring-group signaling & presence need live updates ─────
-- Lets the console subscribe to INSERT/UPDATE on these tables via
-- Supabase Realtime instead of polling, for instant "incoming call" and
-- "who's online" updates across every open console tab.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'outreach_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_calls;
  END IF;
END $$;
