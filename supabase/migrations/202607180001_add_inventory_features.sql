-- Products enhancements
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS show_stock_public BOOLEAN NOT NULL DEFAULT false;

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

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entity_type TEXT,
  entity_id UUID
);

-- Storage bucket for product images if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Helper function to generate slug from name
CREATE OR REPLACE FUNCTION public.slugify(text) RETURNS text AS $$
  SELECT lower(regexp_replace(regexp_replace($1, '[^a-zA-Z0-9\-]+', '-', 'g'), '(^-|-$)', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- Trigger to auto-fill slug on insert/update
CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug
BEFORE INSERT OR UPDATE OF name, slug ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_product_slug();

-- Trigger to create low-stock notifications
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stock IS DISTINCT FROM OLD.stock THEN
    IF NEW.stock <= COALESCE(NEW.low_stock_threshold, 5) THEN
      INSERT INTO public.notifications(title, message, type, entity_type, entity_id)
      VALUES (
        'Rupture ou stock faible',
        CONCAT(NEW.name, ' est à ', NEW.stock, ' unité(s).'),
        'warning',
        'product',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.products;
CREATE TRIGGER trg_notify_low_stock
AFTER UPDATE OF stock, low_stock_threshold ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_stock();
