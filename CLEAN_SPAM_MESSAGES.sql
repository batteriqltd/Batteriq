-- ============================================================
-- BATTERIQ — purge spam-bot contact submissions
-- Run in Supabase SQL Editor.
-- Spam pattern: letters inside the phone number, or random
-- mixed-case gibberish names like "RGPZRSKyrvQtcrsBBwEI".
-- ============================================================

-- 1) PREVIEW what will be deleted — run this first and eyeball it
SELECT id, first_name, last_name, email, phone, left(message, 60) AS message_preview, submitted_at
FROM contact_submissions
WHERE phone ~ '[A-Za-z]'
   OR first_name ~ '^.[^ ]*[A-Z][^ ]*[A-Z][^ ]*[A-Z]'
   OR last_name  ~ '^.[^ ]*[A-Z][^ ]*[A-Z][^ ]*[A-Z]'
ORDER BY submitted_at DESC;

-- 2) DELETE them (same conditions)
DELETE FROM contact_submissions
WHERE phone ~ '[A-Za-z]'
   OR first_name ~ '^.[^ ]*[A-Z][^ ]*[A-Z][^ ]*[A-Z]'
   OR last_name  ~ '^.[^ ]*[A-Z][^ ]*[A-Z][^ ]*[A-Z]';

-- 3) What remains
SELECT count(*) AS remaining_messages FROM contact_submissions;
