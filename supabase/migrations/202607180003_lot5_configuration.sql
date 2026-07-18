ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS legal_mentions TEXT,
  ADD COLUMN IF NOT EXISTS document_theme_color TEXT DEFAULT '#0b1e3f',
  ADD COLUMN IF NOT EXISTS map_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS map_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS services_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trash_retention_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS payment_gateways JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
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

CREATE OR REPLACE FUNCTION public.list_trash_items()
RETURNS TABLE(id UUID, table_name TEXT, entity_name TEXT, deleted_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id::UUID, 'products'::TEXT, p.name::TEXT, p.deleted_at
  FROM public.products p WHERE p.deleted_at IS NOT NULL
  UNION ALL
  SELECT c.id::UUID, 'customers'::TEXT, c.name::TEXT, c.deleted_at
  FROM public.customers c WHERE c.deleted_at IS NOT NULL
  UNION ALL
  SELECT e.id::UUID, 'employees'::TEXT, e.full_name::TEXT, e.deleted_at
  FROM public.employees e WHERE e.deleted_at IS NOT NULL
  UNION ALL
  SELECT s.id::UUID, 'suppliers'::TEXT, s.name::TEXT, s.deleted_at
  FROM public.suppliers s WHERE s.deleted_at IS NOT NULL
  UNION ALL
  SELECT cat.id::UUID, 'categories'::TEXT, cat.name::TEXT, cat.deleted_at
  FROM public.categories cat WHERE cat.deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.restore_trash_item(_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.products SET deleted_at = NULL WHERE id = _id;
  UPDATE public.customers SET deleted_at = NULL WHERE id = _id;
  UPDATE public.employees SET deleted_at = NULL WHERE id = _id;
  UPDATE public.suppliers SET deleted_at = NULL WHERE id = _id;
  UPDATE public.categories SET deleted_at = NULL WHERE id = _id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.purge_trash_item(_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.products WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.customers WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.employees WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.suppliers WHERE id = _id AND deleted_at IS NOT NULL;
  DELETE FROM public.categories WHERE id = _id AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
