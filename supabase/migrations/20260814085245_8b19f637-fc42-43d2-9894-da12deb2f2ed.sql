CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Domicile',
  city text,
  address text NOT NULL,
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own addresses"
ON public.customer_addresses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_customer_addresses_upd
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_addresses_user ON public.customer_addresses(user_id);

-- Rattache automatiquement les commandes passées sans compte (email / téléphone)
CREATE OR REPLACE FUNCTION public.claim_my_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _phone text;
  _n integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT phone INTO _phone FROM public.profiles WHERE id = _uid;

  UPDATE public.online_orders o
     SET user_id = _uid
   WHERE o.user_id IS NULL
     AND (
       (_email IS NOT NULL AND lower(o.customer_email) = lower(_email))
       OR (_phone IS NOT NULL AND _phone <> '' AND regexp_replace(o.customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g'))
     );
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

-- Rattache une commande précise à partir de son numéro (+ email ou téléphone correspondant)
CREATE OR REPLACE FUNCTION public.claim_order_by_code(_code text, _contact text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _phone text;
  _o RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT phone INTO _phone FROM public.profiles WHERE id = _uid;

  SELECT * INTO _o FROM public.online_orders WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF _o IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _o.user_id = _uid THEN RETURN jsonb_build_object('ok', true, 'code', _o.code, 'already', true); END IF;
  IF _o.user_id IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_linked'); END IF;

  IF NOT (
    (_email IS NOT NULL AND lower(_o.customer_email) = lower(_email))
    OR (_phone IS NOT NULL AND _phone <> '' AND regexp_replace(_o.customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g'))
    OR (_contact IS NOT NULL AND (
          lower(_o.customer_email) = lower(trim(_contact))
          OR regexp_replace(_o.customer_phone,'\D','','g') = regexp_replace(_contact,'\D','','g')
       ))
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mismatch');
  END IF;

  UPDATE public.online_orders SET user_id = _uid WHERE id = _o.id;
  RETURN jsonb_build_object('ok', true, 'code', _o.code);
END; $$;