CREATE POLICY "kb files select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND public.can_view_kb(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "kb files insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-docs'
  AND public.can_edit_kb_docs(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "kb files update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND public.can_edit_kb_docs(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'knowledge-docs'
  AND public.can_edit_kb_docs(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "kb files delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND public.can_edit_kb_docs(((storage.foldername(name))[1])::uuid)
);