
CREATE TABLE IF NOT EXISTS public.payment_credentials (
  provider TEXT PRIMARY KEY,
  merchant_id TEXT,
  merchant_key TEXT,
  sandbox BOOLEAN NOT NULL DEFAULT true,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_credentials TO authenticated;
GRANT ALL ON public.payment_credentials TO service_role;

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_credentials_admin_read" ON public.payment_credentials;
CREATE POLICY "payment_credentials_admin_read" ON public.payment_credentials
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

DROP POLICY IF EXISTS "payment_credentials_admin_write" ON public.payment_credentials;
CREATE POLICY "payment_credentials_admin_write" ON public.payment_credentials
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

ALTER TABLE public.online_orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

CREATE INDEX IF NOT EXISTS online_orders_payment_ref_idx ON public.online_orders(payment_ref);
