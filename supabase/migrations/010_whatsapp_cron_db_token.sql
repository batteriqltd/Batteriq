-- 010: per-minute WhatsApp queue timer with a database-generated token.
-- The token is created here (random, never typed or committed), stored in a
-- service-role-only table, sent by pg_cron, and read by the website with the
-- service role. Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.whatsapp_cron_auth (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token      TEXT NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.whatsapp_cron_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_cron_auth FROM anon, authenticated;
INSERT INTO public.whatsapp_cron_auth (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN PERFORM cron.unschedule('batteriq-whatsapp-cold-tick'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'batteriq-whatsapp-cold-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://batteriq.com/api/cron/whatsapp-cold',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT token FROM public.whatsapp_cron_auth WHERE id = 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

-- Check: both should be true
SELECT
  EXISTS (SELECT 1 FROM public.whatsapp_cron_auth WHERE length(token) = 64) AS token_ready,
  EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'batteriq-whatsapp-cold-tick') AS timer_scheduled;
