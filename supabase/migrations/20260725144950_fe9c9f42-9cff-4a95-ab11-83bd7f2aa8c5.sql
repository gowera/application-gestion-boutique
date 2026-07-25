
CREATE POLICY "quote_attachments_public_upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'quote-attachments');
CREATE POLICY "quote_attachments_admin_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'quote-attachments' AND public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
