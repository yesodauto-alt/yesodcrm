ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS conversation_summary text,
  ADD COLUMN IF NOT EXISTS conversation_summary_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversation_next_action text,
  ADD COLUMN IF NOT EXISTS conversation_notes text,
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS interesse text,
  ADD COLUMN IF NOT EXISTS objetivo text;