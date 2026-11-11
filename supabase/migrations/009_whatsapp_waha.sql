-- ════════════════════════════════════════════════════════════════════════════
-- 009 — WhatsApp via self-hosted WAHA (Outreach Supabase project)
--   1. provider / chat-id columns on existing WhatsApp tables
--   2. cold-campaign settings + per-lead attempt tracking
--   3. whatsapp_session_state (last status / webhook heartbeat)
--   4. whatsapp_send_slots + claim_whatsapp_send_slot()  — DB-backed rate limiter
--   5. pg_cron job: hit /api/cron/whatsapp-cold every minute
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Provider + chat id ───────────────────────────────────────────────────
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'meta';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outreach_messages_provider_check') THEN
    ALTER TABLE public.outreach_messages
      ADD CONSTRAINT outreach_messages_provider_check CHECK (provider IN ('meta', 'waha'));
  END IF;
END $$;

ALTER TABLE public.outreach_conversations
  ADD COLUMN IF NOT EXISTS wa_chat_id TEXT;
CREATE INDEX IF NOT EXISTS idx_outreach_conversations_wa_chat_id
  ON public.outreach_conversations (wa_chat_id);

-- ── 2. Cold campaign settings + lead tracking ───────────────────────────────
ALTER TABLE public.outreach_settings
  ADD COLUMN IF NOT EXISTS waha_cold_enabled      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waha_cold_message      TEXT,
  ADD COLUMN IF NOT EXISTS waha_cold_daily_cap    INTEGER NOT NULL DEFAULT 150
    CHECK (waha_cold_daily_cap BETWEEN 1 AND 1000),
  ADD COLUMN IF NOT EXISTS waha_cold_start_hour   INTEGER NOT NULL DEFAULT 8
    CHECK (waha_cold_start_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS waha_cold_end_hour     INTEGER NOT NULL DEFAULT 18
    CHECK (waha_cold_end_hour BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS waha_cold_paused_until TIMESTAMPTZ;

ALTER TABLE public.outreach_leads
  ADD COLUMN IF NOT EXISTS whatsapp_cold_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_cold_result       TEXT;
CREATE INDEX IF NOT EXISTS idx_outreach_leads_wa_cold_pending
  ON public.outreach_leads (created_at)
  WHERE whatsapp_cold_attempted_at IS NULL AND phone_e164 IS NOT NULL;

-- ── 3. Session state ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_session_state (
  id            TEXT PRIMARY KEY,
  status        TEXT,
  me_id         TEXT,
  last_event_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Rate limiter ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_send_slots (
  bucket        TEXT PRIMARY KEY,
  last_sent_at  TIMESTAMPTZ,
  day           DATE,
  day_count     INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.claim_whatsapp_send_slot(
  p_bucket TEXT,
  p_min_gap_seconds INTEGER,
  p_daily_cap INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       public.whatsapp_send_slots%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'Africa/Nairobi')::DATE;
  v_count INTEGER;
  v_wait  INTEGER;
BEGIN
  INSERT INTO public.whatsapp_send_slots (bucket) VALUES (p_bucket)
  ON CONFLICT (bucket) DO NOTHING;

  SELECT * INTO r FROM public.whatsapp_send_slots WHERE bucket = p_bucket FOR UPDATE;

  IF r.last_sent_at IS NOT NULL
     AND NOW() - r.last_sent_at < make_interval(secs => p_min_gap_seconds) THEN
    v_wait := CEIL(p_min_gap_seconds - EXTRACT(EPOCH FROM (NOW() - r.last_sent_at)));
    RETURN jsonb_build_object('allowed', false, 'reason', 'min_gap', 'retry_after_seconds', GREATEST(v_wait, 1));
  END IF;

  v_count := CASE WHEN r.day = v_today THEN r.day_count ELSE 0 END;
  IF v_count >= p_daily_cap THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_cap', 'day_count', v_count);
  END IF;

  UPDATE public.whatsapp_send_slots
     SET last_sent_at = NOW(), day = v_today, day_count = v_count + 1
   WHERE bucket = p_bucket;

  RETURN jsonb_build_object('allowed', true, 'day_count', v_count + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_send_slot(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_send_slot(TEXT, INTEGER, INTEGER) TO service_role;

-- Service role only (same pattern as other outreach tables)
ALTER TABLE public.whatsapp_session_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_send_slots ENABLE ROW LEVEL SECURITY;

-- ── 5. Every-minute queue tick (Vercel Hobby crons are daily-only) ──────────
-- Requires the secret to be stored once in Vault (NOT committed):
--   SELECT vault.create_secret('<WHATSAPP_QUEUE_SECRET value>', 'whatsapp_queue_secret');
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'batteriq-whatsapp-cold-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://batteriq.com/api/cron/whatsapp-cold',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'whatsapp_queue_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
