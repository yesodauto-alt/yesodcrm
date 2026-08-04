
DROP POLICY IF EXISTS tasks_por_unidade ON public.tasks;
CREATE POLICY tasks_por_unidade ON public.tasks
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'agente'::app_role]))
    AND equipe = public.current_unidade()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'agente'::app_role]))
    AND equipe = public.current_unidade()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS tasks_super_admin ON public.tasks;
CREATE POLICY tasks_super_admin ON public.tasks
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS tpl_read ON public.templates;
CREATE POLICY tpl_read ON public.templates
  FOR SELECT TO authenticated
  USING (true);
