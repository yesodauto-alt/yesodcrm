-- 1. Remove always-true INSERT policies
DROP POLICY IF EXISTS conv_insert2 ON public.conversations;
CREATE POLICY conv_insert2 ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS msg_insert2 ON public.messages;
CREATE POLICY msg_insert2 ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- also scope the other public-role policies to authenticated
DROP POLICY IF EXISTS conv_read2 ON public.conversations;
CREATE POLICY conv_read2 ON public.conversations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS conv_update2 ON public.conversations;
CREATE POLICY conv_update2 ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS conv_delete2 ON public.conversations;
CREATE POLICY conv_delete2 ON public.conversations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS msg_read2 ON public.messages;
CREATE POLICY msg_read2 ON public.messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS msg_update2 ON public.messages;
CREATE POLICY msg_update2 ON public.messages FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS msg_delete2 ON public.messages;
CREATE POLICY msg_delete2 ON public.messages FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 2. Profiles: restrict broad read
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_or_above(auth.uid()));

-- 3. SECURITY DEFINER function execute grants
-- trigger functions: no direct callers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_ai_assistant_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_channel_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_lead_field_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_lead_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_lead_temperatura_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

-- helper functions used by RLS: authenticated only, never anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin_or_above(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
REVOKE ALL ON FUNCTION public.current_unidade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_unidade() TO authenticated;
REVOKE ALL ON FUNCTION public.can_view_kb(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_kb(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.can_edit_kb_docs(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_kb_docs(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_current_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role(uuid) TO authenticated;

-- 4. Storage: explicit deny-by-default coverage for the private export bucket
--    (knowledge-docs already has scoped policies; no policy grants access to database_export_26_07_26)
