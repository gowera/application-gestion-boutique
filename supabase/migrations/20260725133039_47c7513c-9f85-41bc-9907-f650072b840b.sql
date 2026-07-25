ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS show_stock_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_suppliers TO authenticated;
GRANT SELECT ON public.product_suppliers TO anon;
GRANT ALL ON public.product_suppliers TO service_role;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_suppliers_read" ON public.product_suppliers;
CREATE POLICY "product_suppliers_read" ON public.product_suppliers FOR SELECT USING (true);
DROP POLICY IF EXISTS "product_suppliers_write" ON public.product_suppliers;
CREATE POLICY "product_suppliers_write" ON public.product_suppliers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_all_auth" ON public.notifications;
CREATE POLICY "notifications_all_auth" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.slugify(text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(regexp_replace(regexp_replace($1, '[^a-zA-Z0-9\-]+', '-', 'g'), '(^-|-$)', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_product_slug();

CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stock IS DISTINCT FROM OLD.stock THEN
    IF NEW.stock <= COALESCE(NEW.low_stock_threshold, 5) THEN
      INSERT INTO public.notifications(title, message, type, entity_type, entity_id)
      VALUES ('Rupture ou stock faible',
        CONCAT(NEW.name, ' est à ', NEW.stock, ' unité(s).'),
        'warning', 'product', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.products;
CREATE TRIGGER trg_notify_low_stock
AFTER UPDATE OF stock, low_stock_threshold ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_terminated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS period_month TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.invalidate_salary_confirmation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND COALESCE(OLD.confirmation_token, '') IS DISTINCT FROM COALESCE(NEW.confirmation_token, '') THEN
    NEW.confirmation_token := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_invalidate_salary_confirmation ON public.salary_payments;
CREATE TRIGGER trg_invalidate_salary_confirmation
BEFORE UPDATE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.invalidate_salary_confirmation();

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS legal_mentions TEXT,
  ADD COLUMN IF NOT EXISTS document_theme_color TEXT DEFAULT '#0b1e3f',
  ADD COLUMN IF NOT EXISTS map_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS map_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS services_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trash_retention_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS payment_gateways JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.documents_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  logo_url TEXT,
  signature_url TEXT,
  accent_color TEXT DEFAULT '#0b1e3f',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents_settings TO authenticated;
GRANT ALL ON public.documents_settings TO service_role;
ALTER TABLE public.documents_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_settings_read" ON public.documents_settings;
CREATE POLICY "documents_settings_read" ON public.documents_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "documents_settings_write" ON public.documents_settings;
CREATE POLICY "documents_settings_write" ON public.documents_settings FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitations_read" ON public.invitations;
CREATE POLICY "invitations_read" ON public.invitations FOR SELECT USING (true);
DROP POLICY IF EXISTS "invitations_write" ON public.invitations;
CREATE POLICY "invitations_write" ON public.invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.list_trash_items()
RETURNS TABLE(id UUID, table_name TEXT, entity_name TEXT, deleted_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, 'products'::TEXT, p.name, p.deleted_at FROM public.products p WHERE p.deleted_at IS NOT NULL
    UNION ALL
    SELECT c.id, 'customers'::TEXT, c.name, c.deleted_at FROM public.customers c WHERE c.deleted_at IS NOT NULL
    UNION ALL
    SELECT e.id, 'employees'::TEXT, e.full_name, e.deleted_at FROM public.employees e WHERE e.deleted_at IS NOT NULL
    UNION ALL
    SELECT s.id, 'suppliers'::TEXT, s.name, s.deleted_at FROM public.suppliers s WHERE s.deleted_at IS NOT NULL
    UNION ALL
    SELECT cat.id, 'categories'::TEXT, cat.name, cat.deleted_at FROM public.categories cat WHERE cat.deleted_at IS NOT NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_trash_item(_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products SET deleted_at = NULL WHERE id = _id;
  UPDATE public.customers SET deleted_at = NULL WHERE id = _id;
  UPDATE public.employees SET deleted_at = NULL WHERE id = _id;
  UPDATE public.suppliers SET deleted_at = NULL WHERE id = _id;
  UPDATE public.categories SET deleted_at = NULL WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.purge_trash_item(_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.products WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.customers WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.employees WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.suppliers WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.categories WHERE id = _id AND deleted_at IS NOT NULL;
END; $$;

DROP POLICY IF EXISTS "product_images_auth_read" ON storage.objects;
CREATE POLICY "product_images_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_anon_read" ON storage.objects;
CREATE POLICY "product_images_anon_read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_auth_write" ON storage.objects;
CREATE POLICY "product_images_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_auth_update" ON storage.objects;
CREATE POLICY "product_images_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_auth_delete" ON storage.objects;
CREATE POLICY "product_images_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');