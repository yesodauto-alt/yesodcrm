-- user_roles: own role + admins only
DROP POLICY IF EXISTS user_roles_read_all ON public.user_roles;
CREATE POLICY user_roles_read_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above(auth.uid()));

-- ai_assistants: scope reads to admins or the assistant's team members
DROP POLICY IF EXISTS ai_assistants_select ON public.ai_assistants;
CREATE POLICY ai_assistants_select ON public.ai_assistants
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_above(auth.uid())
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = ai_assistants.team_id
          AND tm.user_id = auth.uid()
          AND COALESCE(tm.active, true)
      )
    )
  );
