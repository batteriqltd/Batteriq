-- ============================================================
-- BATTERIQ ADMIN LOGIN FIX
-- Run in Supabase SQL Editor
-- supabase.com/dashboard/project/ueagjjdbbukdkktviyrv/editor
-- ============================================================

-- Step 1: Restore verify_admin_password as SECURITY DEFINER
-- (required so it can call pgcrypto crypt() function properly)
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  input_password text,
  stored_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Step 2: Make sure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Reset the password with the correct hash
UPDATE public.admin_users
SET password_hash = crypt('Bq@9#mK2$vX7!nL4', gen_salt('bf', 12))
WHERE email = 'info@batteriq.com';

-- Step 4: Verify the password works correctly RIGHT NOW
-- This should return TRUE
SELECT verify_admin_password(
  'Bq@9#mK2$vX7!nL4',
  (SELECT password_hash FROM public.admin_users WHERE email = 'info@batteriq.com')
) AS password_is_correct;

-- Step 5: Confirm the row exists
SELECT email, role, 
  length(password_hash) as hash_length,
  left(password_hash, 7) as hash_prefix
FROM public.admin_users 
WHERE email = 'info@batteriq.com';
