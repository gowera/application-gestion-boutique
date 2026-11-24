DO $$ DECLARE staff text := 'public.has_any_role(auth.uid(), ARRAY[''admin'',''manager'',''caissier'',''vendeur'',''comptable'',''technicien'',''livreur'']::public.app_role[])'; t text; BEGIN
FOREACH t IN ARRAY ARRAY['products','categories','customers','suppliers','product_images','product_suppliers'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_auth_manage', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (shop_id = public.current_shop_id() AND %s) WITH CHECK (shop_id = public.current_shop_id() AND %s)', t||'_staff_manage', t, staff, staff);
END LOOP;
DROP POLICY IF EXISTS notifications_all_auth ON public.notifications;
EXECUTE format('CREATE POLICY notifications_staff ON public.notifications FOR ALL TO authenticated USING (shop_id = public.current_shop_id() AND %s) WITH CHECK (shop_id = public.current_shop_id() AND %s)', staff, staff);
DROP POLICY IF EXISTS documents_settings_read ON public.documents_settings;
EXECUTE format('CREATE POLICY documents_settings_staff_read ON public.documents_settings FOR SELECT TO authenticated USING (shop_id = public.current_shop_id() AND %s)', staff);
DROP POLICY IF EXISTS team_auth_read ON public.team_members;
EXECUTE format('CREATE POLICY team_staff_read ON public.team_members FOR SELECT TO authenticated USING (shop_id = public.current_shop_id() AND %s)', staff);
DROP POLICY IF EXISTS settings_read_all ON public.settings;
EXECUTE format('CREATE POLICY settings_staff_read ON public.settings FOR SELECT TO authenticated USING (%s)', staff);
END $$;

DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_shop_read ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.shop_memberships m WHERE m.user_id = profiles.id AND m.shop_id = public.current_shop_id()));

DROP POLICY IF EXISTS quotes_anyone_create ON public.quote_requests;

DROP POLICY IF EXISTS "Staff can delete reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Staff can manage reviews" ON public.product_reviews;
CREATE POLICY "Managers can delete reviews" ON public.product_reviews FOR DELETE TO authenticated
USING (shop_id = public.current_shop_id() AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY "Managers can update reviews" ON public.product_reviews FOR UPDATE TO authenticated
USING (shop_id = public.current_shop_id() AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
WITH CHECK (shop_id = public.current_shop_id() AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
DROP POLICY IF EXISTS product_images_anon_read ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_read ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_write ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_update ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_delete ON storage.objects;
DROP POLICY IF EXISTS quote_attachments_public_upload ON storage.objects;
DROP POLICY IF EXISTS "Public can read app releases" ON storage.objects;

CREATE POLICY product_images_shop_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (select public.current_shop_id()::text));
CREATE POLICY product_images_shop_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (select public.current_shop_id()::text) AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY product_images_shop_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (select public.current_shop_id()::text) AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (select public.current_shop_id()::text) AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY product_images_shop_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (select public.current_shop_id()::text) AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY "Admins can read app releases" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'app-releases' AND public.has_role(auth.uid(), 'admin'::public.app_role));