CREATE TABLE IF NOT EXISTS public.evolution_contact_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  canonical_phone text NOT NULL,
  phone_jid text,
  lid_jid text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, canonical_phone)
);

CREATE INDEX IF NOT EXISTS evolution_contact_identity_lid_idx
  ON public.evolution_contact_identity (channel_id, lid_jid);
CREATE INDEX IF NOT EXISTS evolution_contact_identity_phone_jid_idx
  ON public.evolution_contact_identity (channel_id, phone_jid);

ALTER TABLE public.evolution_contact_identity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evolution_identity_admin_access
  ON public.evolution_contact_identity;
CREATE POLICY evolution_identity_admin_access
  ON public.evolution_contact_identity
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.evolution_contact_identity TO authenticated;
GRANT ALL ON public.evolution_contact_identity TO service_role;
