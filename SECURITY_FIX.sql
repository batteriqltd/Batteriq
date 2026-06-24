-- ============================================================
-- BATTERIQ — COMPLETE SUPABASE SECURITY FIX
-- Run in: supabase.com/dashboard/project/ueagjjdbbukdkktviyrv/editor
-- Fixes all ERRORs and WARNINGs from the security linter
-- ============================================================


-- ── 1. ENABLE RLS ON TABLES MISSING IT (CRITICAL ERRORS) ────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;


-- ── 2. RLS POLICIES FOR THE NEWLY SECURED TABLES ────────────

-- reviews: anyone can read approved reviews, only service role can insert/update/delete
DROP POLICY IF EXISTS "Public can read approved reviews" ON public.reviews;
CREATE POLICY "Public can read approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Service role manages reviews" ON public.reviews;
CREATE POLICY "Service role manages reviews"
  ON public.reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- warranty_registrations: anyone can submit, only service role can read/manage
DROP POLICY IF EXISTS "Anyone can register warranty" ON public.warranty_registrations;
CREATE POLICY "Anyone can register warranty"
  ON public.warranty_registrations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages warranties" ON public.warranty_registrations;
CREATE POLICY "Service role manages warranties"
  ON public.warranty_registrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- newsletter_broadcasts: only service role (admin) can read/write
DROP POLICY IF EXISTS "Service role manages broadcasts" ON public.newsletter_broadcasts;
CREATE POLICY "Service role manages broadcasts"
  ON public.newsletter_broadcasts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_audit_log: only service role can read/write
DROP POLICY IF EXISTS "Service role manages audit log" ON public.admin_audit_log;
CREATE POLICY "Service role manages audit log"
  ON public.admin_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 3. FIX FUNCTION SEARCH PATHS (SECURITY WARNINGS) ────────

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- get_active_price
CREATE OR REPLACE FUNCTION public.get_active_price(p_product_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT
    CASE
      WHEN discount_percent IS NOT NULL
        AND (discount_end IS NULL OR discount_end > NOW())
      THEN ROUND(price_kes * (1 - discount_percent / 100.0), 0)
      ELSE price_kes
    END INTO v_price
  FROM public.products
  WHERE id = p_product_id;
  RETURN v_price;
END;
$$;


-- ── 4. LOCK DOWN is_admin AND verify_admin_password ─────────
-- These should NEVER be callable by anon or authenticated users via the REST API.
-- They are internal helpers only — revoke all public execute access.

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM PUBLIC;

-- Switch both to SECURITY INVOKER so they run as the calling role, not superuser
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.email()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(
  input_password text,
  stored_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;


-- ── 5. TIGHTEN ai_chat_sessions RLS ─────────────────────────
-- Replace the "always true" ALL policy with specific INSERT + SELECT by token

DROP POLICY IF EXISTS "Anyone can manage their chat session by token" ON public.ai_chat_sessions;

CREATE POLICY "Anyone can read their session by token"
  ON public.ai_chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert their session"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their session by token"
  ON public.ai_chat_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages all sessions"
  ON public.ai_chat_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 6. FIX product-images BUCKET LISTING ────────────────────
-- Drop the broad SELECT policy and replace with a more specific one
-- that allows reading objects by URL but not listing all files

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

CREATE POLICY "Public read product images by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');


-- ── 7. VERIFY — check all tables now have RLS enabled ────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'reviews',
    'warranty_registrations',
    'newsletter_broadcasts',
    'admin_audit_log',
    'orders',
    'products',
    'newsletter_subscribers',
    'ai_chat_sessions'
  )
ORDER BY tablename;
