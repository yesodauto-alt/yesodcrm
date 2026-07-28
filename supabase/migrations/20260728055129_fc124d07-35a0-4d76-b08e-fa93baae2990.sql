CREATE POLICY tasks_owner_all ON public.tasks
FOR ALL
TO authenticated
USING (created_by = auth.uid() OR responsavel_id = auth.uid())
WITH CHECK (created_by = auth.uid() OR responsavel_id = auth.uid());