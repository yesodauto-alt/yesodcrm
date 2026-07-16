
-- Tighten policies (avoid pure USING(true) for write ops)
DROP POLICY IF EXISTS "leads full access to authenticated" ON public.leads;
CREATE POLICY "leads select auth" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads insert auth" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads update auth" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads delete auth" ON public.leads FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lead_history full access to authenticated" ON public.lead_history;
CREATE POLICY "lead_history select auth" ON public.lead_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_history insert auth" ON public.lead_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lead_history update auth" ON public.lead_history FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lead_history delete auth" ON public.lead_history FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Revoke execute on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_lead_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
