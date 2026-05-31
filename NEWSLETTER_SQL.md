-- Run this in Supabase SQL Editor
-- Go to: supabase.com → project ueagjjdbbukdkktviyrv → SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  intro_text TEXT,
  product_ids UUID[],
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Also make sure newsletter_subscribers has a status column
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS name TEXT;
