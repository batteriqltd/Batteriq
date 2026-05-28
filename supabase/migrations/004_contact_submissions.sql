-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  inquiry_type TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at
  ON contact_submissions (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
  ON contact_submissions (status);

-- RLS: only service role can access
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON contact_submissions
  FOR ALL USING (auth.role() = 'service_role');
